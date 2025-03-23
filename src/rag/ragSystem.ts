import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { formatDocumentsAsString } from 'langchain/util/document';
import { PromptTemplate } from '@langchain/core/prompts';
import { Ollama } from '@langchain/ollama';
import { OllamaEmbeddings } from '@langchain/ollama';

// Initialize the Ollama model
const MODEL_NAME = 'mistral';

// Helper function to extract the server URL from the OpenAPI spec
function getServerUrl(openApiSpec: any): string {
    if (openApiSpec.servers && openApiSpec.servers.length > 0) {
        return openApiSpec.servers[0].url;
    }
    return '';
}

// Helper function to create a more concise representation of an endpoint
function simplifyEndpoint(path: string, method: string, operation: any): any {
    return {
        path,
        method,
        summary: operation.summary || '',
        description: operation.description || '',
        operationId: operation.operationId || '',
        parameters: (operation.parameters || []).map((p: any) => ({
            name: p.name,
            in: p.in,
            required: p.required || false,
            schema: p.schema ? { type: p.schema.type } : undefined
        })),
        responses: Object.keys(operation.responses || {}).reduce((acc: any, code: string) => {
            const response = operation.responses[code];
            acc[code] = {
                description: response.description || '',
                content: response.content ? Object.keys(response.content) : []
            };
            return acc;
        }, {})
    };
}

// Helper function to simplify schema objects
function simplifySchema(schema: any): any {
    if (!schema) return {};

    // Basic properties to keep
    const simplified: any = {
        type: schema.type,
        properties: {},
        required: schema.required || []
    };

    // Simplify properties if they exist
    if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
            simplified.properties[propName] = {
                type: (propSchema as any).type,
                format: (propSchema as any).format,
                enum: (propSchema as any).enum,
                items: (propSchema as any).items ? { type: (propSchema as any).items.type } : undefined
            };
        }
    }

    return simplified;
}

// New function to extract all valid endpoints from the OpenAPI spec
function extractValidEndpoints(openApiSpec: any): any[] {
    const endpoints: any[] = [];

    for (const [path, pathObj] of Object.entries(openApiSpec.paths)) {
        for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
            if ((pathObj as any)[method]) {
                const operation = (pathObj as any)[method];
                endpoints.push({
                    path,
                    method,
                    operation,
                    summary: operation.summary || '',
                    description: operation.description || '',
                    operationId: operation.operationId || '',
                    tags: operation.tags || []
                });
            }
        }
    }

    return endpoints;
}

export async function setupRagSystem(openApiSpec: any) {
    // Extract the server URL for use in the prompt
    const serverUrl = getServerUrl(openApiSpec);

    // Extract all valid endpoints
    const validEndpoints = extractValidEndpoints(openApiSpec);

    // Create embeddings using Ollama
    const embeddings = new OllamaEmbeddings({
        model: MODEL_NAME,
        baseUrl: 'http://localhost:11434',
    });

    // Create documents from OpenAPI spec sections
    const documents: Document[] = [];

    // Add a document with basic API info
    documents.push(new Document({
        pageContent: JSON.stringify({
            title: openApiSpec.info?.title || 'API',
            version: openApiSpec.info?.version || '',
            description: openApiSpec.info?.description || '',
            serverUrl: serverUrl
        }, null, 2),
        metadata: { type: 'api_info' }
    }));

    // Add a document with all valid endpoints for reference
    documents.push(new Document({
        pageContent: JSON.stringify({
            validEndpoints: validEndpoints.map(e => `${e.method.toUpperCase()} ${e.path} - ${e.summary || e.operationId || 'No description'}`),
        }, null, 2),
        metadata: { type: 'valid_endpoints_list' }
    }));

    // Process all endpoints
    for (const endpoint of validEndpoints) {
        const simplifiedEndpoint = simplifyEndpoint(endpoint.path, endpoint.method, endpoint.operation);

        documents.push(new Document({
            pageContent: JSON.stringify(simplifiedEndpoint, null, 2),
            metadata: {
                type: 'endpoint',
                path: endpoint.path,
                method: endpoint.method,
                tags: endpoint.tags,
                operationId: endpoint.operationId || ''
            }
        }));
    }

    // Add only the most relevant schemas (limit to 10 most important ones)
    if (openApiSpec.components?.schemas) {
        const schemaEntries = Object.entries(openApiSpec.components.schemas);
        // Sort schemas by name length (shorter names are often more fundamental types)
        schemaEntries.sort((a, b) => a[0].length - b[0].length);

        // Take only the first 10 schemas
        const limitedSchemas = schemaEntries.slice(0, 10);

        for (const [schemaName, schema] of limitedSchemas) {
            const simplifiedSchema = simplifySchema(schema);
            documents.push(new Document({
                pageContent: JSON.stringify({
                    name: schemaName,
                    schema: simplifiedSchema
                }, null, 2),
                metadata: { type: 'schema', name: schemaName }
            }));
        }
    }

    console.log(`Created ${documents.length} documents from OpenAPI spec`);

    // Create vector store
    const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

    // Create the LLM
    const llm = new Ollama({
        model: MODEL_NAME,
        baseUrl: 'http://localhost:11434',
        numPredict: 4000
    });

    // Create the RAG pipeline
    const retriever = vectorStore.asRetriever({
        k: 8, // Increased to get more context
    });

    // Create a proper prompt template with more specific instructions
    const promptTemplate = PromptTemplate.fromTemplate(`
    You are an expert TypeScript developer who specializes in creating API clients.
    
    Use the following OpenAPI specification information to generate TypeScript code:
    
    {context}
    
    Server URL: ${serverUrl || 'Not specified in the OpenAPI spec'}
    
    Question: {question}
    
    IMPORTANT: Only use endpoints that are explicitly defined in the OpenAPI specification.
    Verify that the HTTP method (GET, POST, etc.) is valid for the endpoint you choose.
    For example, if you need to find pets by status, make sure to use the correct endpoint like '/pet/findByStatus' with the appropriate HTTP method.
    
    Generate complete, working TypeScript code that:
    1. Uses the fetch API to call the exact endpoint needed
    2. Includes all necessary TypeScript interfaces based on the actual API response structure
    3. Transforms the API response to match the desired output shape
    4. Is ready to use without any placeholders
    
    Do not use placeholder comments like "Define the structure here". Instead, create actual TypeScript 
    interfaces based on the OpenAPI specification.
  `);

    // Use RunnablePassthrough to properly handle the input/output types
    const ragChain = RunnableSequence.from([
        RunnablePassthrough.assign({
            context: async (input: { question: string }) => {
                try {
                    const docs = await retriever.invoke(input.question);
                    return formatDocumentsAsString(docs);
                } catch (error) {
                    console.error("Error retrieving documents:", error);
                    return "Error retrieving API documentation. Please try with a simpler query.";
                }
            }
        }),
        promptTemplate,
        llm,
        new StringOutputParser(),
    ]);

    return ragChain;
}