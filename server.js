import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const indexFilePath = path.join(publicDir, 'index.html');

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const DEFAULT_OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').trim();

const renderIndex = () => {
  const template = fs.readFileSync(indexFilePath, 'utf8');
  return template.replace('__OLLAMA_HUB_CONFIG_PLACEHOLDER__', JSON.stringify({ ollamaHost: DEFAULT_OLLAMA_HOST }));
};

app.disable('x-powered-by');

// Serve static assets from public folder.
app.use(express.static(publicDir, { index: false }));
app.use('/src', express.static(path.join(__dirname, 'src'), { index: false }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'ollama-hub',
    port: PORT,
    ollamaHost: DEFAULT_OLLAMA_HOST,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/config', (_req, res) => {
  res.json({ ollamaHost: DEFAULT_OLLAMA_HOST });
});

// Catch-all route to serve index.html for Single Page Application.
app.get(/.*/, (_req, res) => {
  res.send(renderIndex());
});

app.listen(PORT, () => {
  console.log('=========================================');
  console.log('Ollama Hub is running!');
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`Default Ollama host: ${DEFAULT_OLLAMA_HOST}`);
  console.log('=========================================');
});
