import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const pattern =
    '^\\s*(?://|/\\*|\\{/\\*)\\s*[-=*_]{3,}|^\\s*(?://|/\\*|\\{/\\*)\\s*(?:step\\s*[:\\-_]?\\s*\\d+|\\d+[、\\.:：\\)]|\\d+）|[（(]\\d+[)）]|步骤\\s*[一二三四五六七八九十0-9]+|第[一二三四五六七八九十0-9]+步|接下来|首先|然后|最后|声明变量|发送请求)';

function runGitGrep() {
    const args = [
        'grep',
        '--untracked',
        '-nPi',
        pattern,
        '--',
        ':!.agents',
        ':!node_modules',
        ':!dist',
        ':!target',
        ':!src-tauri/target',
    ];

    return spawnSync('git', args, { cwd: repoRoot, encoding: 'utf-8' });
}

function runFallbackScanner() {
    const regex = new RegExp(pattern, 'i');
    const violations = [];
    const ignoredDirs = new Set(['.agents', 'node_modules', 'dist', 'target', '.git']);

    function scan(dir) {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (ignoredDirs.has(entry.name)) continue;
            const fullPath = resolve(dir, entry.name);
            if (entry.isDirectory()) {
                scan(fullPath);
            } else if (entry.isFile()) {
                if (!/\.(?:ts|tsx|js|jsx|mjs|cjs|rs|css|html|json|md)$/i.test(entry.name)) continue;
                const content = readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (regex.test(line)) {
                        const relPath = fullPath.replace(repoRoot + '\\', '').replace(repoRoot + '/', '');
                        violations.push(`${relPath}:${idx + 1}:${line.trimEnd()}`);
                    }
                });
            }
        }
    }

    scan(repoRoot);
    return violations;
}

const hasGit = existsSync(resolve(repoRoot, '.git'));
let stdout = '';
let matched = false;

if (hasGit) {
    const result = runGitGrep();
    if (result.status === 0) {
        matched = true;
        stdout = result.stdout;
    } else if (result.status === 1) {
        matched = false;
    } else {
        const violations = runFallbackScanner();
        matched = violations.length > 0;
        stdout = violations.join('\n');
    }
} else {
    const violations = runFallbackScanner();
    matched = violations.length > 0;
    stdout = violations.join('\n');
}

if (matched) {
    console.error('Prohibited procedural or decorative comments found:');
    console.error(stdout.trim());
    process.exit(1);
} else {
    console.log('Comment lint passed: No procedural step or decorative comments found.');
    process.exit(0);
}
