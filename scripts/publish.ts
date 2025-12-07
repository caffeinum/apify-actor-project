#!/usr/bin/env bun
/**
 * publish an apify actor from a local directory
 * uses apify-client sdk to upload source files and trigger build
 */

import { ApifyClient, ActorSourceType } from 'apify-client';
import * as fs from 'fs';
import * as path from 'path';

interface PublishOptions {
    directory: string;
    actorName?: string;
    version?: string;
    buildTag?: string;
    isPublic?: boolean;
    token?: string;
}

interface ActorConfig {
    actorSpecification: number;
    name: string;
    title?: string;
    description?: string;
    version: string;
    dockerfile?: string;
    readme?: string;
    input?: string;
}

// file extensions that should be treated as text
const TEXT_EXTENSIONS = new Set([
    '.ts', '.js', '.mjs', '.cjs', '.json', '.md', '.txt', '.yaml', '.yml',
    '.html', '.css', '.scss', '.less', '.xml', '.svg', '.sh', '.bash',
    '.dockerfile', '.gitignore', '.dockerignore', '.env', '.env.example',
]);

// files/dirs to always ignore
const IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    '.DS_Store',
    'bun.lock',
    'package-lock.json',
    'yarn.lock',
];

function shouldIgnore(name: string): boolean {
    return IGNORE_PATTERNS.some(pattern => 
        name === pattern || name.startsWith(pattern + '/')
    );
}

function isTextFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();
    
    // dockerfile has no extension
    if (basename === 'dockerfile') return true;
    if (basename.startsWith('.')) return true; // dotfiles are usually text
    
    return TEXT_EXTENSIONS.has(ext);
}

function collectFiles(dir: string, baseDir: string = dir): { name: string; content: string; format: 'TEXT' | 'BASE64' }[] {
    const files: { name: string; content: string; format: 'TEXT' | 'BASE64' }[] = [];
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (shouldIgnore(entry.name)) {
            continue;
        }
        
        if (entry.isDirectory()) {
            files.push(...collectFiles(fullPath, baseDir));
        } else if (entry.isFile()) {
            const content = fs.readFileSync(fullPath);
            const isText = isTextFile(fullPath);
            
            files.push({
                name: relativePath,
                content: isText ? content.toString('utf-8') : content.toString('base64'),
                format: isText ? 'TEXT' : 'BASE64',
            });
        }
    }
    
    return files;
}

function loadActorConfig(directory: string): ActorConfig | null {
    const configPath = path.join(directory, '.actor', 'actor.json');
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    return null;
}

async function publish(options: PublishOptions) {
    const {
        directory,
        actorName,
        version = '0.1',
        buildTag = 'latest',
        isPublic = false,
        token = process.env.APIFY_TOKEN,
    } = options;

    if (!token) {
        throw new Error('APIFY_TOKEN is required. set it via env or --token flag');
    }

    const absDir = path.resolve(directory);
    if (!fs.existsSync(absDir)) {
        throw new Error(`directory not found: ${absDir}`);
    }

    // load actor config if exists
    const config = loadActorConfig(absDir);
    const finalName = actorName || config?.name || path.basename(absDir);
    const finalVersion = version || config?.version || '0.1';

    console.log(`publishing actor: ${finalName}`);
    console.log(`directory: ${absDir}`);
    console.log(`version: ${finalVersion}`);

    // collect all source files
    const sourceFiles = collectFiles(absDir);
    console.log(`collected ${sourceFiles.length} files:`);
    sourceFiles.forEach(f => console.log(`  - ${f.name} (${f.format})`));

    // init client
    const client = new ApifyClient({ token });

    // check if actor exists
    let actor: { id: string; name: string } | undefined;
    try {
        const actors = await client.actors().list();
        actor = actors.items.find(a => a.name === finalName);
    } catch (e) {
        console.log('could not list actors, will try to create new one');
    }

    if (actor) {
        console.log(`found existing actor: ${actor.id}`);
        
        // check if version exists
        const versions = await client.actor(actor.id).versions().list();
        const existingVersion = versions.items.find(v => v.versionNumber === finalVersion);
        
        if (existingVersion) {
            console.log(`updating existing version ${finalVersion}...`);
            await client.actor(actor.id).version(finalVersion).update({
                sourceType: ActorSourceType.SourceFiles,
                sourceFiles,
                buildTag,
            });
        } else {
            console.log(`creating new version ${finalVersion}...`);
            await client.actor(actor.id).versions().create({
                versionNumber: finalVersion,
                sourceType: ActorSourceType.SourceFiles,
                sourceFiles,
                buildTag,
            });
        }
    } else {
        console.log('creating new actor...');
        actor = await client.actors().create({
            name: finalName,
            title: config?.title || finalName,
            description: config?.description,
            isPublic,
            versions: [{
                versionNumber: finalVersion,
                sourceType: ActorSourceType.SourceFiles,
                sourceFiles,
                buildTag,
            }],
        });
        console.log(`created actor: ${actor.id}`);
    }

    // trigger build
    console.log('triggering build...');
    const build = await client.actor(actor.id).build(finalVersion, {
        tag: buildTag,
        waitForFinish: 120, // wait up to 2 minutes
    });

    console.log(`build status: ${build.status}`);
    
    if (build.status === 'SUCCEEDED') {
        console.log('build succeeded!');
        console.log(`actor url: https://console.apify.com/actors/${actor.id}`);
        console.log(`run url: https://api.apify.com/v2/acts/${actor.id}/runs`);
    } else {
        console.error('build failed or timed out');
        console.log(`check logs at: https://console.apify.com/actors/${actor.id}/builds/${build.id}`);
    }

    return { actor, build };
}

// cli
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
usage: bun run scripts/publish.ts [directory] [options]

arguments:
  directory     path to actor directory (default: current directory)

options:
  --name        actor name (default: from .actor/actor.json or directory name)
  --version     version number (default: from .actor/actor.json or "0.1")
  --tag         build tag (default: "latest")
  --public      make actor public (default: false)
  --token       apify api token (default: APIFY_TOKEN env var)
  --help, -h    show this help

examples:
  bun run scripts/publish.ts .
  bun run scripts/publish.ts ./my-actor --name my-cool-actor --version 1.0
  APIFY_TOKEN=xxx bun run scripts/publish.ts . --public
`);
        process.exit(0);
    }

    const directory = args.find(a => !a.startsWith('--')) || '.';
    
    const getArg = (name: string): string | undefined => {
        const idx = args.indexOf(`--${name}`);
        return idx !== -1 ? args[idx + 1] : undefined;
    };

    await publish({
        directory,
        actorName: getArg('name'),
        version: getArg('version'),
        buildTag: getArg('tag'),
        isPublic: args.includes('--public'),
        token: getArg('token'),
    });
}

main().catch(err => {
    console.error('error:', err.message);
    process.exit(1);
});
