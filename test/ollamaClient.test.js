import test from 'node:test';
import assert from 'node:assert/strict';
import { getModels, streamChat } from '../src/services/ollamaClient.js';

test('getModels fetches models from Ollama /api/tags', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response(JSON.stringify({
      models: [{ name: 'deepseek-r1:latest', size: 4000000000 }]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const models = await getModels('http://127.0.0.1:11434');
    assert.equal(requestedUrl, 'http://127.0.0.1:11434/api/tags');
    assert.deepEqual(models, [{ name: 'deepseek-r1:latest', size: 4000000000 }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('streamChat streams both thinking tokens and response content tokens', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  let requestBody;
  globalThis.fetch = async (url, options) => {
    requestedUrl = url;
    requestBody = JSON.parse(options.body);
    const ndjsonChunks = [
      JSON.stringify({ message: { role: 'assistant', thinking: 'Thinking step 1...', content: '' }, done: false }) + '\n',
      JSON.stringify({ message: { role: 'assistant', thinking: ' step 2...', content: '' }, done: false }) + '\n',
      JSON.stringify({ message: { role: 'assistant', thinking: '', content: 'Here is the answer.' }, done: false }) + '\n',
      JSON.stringify({ message: { role: 'assistant', thinking: '', content: '' }, done: true, eval_count: 15, eval_duration: 500000000 }) + '\n'
    ];
    const body = new ReadableStream({
      start(controller) {
        ndjsonChunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk)));
        controller.close();
      }
    });
    return new Response(body, {
      headers: { 'Content-Type': 'application/x-ndjson' }
    });
  };

  try {
    const thinkingTokens = [];
    const contentTokens = [];
    const result = await streamChat({
      host: 'http://127.0.0.1:11434',
      model: 'deepseek-r1:latest',
      messages: [{ role: 'user', content: 'What is 2+2?' }],
      temperature: 0.7,
      think: true,
      onThinking: (chunk) => thinkingTokens.push(chunk),
      onToken: (chunk) => contentTokens.push(chunk)
    });

    assert.equal(requestedUrl, 'http://127.0.0.1:11434/api/chat');
    assert.deepEqual(requestBody, {
      model: 'deepseek-r1:latest',
      messages: [{ role: 'user', content: 'What is 2+2?' }],
      options: { temperature: 0.7 },
      stream: true,
      think: true
    });
    assert.deepEqual(thinkingTokens, ['Thinking step 1...', ' step 2...']);
    assert.deepEqual(contentTokens, ['Here is the answer.']);
    assert.deepEqual(result, { evalCount: 15, evalDuration: 500000000 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
