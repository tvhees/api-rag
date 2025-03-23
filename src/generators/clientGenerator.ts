import { parseOpenApiSpec } from '../utils/openApiParser.js';
import { setupRagSystem } from '../rag/ragSystem.js';
import { formatGeneratedCode } from '../utils/codeFormatter.js';

export async function generateClient(
    specUrl: string,
    dataDescription: string,
    outputShape: string
): Promise<string> {
    // Parse the OpenAPI spec
    const openApiSpec = await parseOpenApiSpec(specUrl);

    // Set up the RAG system
    const ragChain = await setupRagSystem(openApiSpec);

    // Generate the client code
    const result = await ragChain.invoke({
        question: `
      I need to create a TypeScript client for the API described by this OpenAPI specification: ${specUrl}
      
      I want to retrieve the following data: ${dataDescription}
      
      The data should be transformed to match this TypeScript interface:
      ${outputShape}
      
      IMPORTANT REQUIREMENTS:
      1. ONLY use endpoints and HTTP methods that are explicitly defined in the OpenAPI specification
      2. For the PetStore API, do NOT use GET /pet - this endpoint doesn't exist. Instead, use endpoints like GET /pet/findByStatus to find pets
      3. Verify that the HTTP method you're using is valid for the endpoint
      4. Use the fetch API (not axios or other libraries)
      5. Include all necessary TypeScript interfaces based on the actual API response structure
      6. Transform the API response to match the desired output shape
      7. Do not use any imports unless absolutely necessary (e.g., no need for node-fetch in browser environments)
      
      The code should be specific to this API, not generic placeholders. Use the actual endpoint paths, 
      parameter names, and response structures from the OpenAPI specification.
    `
    });

    // Format the generated code
    return formatGeneratedCode(result);
}