function getApiUrl(host, endpoint) {
  const base = host.replace(/\/+$/, '');
  const apiBase = /\/v1$/i.test(base) ? base : `${base}/v1`;
  return `${apiBase}/${endpoint}`;
}

export async function getModels(host) {
  const response = await fetch(getApiUrl(host, 'models'));
  if (!response.ok) {
    throw new Error(`llama.cpp returned status ${response.status}`);
  }

  const data = await response.json();
  return (data.data || []).map((model) => ({
    name: model.id,
    size: 0
  }));
}

export async function streamChat({
  host,
  model,
  messages,
  temperature,
  signal,
  onToken,
  onThinking
}) {
  const response = await fetch(getApiUrl(host, 'chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream: true
    }),
    signal
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `llama.cpp returned status ${response.status}${detail ? `: ${detail}` : ''}`
    );
  }

  if (!response.body) {
    throw new Error('llama.cpp returned an empty response stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let partialLine = '';
  let evalCount = null;

  const processLine = (line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('data:')) return;

    const data = trimmedLine.slice(5).trim();
    if (!data || data === '[DONE]') return;

    const parsed = JSON.parse(data);
    const delta = parsed.choices?.[0]?.delta;
    const reasoning = delta?.reasoning_content ?? delta?.reasoning ?? delta?.thinking;
    if (typeof reasoning === 'string' && reasoning && typeof onThinking === 'function') {
      onThinking(reasoning);
    }
    const content = delta?.content;
    if (typeof content === 'string' && typeof onToken === 'function') {
      onToken(content);
    }
    if (Number.isInteger(parsed.usage?.completion_tokens)) {
      evalCount = parsed.usage.completion_tokens;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    partialLine += decoder.decode(value, { stream: !done });
    const lines = partialLine.split('\n');
    partialLine = lines.pop();

    lines.forEach(processLine);

    if (done) {
      processLine(partialLine);
      break;
    }
  }

  return { evalCount, evalDuration: null };
}
