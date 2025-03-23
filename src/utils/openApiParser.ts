import SwaggerParser from '@apidevtools/swagger-parser';

export async function parseOpenApiSpec(specUrl: string): Promise<any> {
    try {
        // Parse and validate the OpenAPI document
        const api = await SwaggerParser.validate(specUrl);
        return api;
    } catch (error) {
        console.error('Error parsing OpenAPI spec:', error);
        throw error;
    }
}

export function extractEndpoints(api: any): any[] {
    const endpoints: any[] = [];

    // Iterate through all paths and methods in the OpenAPI spec
    for (const [path, pathItem] of Object.entries(api.paths)) {
        for (const [method, operation] of Object.entries(pathItem as object)) {
            if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                endpoints.push({
                    path,
                    method,
                    operation,
                    // Include schema information if available
                    requestBody: (operation as any).requestBody,
                    responses: (operation as any).responses,
                    parameters: (operation as any).parameters,
                });
            }
        }
    }

    return endpoints;
}

export function extractSchemas(api: any): any {
    // Extract schema definitions from the OpenAPI spec
    return api.components?.schemas || {};
}