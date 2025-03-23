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
      - Generate a COMPLETE, WORKING TypeScript file with ALL necessary code
      - Use the native fetch API (not axios or other libraries)
      - Include a main function that makes the actual API call using fetch
      - Include the function that transforms the API response to the desired shape
      - ONLY use endpoints and HTTP methods that are explicitly defined in the OpenAPI specification
      - Verify that the HTTP method you're using is valid for the endpoint
      - Do not use any imports
      
      The code MUST include:
        - The actual API URL from the OpenAPI spec (not a placeholder)
        - A function that makes the API call (e.g., 'async function fetchData() {...}')
        - A function that transforms the response (e.g., 'function transformResponse(data) {...}')
        - All necessary type definitions
        - A usage example showing how to call the function

      The code should be specific to this API, not generic placeholders. Use the actual endpoint paths, 
      parameter names, and response structures from the OpenAPI specification.

      DO NOT just provide interfaces or type definitions. I need complete, executable code.
    `
    });

    // Format the generated code
    return formatGeneratedCode(result);
}