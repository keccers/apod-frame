const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Configure Gemini API
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("Gemini API key not found. Set the GEMINI_API_KEY environment variable.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

const MAX_REQUESTS_PER_MINUTE = 25; // Reduced further for safety
const DELAY_MS = 60000 / MAX_REQUESTS_PER_MINUTE; // Delay between requests in milliseconds
const INITIAL_DELAY = 15000; // Increased initial delay to 15 seconds
const RETRY_DELAY = 60000; // delay of 60 seconds

let requestQueue = []; // Queue to hold requests
let isProcessing = false; // Flag to prevent multiple processQueue instances

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (requestQueue.length > 0) {
    const nextRequest = requestQueue.shift();

    try {
      await nextRequest();
    } catch (error) {
      console.error("Error processing request:", error);
      // If there's an error, requeue the request after a delay
      console.log(`Re-queueing request after ${RETRY_DELAY}ms delay...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      requestQueue.unshift(nextRequest); // Add back to the front
    }
  }

  isProcessing = false;
}

async function rateLimit(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
        console.error(`Rejecting because of ${error}`);
      }
    });

    if (!isProcessing) {
      setTimeout(processQueue, INITIAL_DELAY); // Initial delay
    }
  });
}

async function convertTypescriptToJavascript(filepath) {
    try {
        const typescriptCode = fs.readFileSync(filepath, 'utf8');

        // Gemini API prompt - NEXTJS AWARE PROMPT
        const prompt = `
            You are a highly skilled JavaScript/JSX developer. Convert the following TypeScript code to modern JavaScript (JSX) suitable for a Next.js 15 application. 
            Ensure that all Next.js specific syntax and patterns (e.g., functional components, hooks, etc.) are preserved and correctly translated.
            Remove all TypeScript-specific syntax (types, interfaces, enums, etc.). Make sure that imports and exports are correct, follow best practices, and are properly translated. 
            Pay special attention to React components and props.

            Return ONLY the converted Javascript/JSX code.

            \`\`\`typescript
            ${typescriptCode}
            \`\`\`
        `;

        // Call Gemini API - Wrap with rateLimit
        const javascriptCode = await rateLimit(async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        });

        // Save the converted code to a .jsx file
        const newFilepath = filepath.replace(/\.tsx?$/, '.jsx');
        fs.writeFileSync(newFilepath, javascriptCode);

        // Remove the original TypeScript file - uncomment this ONLY IF the write is successful
        fs.unlinkSync(filepath);

        console.log(`Successfully converted ${filepath} to ${newFilepath}`);
    } catch (error) {
        console.error(`Error converting ${filepath}: ${error}`);
    }
}

function processDirectory(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filepath = path.join(directory, file);
        const stat = fs.statSync(filepath);

        // Exclude .next and node_modules directories
        if (filepath.includes('.next') || filepath.includes('node_modules')) {
            continue;
        }

        if (stat.isDirectory()) {
            processDirectory(filepath); // Recursive call for subdirectories
        } else if (/\.tsx?$/.test(file)) { // Check for .ts or .tsx extension
            convertTypescriptToJavascript(filepath);
        }
    }
}

// Main execution
const targetDirectory = '.'; // Current directory
processDirectory(targetDirectory);
console.log("Conversion process completed.");