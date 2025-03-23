# OpenAPI TypeScript Client Generator - LangChain/Ollama demo

A CLI tool that generates TypeScript client code from OpenAPI v3 specifications using LangChain and Ollama.
Most of the code was written using Claude 3.7 Sonnet.

**:warning: This is for demonstration/exploration purposes only. Clients are not generated deterministically and I recommend using one of the many existing packages for generating TypeScript from OpenAPI specs :warning:**

## Overview

This tool allows you to:
- Provide a link to an OpenAPI v3 specification
- Describe the type of data you want to retrieve
- Specify the shape of data you want to transform it into
- Generate TypeScript client code that fetches and transforms the data

## Prerequisites

- Node.js (v16 or later)
- Ollama installed locally (https://ollama.ai/)

## Installation

Ensure you have mistral available in ollama
```bash
ollama pull mistral
```

Build the javascript library:
```bash
git clone https://github.com/tvhees/rag-api.git
cd rag-api
yarn install
yarn run build
```

## Usage
### Basic Usage
```bash
npm start generate -s <openapi-spec-url> -d "<data-description>" -o "<output-shape>"
```

### Save Output to File
```bash
npm start generate -s <openapi-spec-url> -d "<data-description>" -o "<output-shape>" -f <output-file-path>
```

### Example
```bash
npm start generate -s https://petstore3.swagger.io/api/v3/openapi.json -d "Get a list of available pets" -o "interface PetList { pets: Array<{ id: number; name: string; status: string }> }" -f ./output/petClient.ts
```

## Parameters
- `-s, --spec <url>`: URL to OpenAPI specification
- `-d, --data <description>`: Description of data to retrieve
- `-o, --output <shape>`: Desired output data shape as TypeScript interface
- `-f, --file <filepath>`: (Optional) Output file path