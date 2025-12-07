# Actor Builder 🤖

AI-powered actor builder that uses Claude Agent SDK to create and publish Apify actors from natural language prompts.

## How It Works

1. You provide a description of the actor you want to build
2. Claude Agent SDK analyzes your requirements
3. It generates all necessary files (main.ts, actor.json, input_schema.json, Dockerfile, etc.)
4. The actor is automatically published to your Apify account

## Input

| Field | Type | Description |
|-------|------|-------------|
| `prompt` | string | Description of the actor you want to build |
| `actorName` | string | Name for the new actor (lowercase, hyphens only) |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth token for Claude Agent SDK |
| `APIFY_TOKEN` | Your Apify API token (automatically available on Apify platform) |

## Example

**Input:**
```json
{
  "prompt": "Create a web scraper that takes a URL and extracts all links from the page. Return the links as an array with their text and href.",
  "actorName": "link-extractor"
}
```

**Result:**
- A new actor called "link-extractor" is created and published to your Apify account
- The actor includes all necessary files and is ready to use

## Generated Actor Structure

The builder creates actors with:
- `src/main.ts` - Main actor code using Apify SDK
- `.actor/actor.json` - Actor metadata
- `.actor/input_schema.json` - Input schema
- `package.json` - Dependencies
- `Dockerfile` - Bun-based container
- `tsconfig.json` - TypeScript config
- `README.md` - Documentation

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Run locally
bun run dev

# Deploy to Apify
apify push
```

## Tech Stack

- TypeScript + Bun runtime
- Claude Agent SDK for AI-powered code generation
- Apify SDK for actor functionality
