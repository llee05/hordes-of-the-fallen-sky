import { spawn } from 'node:child_process';
import electron from 'electron';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 5173 } });
await server.listen();
const url = server.resolvedUrls.local[0];
console.log(`Hordes of the Fallen Sky · renderer at ${url}`);
const environment = { ...process.env, GLOAM_DEV_SERVER_URL: url };
delete environment.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ['.'], { stdio: 'inherit', env: environment });
let closing = false;
async function close(code = 0) {
  if (closing) return;
  closing = true;
  if (child.exitCode === null) child.kill();
  await server.close();
  process.exitCode = code;
}
child.on('error', (error) => {
  console.error(error);
  void close(1);
});
child.on('exit', (code) => void close(code ?? 0));
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
