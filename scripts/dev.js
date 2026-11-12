import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('Starting Snake Nexus Development Environment...\n');

// 1. Spawn Authoritative Server
const serverProc = spawn('node', ['server/src/index.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

// 2. Spawn Vite Client
const clientProc = spawn('npm', ['--prefix', 'client', 'run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\nShutting down Snake Nexus...');
  serverProc.kill();
  clientProc.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

