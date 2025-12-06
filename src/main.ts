import http from 'http';
import { Actor } from 'apify';

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
            let input: { message?: string } = {};
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
                if (message) {
                    input = { message };
                }
            }

            const message = input.message || 'Hello from Apify Actor Standby!';

            // Process the request
            const result = {
                message: message,
                timestamp: new Date().toISOString(),
                status: 'success',
                processedBy: 'Apify Actor with Bun (Standby Mode)',
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
        const input = (await Actor.getInput()) as { message?: string } || {};
        const message = input.message || 'Hello from Apify Actor!';

        console.log('Actor started!');
        console.log('Input message:', message);

        // Simulate some work
        const result = {
            message: message,
            timestamp: new Date().toISOString(),
            status: 'success',
            processedBy: 'Apify Actor with Bun (Standard Mode)',
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
