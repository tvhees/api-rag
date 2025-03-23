#!/usr/bin/env node
import { Command } from 'commander';
import { generateClient } from './generators/clientGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
    .name('openapi-ts-client')
    .description('Generate TypeScript client code from OpenAPI specifications')
    .version('0.1.0');

program
    .command('generate')
    .description('Generate TypeScript client code')
    .requiredOption('-s, --spec <url>', 'URL to OpenAPI specification')
    .requiredOption('-d, --data <description>', 'Description of data to retrieve')
    .requiredOption('-o, --output <shape>', 'Desired output data shape as TypeScript interface')
    .option('-f, --file <filepath>', 'Output file path (if not provided, output to console)')
    .action(async (options) => {
        try {
            const { spec, data, output, file } = options;
            console.log('Generating client code...');
            const generatedCode = await generateClient(spec, data, output);

            if (file) {
                // Ensure the directory exists
                const dir = path.dirname(file);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // Write the generated code to the file
                fs.writeFileSync(file, generatedCode);
                console.log(`Client code written to ${file}`);
            } else {
                // Output to console if no file is specified
                console.log('\nGenerated TypeScript Client:');
                console.log(generatedCode);
            }
        } catch (error) {
            console.error('Error generating client:', error);
            process.exit(1);
        }
    });

program.parse();