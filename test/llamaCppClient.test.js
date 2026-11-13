import test from 'node:test';
import assert from 'node:assert/strict';
import { getModels, streamChat } from '../src/services/llamaCppClient.js';

test('getModels fetches OpenAI-compatible models and maps their IDs', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response(JSON.stringify({
      data: [{ id: 'local-model' }]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const models = await getModels('http://127.0.0.1:8080/');
    assert.equal(requestedUrl, 'http://127.0.0.1:8080/v1/models');
    assert.deepEqual(models, [{ name: 'local-model', size: 0 }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getModels does not duplicate an existing v1 path', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response(JSON.stringify({ data: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    await getModels('http://127.0.0.1:8080/v1');
    assert.equal(requestedUrl, 'http://127.0.0.1:8080/v1/models');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('streamChat parses SSE tokens and sends OpenAI-compatible request fields', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  let requestBody;
  globalThis.fetch = async (url, options) => {
    requestedUrl = url;
    requestBody = JSON.parse(options.body);
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: {"choices":[],"usage":{"completion_tokens":2}}\n\n',
      'data: [DONE]\n\n'
    ];
    const body = new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk)));
        controller.close();
      }
    });
    return new Response(body, {
      headers: { 'Content-Type': 'text/event-stream' }
    });
  };

  try {
    const tokens = [];
    const result = await streamChat({
      host: 'http://127.0.0.1:8080/v1',
      model: 'local-model',
      messages: [{ role: 'user', content: 'Hi' }],
      temperature: 0.4,
      onToken: (token) => tokens.push(token)
    });

    assert.equal(requestedUrl, 'http://127.0.0.1:8080/v1/chat/completions');
    assert.deepEqual(requestBody, {
      model: 'local-model',
      messages: [{ role: 'user', content: 'Hi' }],
      temperature: 0.4,
      stream: true
    });
    assert.deepEqual(tokens, ['Hello', ' world']);
    assert.deepEqual(result, { evalCount: 2, evalDuration: null });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('streamChat parses reasoning_content tokens from SSE chunks', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    const chunks = [
      'data: {"choices":[{"delta":{"reasoning_content":"Let\'s think"}}]}\n\n',
      'data: {"choices":[{"delta":{"reasoning_content":" about this"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Done."}}]}\n\n',
      'data: [DONE]\n\n'
    ];
    const body = new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk)));
        controller.close();
      }
    });
    return new Response(body, {
      headers: { 'Content-Type': 'text/event-stream' }
    });
  };

  try {
    const thinkingTokens = [];
    const contentTokens = [];
    await streamChat({
      host: 'http://127.0.0.1:8080/v1',
      model: 'reasoning-model',
      messages: [{ role: 'user', content: 'Explain' }],
      temperature: 0.2,
      onThinking: (token) => thinkingTokens.push(token),
      onToken: (token) => contentTokens.push(token)
    });

    assert.deepEqual(thinkingTokens, ["Let's think", ' about this']);
    assert.deepEqual(contentTokens, ['Done.']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
