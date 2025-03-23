/**
 * Formats the generated TypeScript code by extracting only the content between code block markers
 * and ensuring it's properly structured.
 */
export function formatGeneratedCode(code: string): string {
    // Extract code between markdown code block markers if present
    const codeBlockRegex = /```(?:typescript|ts)?\s*([\s\S]*?)```/;
    const match = code.match(codeBlockRegex);

    let formattedCode = '';

    if (match && match[1]) {
        // Use the code inside the code block
        formattedCode = match[1].trim();
    } else {
        // If no code blocks found, use the original text but try to clean it up
        formattedCode = code.trim();
    }

    // Add a standard header comment
    formattedCode = `// Generated TypeScript client for API\n\n${formattedCode}`;

    return formattedCode;
}