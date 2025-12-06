# Fun Text Transformer 🎨

Transform your text in fun and creative ways! A playful Apify Actor built with TypeScript and Bun, supporting both **Standard** and **Standby** modes.

## Features

- 🎭 **9 Fun Transformations**: reverse, uppercase, lowercase, leetspeak, spongebob, emojify, pirate, uwu, and **ai**
- 🤖 **AI-powered transformation** using OpenRouter via Apify's proxy
- 🚀 Built with TypeScript and Bun for fast performance
- ⚡ **Standby Mode** support for instant API-like responses
- 🔄 Dual mode: Works as both traditional Actor and HTTP server
- 📊 Saves results to Apify dataset
- 🧪 Includes test suite
- 🛠️ Ready for deployment to Apify platform

## Available Transformations

- **Reverse** 🔄: Reverses your text backwards
- **UPPERCASE** 📢: MAKES EVERYTHING LOUD
- **lowercase** 🔽: makes everything quiet
- **L33T SP34K** 💻: 7r4n5f0rm5 70 l337 5p34k
- **SpOnGeBoB** 🧽: aLtErNaTiNg CaPs LiKe ThE mEmE
- **Emojify** 😊: Adds emojis to words like happy, love, fire, cool, etc.
- **Pirate Talk** ☠️: Ahoy matey! Transforms ye text to pirate speak
- **UwU Speak** 🐱: Twansfowms youw text to cute uwu speak uwu
- **AI** 🤖: Send your message to an AI model via OpenRouter

## Actor Modes

This Actor supports two execution modes:

### Standard Mode
Traditional Actor execution that processes input once and exits. Perfect for batch jobs.

### Standby Mode
The Actor runs as an HTTP server, ready to handle requests instantly. Use this mode when you need fast, API-like responses without waiting for Actor startup time.

## Development

### Prerequisites

- Bun installed
- Apify CLI installed (optional, for deployment)

### Installation

```bash
bun install
```

### Build

```bash
bun run build
```

### Run locally

```bash
bun run dev
```

### Test

```bash
bun test
```

## Usage

### Standard Mode

When running in standard mode (via Apify Console or API), the actor accepts the following input:

```json
{
  "message": "This is a cool and happy message!",
  "transform": "emojify"
}
```

**Output:**
```json
{
  "original": "This is a cool and happy message!",
  "transformed": "This is a cool 😎 and happy 😊 message!",
  "transformation": "emojify",
  "availableTransforms": ["reverse", "uppercase", "lowercase", "leetspeak", "spongebob", "emojify", "pirate", "uwu", "ai"],
  "timestamp": "2024-12-06T19:00:00.000Z",
  "status": "success",
  "processedBy": "Fun Text Transformer 🎨 (Standard Mode)"
}
```

### Standby Mode

When running in Standby mode, the Actor exposes an HTTP API that can be called directly.

#### API Endpoints

**GET Request with Query Parameters:**
```bash
# Pirate transformation
curl "https://YOUR-STANDBY-URL/?message=Hello+my+friend&transform=pirate"

# Leetspeak transformation
curl "https://YOUR-STANDBY-URL/?message=Hello+there&transform=leetspeak"

# UwU transformation
curl "https://YOUR-STANDBY-URL/?message=I+love+coding&transform=uwu"
```

**POST Request with JSON Body:**
```bash
curl -X POST https://YOUR-STANDBY-URL/ \
  -H "Content-Type: application/json" \
  -d '{"message": "This is amazing!", "transform": "spongebob"}'
```

**AI Transformation:**
```bash
# Ask AI a question
curl "https://YOUR-STANDBY-URL/?message=What+is+the+meaning+of+life&transform=ai"

# Or via POST
curl -X POST https://YOUR-STANDBY-URL/ \
  -H "Content-Type: application/json" \
  -d '{"message": "Write a haiku about coding", "transform": "ai"}'
```

**Response Format:**
```json
{
  "original": "Hello my friend",
  "transformed": "Ahoy me matey ☠️",
  "transformation": "pirate",
  "availableTransforms": ["reverse", "uppercase", "lowercase", "leetspeak", "spongebob", "emojify", "pirate", "uwu", "ai"],
  "timestamp": "2024-12-06T19:00:00.000Z",
  "status": "success",
  "processedBy": "Fun Text Transformer 🎨",
  "method": "GET",
  "url": "/?message=Hello+my+friend&transform=pirate"
}
```

#### Readiness Probe

The Actor automatically handles Apify's readiness probe by responding to requests with the `x-apify-container-server-readiness-probe` header.

## Deployment

1. Push your Actor to Apify:
   ```bash
   apify push
   ```

2. Enable Standby mode in the Actor's Settings tab in the Apify Console

3. Configure Standby settings (timeout, min instances, etc.)

4. Get your Standby URL from the Actor run

## Configuration

The Actor automatically detects which mode it's running in using the `APIFY_META_ORIGIN` environment variable:
- `STANDBY`: Starts HTTP server
- Other values: Runs in standard mode

The HTTP server listens on the port specified by `Actor.config.get('standbyPort')` (or `ACTOR_STANDBY_PORT` environment variable).

## AI Integration

The `ai` transformation uses the [Vercel AI SDK](https://sdk.vercel.ai/) with OpenRouter via Apify's proxy. It automatically uses your `APIFY_TOKEN` for authentication.

```typescript
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openrouter = createOpenAI({
    baseURL: 'https://openrouter.apify.actor/api/v1',
    apiKey: 'apify', // any non-empty string works
    headers: {
        Authorization: `Bearer ${process.env.APIFY_TOKEN}`,
    },
});

const { text } = await generateText({
    model: openrouter('openrouter/auto'),
    prompt: 'your prompt here',
});
```

## Monetization

This Actor is optimized for pay-per-event monetization in Standby mode, making it cost-effective for both creators and users.
