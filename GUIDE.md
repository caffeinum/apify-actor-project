# Complete Guide: Building and Publishing Apify Actors with Bun

A step-by-step guide to create, develop, test, and deploy Apify Actors using TypeScript, Bun, and Standby mode.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Project Setup](#project-setup)
- [Development](#development)
- [Docker Configuration](#docker-configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Standby Mode](#standby-mode)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:
- Node.js 20+ installed
- Bun installed
- Git installed
- An Apify account (free tier available)
- GitHub account (optional, for version control)

## Installation

### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

Add Bun to your PATH:
```bash
export PATH="$HOME/.bun/bin:$PATH"
```

### 2. Install Apify CLI

```bash
curl -fsSL https://apify.com/install-cli.sh | bash
```

Or with Bun:
```bash
bun add -g apify-cli
```

### 3. Login to Apify

```bash
apify login
```

This will open your browser to authenticate with Apify.

## Project Setup

### 1. Create Project Structure

```bash
mkdir my-apify-actor
cd my-apify-actor

# Initialize git
git init

# Create directory structure
mkdir -p src tests .actor
```

### 2. Create package.json

```json
{
  "name": "my-apify-actor",
  "version": "1.0.0",
  "type": "module",
  "description": "My Apify Actor with Bun",
  "main": "dist/main.js",
  "scripts": {
    "start": "bun run dist/main.js",
    "build": "bun build src/main.ts --outdir dist --target node",
    "test": "bun test",
    "dev": "bun run src/main.ts"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "apify": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 3. Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Create .gitignore

```
# Dependencies
node_modules/
.bun/

# Build output
dist/
*.js
*.js.map

# Apify storage
apify_storage/
storage/

# Environment variables
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store

# Logs
*.log
```

### 5. Install Dependencies

```bash
bun install
```

## Development

### 1. Create Actor Configuration

Create `.actor/actor.json`:

```json
{
  "actorSpecification": 1,
  "name": "my-apify-actor",
  "title": "My Apify Actor",
  "description": "My awesome Apify Actor built with TypeScript and Bun",
  "version": "1.0",
  "dockerfile": "./Dockerfile",
  "readme": "./README.md",
  "input": "./input_schema.json"
}
```

**Important**: Version must be in `MAJOR.MINOR` format (e.g., "1.0"), not semantic versioning ("1.0.0").

### 2. Create Input Schema

Create `.actor/input_schema.json`:

```json
{
  "title": "My Actor Input",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    "message": {
      "title": "Message",
      "type": "string",
      "description": "Input message to process",
      "editor": "textfield",
      "default": "Hello World!"
    }
  },
  "required": ["message"]
}
```

### 3. Create Main Actor Code

Create `src/main.ts`:

```typescript
import { Actor } from 'apify';

// Initialize the Apify Actor
await Actor.init();

try {
    // Get input from Apify platform
    const input = (await Actor.getInput()) as { message?: string } || {};
    const message = input.message || 'Hello from Apify!';

    console.log('Actor started!');
    console.log('Input message:', message);

    // Your processing logic here
    const result = {
        message: message,
        timestamp: new Date().toISOString(),
        status: 'success',
    };

    // Save results to dataset
    await Actor.pushData(result);

    console.log('Result:', result);
    console.log('Actor finished successfully!');
} catch (error) {
    console.error('Error during execution:', error);
    throw error;
} finally {
    // Exit the Actor
    await Actor.exit();
}
```

### 4. Test Locally

```bash
# Run in development mode
bun run dev

# Build the project
bun run build

# Run built version
bun run start
```

## Docker Configuration

### Create Dockerfile

Apify requires a Dockerfile to run actors. Create `Dockerfile` in your project root:

```dockerfile
# Use Apify's Node.js base image
FROM apify/actor-node:20

# Install required packages and Bun
RUN apk add --no-cache bash curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Copy package files first (for better caching)
COPY package.json ./

# Install dependencies using npm (more Docker-friendly)
RUN npm install --omit=dev

# Copy the rest of the application
COPY . ./

# Run the actor with Bun
CMD bun run src/main.ts
```

**Why npm for install, Bun for runtime?**
- npm install is more reliable in Docker (no lockfile conflicts)
- Bun runtime is faster for execution
- Best of both worlds!

## Testing

### 1. Create Tests

Create `tests/main.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';

describe('My Apify Actor', () => {
    test('basic test', () => {
        expect(true).toBe(true);
    });

    test('actor files exist', async () => {
        const fs = await import('fs');
        expect(fs.existsSync('./src/main.ts')).toBe(true);
        expect(fs.existsSync('./.actor/actor.json')).toBe(true);
    });
});
```

### 2. Run Tests

```bash
bun test
```

## Deployment

### 1. Build Locally

```bash
bun run build
```

### 2. Push to Apify

```bash
apify push
```

This command will:
1. Create or update your Actor on Apify
2. Build a Docker image with your code
3. Push the image to Apify's registry
4. Make it available in the Apify Console

### 3. Verify Deployment

Visit your Actor in the Apify Console:
```
https://console.apify.com/actors
```

### 4. Run Your Actor

In the Apify Console:
1. Click "Start" to run your Actor
2. Enter input parameters
3. View results in the Dataset tab

## Standby Mode

Standby mode allows your Actor to run as an always-on HTTP server for instant API responses.

### 1. Implement Standby Mode

Update `src/main.ts`:

```typescript
import http from 'http';
import { Actor } from 'apify';

await Actor.init();

// Check if Actor is started in Standby mode
if (Actor.config.get('metaOrigin') === 'STANDBY') {
    console.log('Actor started in STANDBY mode');

    const port = Actor.config.get('standbyPort');

    const server = http.createServer(async (req, res) => {
        // Handle readiness probe
        if (req.headers['x-apify-container-server-readiness-probe']) {
            console.log('Readiness probe received');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Ready!\n');
            return;
        }

        console.log(`Received ${req.method} request to ${req.url}`);

        try {
            // Your request handling logic
            const result = {
                message: 'Hello from Standby!',
                timestamp: new Date().toISOString(),
            };

            await Actor.pushData(result);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    });

    server.listen(port, () => {
        console.log(`Standby server listening on port ${port}`);
    });

    // Keep the Actor running
    await new Promise(() => {});
} else {
    // Standard mode logic here
    console.log('Actor started in STANDARD mode');

    const input = (await Actor.getInput()) as { message?: string } || {};
    await Actor.pushData({ message: input.message || 'Hello!' });
    await Actor.exit();
}
```

### 2. Enable Standby Mode

In the Apify Console:
1. Go to your Actor's Settings
2. Find "Actor Standby" section
3. Enable Standby mode
4. Configure settings (timeout, min instances, etc.)

### 3. Use Standby Mode

```bash
# Make requests to your Standby URL
curl "https://YOUR-STANDBY-URL/?param=value"
```

## Troubleshooting

### Common Issues

#### 1. "bun: not found" in Docker

**Problem**: Bun isn't installed in the Docker image.

**Solution**: Ensure your Dockerfile installs Bun:
```dockerfile
RUN apk add --no-cache bash curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun
```

#### 2. "Version number must be MAJOR.MINOR"

**Problem**: Using semantic versioning (1.0.0) instead of Apify format.

**Solution**: Change version in `.actor/actor.json` from "1.0.0" to "1.0"

#### 3. "lockfile had changes, but lockfile is frozen"

**Problem**: Bun's lockfile conflicts in Docker.

**Solution**: Use npm for installation in Docker:
```dockerfile
RUN npm install --omit=dev
```

#### 4. "curl: not found" in Docker

**Problem**: Base image doesn't have curl.

**Solution**: Install curl before using it:
```dockerfile
RUN apk add --no-cache bash curl unzip
```

### Debugging Tips

1. **Check Actor Logs**: View logs in Apify Console under the "Log" tab
2. **Test Locally First**: Always test with `bun run dev` before deploying
3. **Use Console Logs**: Add `console.log()` statements for debugging
4. **Check Build Logs**: Review build output in Apify Console for errors

## Best Practices

### 1. Version Control

```bash
# Initialize git if you haven't
git init

# Add remote
git remote add origin https://github.com/yourusername/your-repo.git

# Commit and push
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2. Environment Variables

Never commit secrets! Use Apify's environment variables:

1. Go to Actor Settings → Environment variables
2. Add your secrets (API keys, tokens, etc.)
3. Access them in code:
```typescript
const apiKey = process.env.MY_API_KEY;
```

### 3. Error Handling

Always wrap your code in try-catch:
```typescript
try {
    // Your code
} catch (error) {
    console.error('Error:', error);
    throw error; // This marks the Actor run as failed
}
```

### 4. Dataset Usage

```typescript
// Push single item
await Actor.pushData({ item: 'data' });

// Push multiple items
await Actor.pushData([
    { item: 'data1' },
    { item: 'data2' }
]);
```

### 5. Key-Value Store

For storing configuration or temporary data:
```typescript
// Save data
await Actor.setValue('myKey', { some: 'data' });

// Load data
const data = await Actor.getValue('myKey');
```

## Resources

- **Apify Documentation**: https://docs.apify.com/
- **Apify CLI Docs**: https://docs.apify.com/cli
- **Actor Templates**: https://apify.com/templates
- **Bun Documentation**: https://bun.sh/docs
- **Standby Mode Docs**: https://docs.apify.com/platform/actors/running/standby

## Example: Complete Workflow

Here's a complete workflow from start to finish:

```bash
# 1. Install tools
curl -fsSL https://bun.sh/install | bash
curl -fsSL https://apify.com/install-cli.sh | bash

# 2. Login
apify login

# 3. Create project
mkdir my-actor && cd my-actor
git init

# 4. Create files (package.json, tsconfig.json, etc.)
# ... copy from examples above ...

# 5. Install dependencies
bun install

# 6. Create source code
# ... create src/main.ts ...

# 7. Test locally
bun run dev

# 8. Build
bun run build

# 9. Run tests
bun test

# 10. Deploy
apify push

# 11. Commit to git
git add .
git commit -m "Initial actor implementation"
git push
```

## Conclusion

You now have everything you need to build, test, and deploy Apify Actors with Bun! The combination of TypeScript, Bun, and Apify's platform provides a powerful foundation for web scraping, automation, and data processing tasks.

**Happy coding!** 🚀

---

*Generated with Claude Code* 🤖
