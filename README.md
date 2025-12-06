# Apify Actor Project

A simple Apify Actor built with TypeScript and Bun, supporting both **Standard** and **Standby** modes.

## Features

- 🚀 Built with TypeScript and Bun for fast performance
- ⚡ **Standby Mode** support for instant API-like responses
- 🔄 Dual mode: Works as both traditional Actor and HTTP server
- 📊 Saves results to Apify dataset
- 🧪 Includes test suite
- 🛠️ Ready for deployment to Apify platform

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
  "message": "Your custom message here"
}
```

**Output:**
```json
{
  "message": "Your custom message here",
  "timestamp": "2024-12-06T19:00:00.000Z",
  "status": "success",
  "processedBy": "Apify Actor with Bun (Standard Mode)"
}
```

### Standby Mode

When running in Standby mode, the Actor exposes an HTTP API that can be called directly.

#### API Endpoints

**GET Request with Query Parameters:**
```bash
curl "https://YOUR-STANDBY-URL/?message=Hello+World"
```

**POST Request with JSON Body:**
```bash
curl -X POST https://YOUR-STANDBY-URL/ \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from Standby!"}'
```

**POST Request with Plain Text:**
```bash
curl -X POST https://YOUR-STANDBY-URL/ \
  -H "Content-Type: text/plain" \
  -d "Your message here"
```

**Response Format:**
```json
{
  "message": "Your message here",
  "timestamp": "2024-12-06T19:00:00.000Z",
  "status": "success",
  "processedBy": "Apify Actor with Bun (Standby Mode)",
  "method": "POST",
  "url": "/"
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

## Monetization

This Actor is optimized for pay-per-event monetization in Standby mode, making it cost-effective for both creators and users.
