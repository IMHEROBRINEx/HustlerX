// Usage: node shoot.mjs name=url@width[:dark] ...
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'review');
mkdirSync(outDir, { recursive: true });
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9333;
const proc = spawn(edge, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'truss-cdp')}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch {}
  await sleep(250);
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

for (const arg of process.argv.slice(2)) {
  const name = arg.slice(0, arg.indexOf('='));
  const rest = arg.slice(arg.indexOf('=') + 1);
  const url = rest.slice(0, rest.lastIndexOf('@'));
  const spec = rest.slice(rest.lastIndexOf('@') + 1);
  const [w, mode] = spec.split(':');
  const width = Number(w); const mobile = width < 700;
  await send('Emulation.setDeviceMetricsOverride', { width, height: mobile ? 844 : 900, deviceScaleFactor: 1, mobile });
  await send('Page.navigate', { url });
  await sleep(3500);
  await evalJs(`(()=>{const d=${mode === 'dark'};localStorage.setItem('theme', d?'dark':'light');document.documentElement.classList.toggle('dark', d);document.querySelectorAll('nextjs-portal').forEach(n=>n.remove());})()`);
  await sleep(2500);
  const height = await evalJs('document.documentElement.scrollHeight');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await sleep(600);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(shot.result.data, 'base64'));
  console.log(name, width, height);
}
ws.close(); proc.kill();
process.exit(0);
