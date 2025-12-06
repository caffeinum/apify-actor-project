import { Actor } from 'apify';

// Initialize the Apify Actor
await Actor.init();

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
        processedBy: 'Apify Actor with Bun',
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
