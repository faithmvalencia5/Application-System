const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const backendDir = path.join(root, 'backend');
const env = { ...process.env };
env.PORT = env.PORT || '3000';
env.BACKEND_PORT = env.BACKEND_PORT || '3000';
env.FACE_VERIFICATION_URL = env.FACE_VERIFICATION_URL || 'http://127.0.0.1:8001';
env.DOCUMENT_VERIFICATION_URL = env.DOCUMENT_VERIFICATION_URL || 'http://127.0.0.1:8002';
env.AGE_VERIFICATION_URL = env.AGE_VERIFICATION_URL || 'http://127.0.0.1:8003';

const children = [];
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
    process.exit(exitCode);
  }, 1500).unref();
}

function start(name, command, args, cwd, childEnv = env) {
  const child = spawn(command, args, { cwd, env: childEnv, stdio: 'inherit' });
  children.push(child);
  child.on('error', error => {
    console.error(`Unable to start ${name}:`, error.message);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${name}] exited (${signal || code}). Stopping local services.`);
    shutdown(code || 1);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('Starting OSCA Application System locally...');
console.log('Frontend: http://localhost:5501');
console.log('Backend:  http://localhost:3000/health');
console.log('Backend environment file: backend/.env');
console.log('Verification services use ports 8001 (face), 8002 (document), and 8003 (age).');
start('backend', process.execPath, ['server.js'], backendDir);
start('frontend', process.execPath, [path.join(root, 'local-server.js'), '--port=5501'], root);
