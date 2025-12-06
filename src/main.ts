import http from 'http';
import { Actor } from 'apify';

// Fun text transformation functions
const transformations = {
    reverse: (text: string) => text.split('').reverse().join(''),

    uppercase: (text: string) => text.toUpperCase(),

    lowercase: (text: string) => text.toLowerCase(),

    leetspeak: (text: string) => text
        .replace(/[aA]/g, '4')
        .replace(/[eE]/g, '3')
        .replace(/[iI]/g, '1')
        .replace(/[oO]/g, '0')
        .replace(/[sS]/g, '5')
        .replace(/[tT]/g, '7'),

    spongebob: (text: string) => text.split('').map((char, i) =>
        i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
    ).join(''),

    emojify: (text: string) => {
        const emojiMap: Record<string, string> = {
            'happy': '😊', 'sad': '😢', 'love': '❤️', 'fire': '🔥',
            'cool': '😎', 'laugh': '😂', 'think': '🤔', 'wow': '😮',
            'rocket': '🚀', 'star': '⭐', 'heart': '💖', 'party': '🎉'
        };
        let result = text;
        for (const [word, emoji] of Object.entries(emojiMap)) {
            result = result.replace(new RegExp(word, 'gi'), `${word} ${emoji}`);
        }
        return result;
    },

    pirate: (text: string) => text
        .replace(/\byou\b/gi, 'ye')
        .replace(/\bmy\b/gi, 'me')
        .replace(/\bis\b/gi, 'be')
        .replace(/\bthe\b/gi, 'th\'')
        .replace(/\bhello\b/gi, 'ahoy')
        .replace(/\bfriend\b/gi, 'matey') + ' ☠️',

    uwu: (text: string) => text
        .replace(/[rl]/g, 'w')
        .replace(/[RL]/g, 'W')
        .replace(/n([aeiou])/g, 'ny$1')
        .replace(/N([aeiou])/g, 'Ny$1')
        .replace(/ove/g, 'uv')
        + ' uwu',
};

// Initialize the Apify Actor
await Actor.init();

// Check if Actor is started in Standby mode
if (Actor.config.get('metaOrigin') === 'STANDBY') {
    console.log('Actor started in STANDBY mode');

    // Get the port from Actor configuration
    const port = Actor.config.get('standbyPort');

    // Create HTTP server for Standby mode
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
            // Parse request body for POST/PUT requests
            let body = '';
            if (req.method === 'POST' || req.method === 'PUT') {
                await new Promise<void>((resolve, reject) => {
                    req.on('data', chunk => {
                        body += chunk.toString();
                    });
                    req.on('end', () => resolve());
                    req.on('error', reject);
                });
            }

            // Parse input from body or use query parameters
            let input: { message?: string; transform?: string } = {};
            if (body) {
                try {
                    input = JSON.parse(body);
                } catch (e) {
                    // If not JSON, treat as plain text message
                    input = { message: body };
                }
            } else if (req.url) {
                // Parse query parameters
                const url = new URL(req.url, `http://localhost:${port}`);
                const message = url.searchParams.get('message');
                const transform = url.searchParams.get('transform');
                if (message) {
                    input = { message, transform: transform || undefined };
                }
            }

            const message = input.message || 'Hello from Fun Text Transformer!';
            const transform = input.transform || 'emojify';

            // Apply transformation
            const transformFn = transformations[transform as keyof typeof transformations];
            const transformed = transformFn ? transformFn(message) : message;

            // Process the request
            const result = {
                original: message,
                transformed: transformed,
                transformation: transform,
                availableTransforms: Object.keys(transformations),
                timestamp: new Date().toISOString(),
                status: 'success',
                processedBy: 'Fun Text Transformer 🎨',
                method: req.method,
                url: req.url,
            };

            // Save the results to the Actor's dataset
            await Actor.pushData(result);

            console.log('Request processed:', result);

            // Send response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('Error processing request:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            }));
        }
    });

    // Start the server
    server.listen(port, () => {
        console.log(`Standby server listening on port ${port}`);
        console.log(`Standby URL: ${Actor.config.get('standbyUrl')}`);
    });

    // Keep the Actor running
    await new Promise(() => {});
} else {
    console.log('Actor started in STANDARD mode');

    try {
        // Get input from Apify platform (or use default)
        const input = (await Actor.getInput()) as { message?: string; transform?: string } || {};
        const message = input.message || 'Hello from Fun Text Transformer!';
        const transform = input.transform || 'emojify';

        console.log('Actor started!');
        console.log('Input message:', message);
        console.log('Transformation:', transform);

        // Apply transformation
        const transformFn = transformations[transform as keyof typeof transformations];
        const transformed = transformFn ? transformFn(message) : message;

        // Create result
        const result = {
            original: message,
            transformed: transformed,
            transformation: transform,
            availableTransforms: Object.keys(transformations),
            timestamp: new Date().toISOString(),
            status: 'success',
            processedBy: 'Fun Text Transformer 🎨 (Standard Mode)',
        };

        // Save the results to the Actor's dataset
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
}
