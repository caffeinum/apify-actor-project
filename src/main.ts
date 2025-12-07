import { Actor } from 'apify';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// system prompt for the actor builder agent
const SYSTEM_PROMPT = `You are an expert Apify Actor builder. Your job is to create complete, production-ready Apify Actors based on user requirements.

IMPORTANT WORKFLOW:
1. First, run: bun x apify-cli create ACTOR_NAME -t ts-start-bun --skip-dependency-install
   This scaffolds a complete TypeScript + Bun actor with all required files.
2. Then modify the generated files to implement the user's requirements.

The scaffolded actor will have:
- src/main.ts - Main actor code (modify this to implement the logic)
- .actor/actor.json - Actor metadata (update title, description)
- .actor/input_schema.json - Input schema (customize for your needs)
- package.json - Dependencies
- Dockerfile - Already configured for Bun
- tsconfig.json - TypeScript config
- README.md - Documentation (update with usage info)

Key requirements when modifying:
- Keep the version in actor.json as "MAJOR.MINOR" format (e.g., "0.0", "1.0"), NOT semver
- Always use "await Actor.init()" at the start and "await Actor.exit()" at the end
- Use "await Actor.getInput()" to get input
- Use "await Actor.pushData()" to save results
- Handle errors gracefully with try/catch

After modifying all files, the actor will be published automatically.
Do NOT run apify push yourself - it will be done after you finish.

Focus on creating clean, working code that follows Apify best practices.`;

interface ActorBuilderInput {
    prompt: string;
    actorName: string;
    claudeOauthToken?: string;
}

async function buildActor(input: ActorBuilderInput): Promise<{ success: boolean; actorName: string; logs: string[] }> {
    const { prompt, actorName, claudeOauthToken } = input;
    const logs: string[] = [];
    
    // create a temp directory to work in
    const baseDir = `/tmp/actor-builder-${Date.now()}`;
    fs.mkdirSync(baseDir, { recursive: true });
    
    // the actor will be created inside this directory by apify create
    const workDir = path.join(baseDir, actorName);
    
    logs.push(`base directory: ${baseDir}`);
    console.log(`base directory: ${baseDir}`);

    // get claude token from input or env var
    const claudeToken = claudeOauthToken || process.env.CLAUDE_CODE_OAUTH_TOKEN;
    if (!claudeToken) {
        throw new Error('claudeOauthToken input or CLAUDE_CODE_OAUTH_TOKEN environment variable is required');
    }
    
    // set the token in env for the claude agent sdk
    process.env.CLAUDE_CODE_OAUTH_TOKEN = claudeToken;

    const apifyToken = process.env.APIFY_TOKEN;
    if (!apifyToken) {
        throw new Error('APIFY_TOKEN environment variable is required');
    }

    // build the actor using claude agent sdk
    const fullPrompt = `Build an Apify Actor called "${actorName}" with the following requirements:

${prompt}

Steps:
1. First run: bun x apify-cli create ${actorName} -t ts-start-bun --skip-dependency-install
2. Then cd into the created directory and modify the files to implement the requirements
3. Update src/main.ts with the actor logic
4. Update .actor/actor.json with proper title and description
5. Update .actor/input_schema.json with the required inputs
6. Update README.md with usage documentation

Make sure the actor is complete and ready to deploy.`;

    logs.push(`starting claude agent with prompt: ${fullPrompt.substring(0, 100)}...`);
    console.log('starting claude agent...');

    try {
        // find the claude code cli - check node_modules first, then fall back to global
        const localCliPath = path.join(process.cwd(), 'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'cli.js');
        const cliPath = fs.existsSync(localCliPath) ? localCliPath : undefined;
        
        const response = query({
            prompt: fullPrompt,
            options: {
                cwd: baseDir,
                systemPrompt: SYSTEM_PROMPT,
                permissionMode: 'acceptEdits',
                executable: 'bun',
                pathToClaudeCodeExecutable: cliPath,
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
        
        const pushResult = execSync('bun x apify-cli push', {
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
