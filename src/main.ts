import { Actor } from 'apify';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// system prompt for the actor builder agent
const SYSTEM_PROMPT = `You are an expert Apify Actor builder. Your job is to create complete, production-ready Apify Actors based on user requirements.

IMPORTANT: Read the GUIDE.md file in your working directory first! It contains the complete guide for building Apify Actors with Bun, including all file structures, configurations, and best practices.

When building an actor, you must create these files in the working directory:
1. src/main.ts - The main actor code using the Apify SDK
2. .actor/actor.json - Actor metadata and configuration  
3. .actor/input_schema.json - Input schema definition
4. package.json - Dependencies (always include "apify": "^3.0.0")
5. Dockerfile - Use the bun base image (FROM oven/bun:1)
6. tsconfig.json - TypeScript configuration
7. README.md - Documentation

Key requirements:
- Use TypeScript and Bun runtime
- Always use "await Actor.init()" at the start and "await Actor.exit()" at the end
- Use "await Actor.getInput()" to get input
- Use "await Actor.pushData()" to save results
- Handle errors gracefully with try/catch
- The Dockerfile must use FROM oven/bun:1 as base image
- Include proper build scripts in package.json

After creating all files, the actor will be published automatically.
Do NOT run apify push yourself - it will be done after you finish.

Focus on creating clean, working code that follows Apify best practices.`;

interface ActorBuilderInput {
    prompt: string;
    actorName: string;
}

async function buildActor(input: ActorBuilderInput): Promise<{ success: boolean; actorName: string; logs: string[] }> {
    const { prompt, actorName } = input;
    const logs: string[] = [];
    
    // create a temp directory for the new actor
    const workDir = `/tmp/${actorName}-${Date.now()}`;
    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(path.join(workDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(workDir, '.actor'), { recursive: true });
    
    // copy GUIDE.md to the working directory so the agent can read it
    const guideSource = path.join(process.cwd(), 'GUIDE.md');
    const guideDest = path.join(workDir, 'GUIDE.md');
    if (fs.existsSync(guideSource)) {
        fs.copyFileSync(guideSource, guideDest);
        logs.push('copied GUIDE.md to working directory');
    }
    
    logs.push(`created working directory: ${workDir}`);
    console.log(`working directory: ${workDir}`);

    const claudeToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    if (!claudeToken) {
        throw new Error('CLAUDE_CODE_OAUTH_TOKEN environment variable is required');
    }

    const apifyToken = process.env.APIFY_TOKEN;
    if (!apifyToken) {
        throw new Error('APIFY_TOKEN environment variable is required');
    }

    // build the actor using claude agent sdk
    const fullPrompt = `Build an Apify Actor called "${actorName}" with the following requirements:

${prompt}

Create all necessary files (src/main.ts, .actor/actor.json, .actor/input_schema.json, package.json, Dockerfile, tsconfig.json, README.md).

Make sure the actor is complete and ready to deploy.`;

    logs.push(`starting claude agent with prompt: ${fullPrompt.substring(0, 100)}...`);
    console.log('starting claude agent...');

    try {
        const response = query({
            prompt: fullPrompt,
            options: {
                model: 'claude-sonnet-4-20250514',
                cwd: workDir,
                systemPrompt: SYSTEM_PROMPT,
                permissionMode: 'acceptEdits',
            }
        });

        for await (const message of response) {
            switch (message.type) {
                case 'assistant':
                    // assistant messages have a 'message' property with the API response
                    const content = message.message.content;
                    if (Array.isArray(content)) {
                        for (const block of content) {
                            if (block.type === 'text') {
                                logs.push(`assistant: ${block.text.substring(0, 200)}...`);
                                console.log('assistant:', block.text.substring(0, 500));
                            } else if (block.type === 'tool_use') {
                                logs.push(`tool use: ${block.name}`);
                                console.log(`tool use: ${block.name}`);
                            }
                        }
                    }
                    break;
                case 'user':
                    // tool results come back as user messages
                    logs.push('tool result received');
                    console.log('tool result received');
                    break;
                case 'result':
                    if (message.subtype === 'success') {
                        logs.push(`completed: ${message.result.substring(0, 200)}...`);
                        console.log('result:', message.result.substring(0, 500));
                    } else {
                        logs.push(`error: ${message.subtype}`);
                        console.error('error result:', message.subtype);
                    }
                    break;
                case 'system':
                    if (message.subtype === 'init') {
                        logs.push(`session started: ${message.session_id}`);
                        console.log(`session id: ${message.session_id}`);
                    }
                    break;
                case 'tool_progress':
                    logs.push(`tool progress: ${message.tool_name}`);
                    console.log(`tool progress: ${message.tool_name}`);
                    break;
            }
        }

        logs.push('claude agent finished building actor');
        console.log('claude agent finished');

        // verify required files exist
        const requiredFiles = [
            'src/main.ts',
            '.actor/actor.json',
            'package.json',
            'Dockerfile'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(workDir, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`required file missing: ${file}`);
            }
            logs.push(`verified: ${file} exists`);
        }

        // install dependencies
        logs.push('installing dependencies...');
        console.log('installing dependencies...');
        execSync('bun install', { cwd: workDir, stdio: 'inherit' });

        // publish the actor using bunx apify push
        logs.push('publishing actor to apify...');
        console.log('publishing actor...');
        
        const pushResult = execSync('bunx apify push', {
            cwd: workDir,
            env: {
                ...process.env,
                APIFY_TOKEN: apifyToken,
            },
            encoding: 'utf-8',
            stdio: 'pipe',
        });

        logs.push(`push result: ${pushResult}`);
        console.log('push result:', pushResult);

        return {
            success: true,
            actorName,
            logs,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logs.push(`error: ${errorMessage}`);
        console.error('build failed:', errorMessage);
        
        return {
            success: false,
            actorName,
            logs,
        };
    }
}

// initialize the apify actor
await Actor.init();

console.log('actor builder started');

try {
    const input = (await Actor.getInput()) as ActorBuilderInput | null;
    
    if (!input?.prompt || !input?.actorName) {
        throw new Error('missing required input: prompt and actorName are required');
    }

    console.log('building actor:', input.actorName);
    console.log('prompt:', input.prompt);

    const result = await buildActor(input);

    await Actor.pushData({
        ...result,
        timestamp: new Date().toISOString(),
        inputPrompt: input.prompt,
    });

    if (result.success) {
        console.log(`actor "${input.actorName}" built and published successfully!`);
    } else {
        console.log(`failed to build actor "${input.actorName}"`);
    }

} catch (error) {
    console.error('actor builder error:', error);
    await Actor.pushData({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
    });
} finally {
    await Actor.exit();
}
