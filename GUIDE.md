# Complete Guide: Building and Publishing an Apify Actor with Bun

This guide walks you through every step of creating, testing, and deploying an Apify Actor using Bun as the runtime.

## Prerequisites

Before you start, make sure you have:
- **Bun** installed ([installation guide](https://bun.sh))
- **Git** installed
- An **Apify account** (sign up at [apify.com](https://apify.com))
- **Node.js** (for Apify CLI, even though we use Bun for the actor)

## Step 1: Install Apify CLI

Install the Apify CLI globally:

```bash
curl -fsSL https://apify.com/install-cli.sh | bash
```

Or using npm:
```bash
npm install -g apify-cli
```

Verify installation:
```bash
apify --version
```

## Step 2: Login to Apify

Authenticate with your Apify account:

```bash
apify login
```

This will open a browser window where you can authorize the CLI.

## Step 3: Project Structure

A complete Apify Actor project needs these files:

```
apify-actor-project/
├── .actor/
│   ├── actor.json          # Actor metadata and configuration
│   └── input_schema.json   # Input schema definition
├── src/
│   └── main.ts            # Main actor code
├── tests/
│   └── main.test.ts       # Test files
├── Dockerfile             # Docker configuration for deployment
├── .dockerignore          # Files to exclude from Docker build
├── .gitignore            # Files to exclude from Git
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── bun.lock              # Bun lockfile
└── README.md            # Documentation

```

### Key Files Explained:

#### 1. `.actor/actor.json`
Defines your actor's metadata:
```json
{
  "actorSpecification": 1,
  "name": "your-actor-name",
  "title": "Your Actor Title",
  "description": "What your actor does",
  "version": "1.0.0",
  "dockerfile": "./Dockerfile",
  "readme": "./README.md",
  "input": "./input_schema.json"
}
```

#### 2. `.actor/input_schema.json`
Defines the input fields for your actor:
```json
{
  "title": "Actor Input",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    "message": {
      "title": "Message",
      "type": "string",
      "description": "Input message",
      "editor": "textfield",
      "default": "Hello World"
    }
  },
  "required": ["message"]
}
```

#### 3. `Dockerfile`
**Critical for Bun actors!** Standard Apify images don't include Bun:
```dockerfile
# Use official Bun image as base
FROM oven/bun:1 AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the project
RUN bun run build

# Set the command to run the actor
CMD ["bun", "run", "start"]
```

#### 4. `src/main.ts`
Your actor's main code:
```typescript
import { Actor } from 'apify';

await Actor.init();

try {
    const input = await Actor.getInput();
    console.log('Input:', input);

    // Your actor logic here

    await Actor.pushData({ result: 'success' });
} catch (error) {
    console.error('Error:', error);
    throw error;
} finally {
    await Actor.exit();
}
```

#### 5. `package.json`
Dependencies and scripts:
```json
{
  "name": "your-actor",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "bun run dist/main.js",
    "build": "bun build src/main.ts --outdir dist --target node",
    "test": "bun test",
    "dev": "bun run src/main.ts"
  },
  "dependencies": {
    "apify": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Step 4: Development Workflow

### Initialize Project
```bash
# Create project directory
mkdir my-apify-actor
cd my-apify-actor

# Initialize with Bun
bun init

# Install Apify SDK
bun add apify

# Install dev dependencies
bun add -d @types/node typescript
```

### Create Directory Structure
```bash
mkdir -p .actor src tests
```

### Local Development
```bash
# Run in development mode
bun run dev

# Build the project
bun run build

# Run tests
bun test
```

### Test with Apify CLI
```bash
# Run actor locally (simulates Apify environment)
apify run
```

## Step 5: Version Control

### Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit"
```

### Push to GitHub (Optional but Recommended)
```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/username/repo-name.git
git branch -M main
git push -u origin main
```

## Step 6: Deploy to Apify

### Option A: Using the Publish Script (Recommended)

This project includes a publish script that uses the Apify SDK to upload source files directly:

```bash
# Set your Apify API token
export APIFY_TOKEN=your_token_here

# Publish current directory
bun run publish:actor .

# Or publish a specific directory
bun run publish:actor ./my-actor

# With options
bun run scripts/publish.ts ./my-actor --name my-cool-actor --version 1.0 --public
```

The script will:
1. Collect all source files from the directory
2. Read actor config from `.actor/actor.json`
3. Create or update the actor on Apify
4. Trigger a build and wait for completion

**Available options:**
- `--name` - Actor name (default: from actor.json or directory name)
- `--version` - Version number (default: from actor.json or "0.1")
- `--tag` - Build tag (default: "latest")
- `--public` - Make actor public
- `--token` - Apify API token (default: APIFY_TOKEN env var)

### Option B: Using Apify CLI

```bash
apify push
```

This will:
1. Build your Docker image
2. Push it to Apify's registry
3. Create or update the actor in Apify Console

### Subsequent Deployments
```bash
# Make your changes
git add .
git commit -m "Update actor"

# Push to Apify (using script)
bun run publish:actor .

# Or using CLI
apify push
```

### Version Management
Update `version` in `.actor/actor.json` before deploying major changes:
```json
{
  "version": "1.1.0"
}
```

## Step 7: Enable Standby Mode (Optional)

For instant API responses:

1. Go to Apify Console → Your Actor → Settings
2. Scroll to "Actor Standby"
3. Enable Standby mode
4. Configure:
   - **Desired standby runs**: 1-5 (how many instances to keep ready)
   - **Max idle time**: How long to keep idle instances
   - **Timeout**: Request timeout (default 5 minutes)

### Code for Standby Mode
Your actor needs to detect and handle Standby mode:

```typescript
import http from 'http';
import { Actor } from 'apify';

await Actor.init();

if (Actor.config.get('metaOrigin') === 'STANDBY') {
    // Standby mode - run HTTP server
    const port = Actor.config.get('standbyPort');

    const server = http.createServer(async (req, res) => {
        // Handle readiness probe
        if (req.headers['x-apify-container-server-readiness-probe']) {
            res.writeHead(200);
            res.end('Ready!');
            return;
        }

        // Handle requests
        // Your logic here

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
    });

    server.listen(port);
    await new Promise(() => {}); // Keep running
} else {
    // Standard mode - run once and exit
    const input = await Actor.getInput();
    // Your logic here
    await Actor.exit();
}
```

## Step 8: Testing Your Actor

### Test Locally
```bash
# Standard mode
bun run dev

# Standby mode (simulate)
APIFY_META_ORIGIN=STANDBY APIFY_STANDBY_PORT=4321 bun run src/main.ts
```

### Test on Apify
1. Go to Apify Console
2. Open your actor
3. Click "Try it"
4. Enter test input
5. Click "Start"

### Test Standby Mode
```bash
# Get your Standby URL from the Apify Console, then:
curl "https://YOUR-STANDBY-URL/?param=value"
```

## Step 9: Publishing & Sharing

### Make Actor Public
1. Apify Console → Your Actor → Settings
2. Set visibility to "Public"
3. Add a good description and README
4. Add categories and tags

### Monetization (Optional)
1. Settings → Monetization
2. Choose pricing model:
   - **Pay per run**: Fixed price per execution
   - **Pay per event**: Price per request (best for Standby)
   - **Pay per result**: Price per result item
   - **Free**: No charge

## Troubleshooting

### "bun: not found" Error
- **Cause**: Missing Dockerfile or using wrong base image
- **Solution**: Use the Dockerfile from Step 3 with `FROM oven/bun:1`

### Actor Times Out
- **Cause**: Infinite loop or not calling `Actor.exit()`
- **Solution**: Always call `await Actor.exit()` in standard mode

### Dependencies Not Found
- **Cause**: Missing `bun.lock` or incorrect installation
- **Solution**: Run `bun install` and commit `bun.lock`

### Build Fails on Apify
- **Cause**: Missing files or incorrect Dockerfile
- **Solution**: Check `.dockerignore` and ensure all files are committed

## Best Practices

1. **Always test locally** before pushing
2. **Use TypeScript** for type safety
3. **Write tests** for critical functionality
4. **Version your actors** properly
5. **Document your actor** with a good README
6. **Handle errors gracefully** and log useful messages
7. **Use environment variables** for sensitive data
8. **Commit bun.lock** for reproducible builds
9. **Use .dockerignore** to reduce build size
10. **Enable Standby mode** for API-like use cases

## Quick Reference Commands

```bash
# Publish script (recommended)
bun run publish:actor .                    # Publish current directory
bun run publish:actor ./my-actor           # Publish specific directory
bun run publish:actor . --version 1.0      # Publish with version

# CLI commands
apify login              # Authenticate
apify push              # Deploy actor
apify run               # Run locally
apify call              # Run on Apify platform

# Bun commands
bun install             # Install dependencies
bun run dev            # Run in development
bun run build          # Build for production
bun test               # Run tests

# Git commands
git add .              # Stage changes
git commit -m "msg"    # Commit
git push               # Push to remote
```

## Example: Complete Actor Setup

```bash
# 1. Install Apify CLI
curl -fsSL https://apify.com/install-cli.sh | bash

# 2. Login
apify login

# 3. Create project
mkdir my-actor && cd my-actor
bun init -y

# 4. Install dependencies
bun add apify
bun add -d @types/node typescript

# 5. Create structure
mkdir -p .actor src tests

# 6. Create files (actor.json, input_schema.json, Dockerfile, src/main.ts)
# ... (copy from examples above)

# 7. Test locally
bun run dev

# 8. Initialize git
git init
git add .
git commit -m "Initial commit"

# 9. Deploy
apify push

# 10. Test on Apify platform
apify call
```

## Resources

- **Apify Documentation**: https://docs.apify.com
- **Apify SDK for JavaScript**: https://sdk.apify.com
- **Bun Documentation**: https://bun.sh/docs
- **Actor Templates**: https://apify.com/templates
- **Community Forum**: https://community.apify.com

---

**Pro Tip**: Start with this template repository and modify it for your needs. All the files are already configured and tested!
