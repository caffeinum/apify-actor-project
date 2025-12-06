# Apify Actor Project

A simple Apify Actor built with TypeScript and Bun.

## Features

- Built with TypeScript
- Uses Bun as the runtime
- Crawls websites using Crawlee's CheerioCrawler
- Extracts page titles and link counts
- Saves results to Apify dataset

## Development

### Prerequisites

- Bun installed
- Apify CLI installed

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

The actor accepts the following input:

- `startUrls` (array of strings): URLs to start crawling from (default: ["https://apify.com"])

## Output

The actor saves results to a dataset with the following structure:

```json
{
  "url": "https://example.com",
  "title": "Example Page",
  "linkCount": 42,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
