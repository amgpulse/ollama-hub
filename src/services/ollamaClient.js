export async function getModels(host) {
  const response = await fetch(`${host}/api/tags`);
  if (!response.ok) {
    throw new Error('Unreachable');
  }

  const data = await response.json();
  return data.models || [];
}

export async function streamChat({
  host,
  model,
  messages,
  temperature,
  think = true,
  signal,
  onToken,
  onThinking
}) {
  const requestBody = {
    model,
    messages,
    options: { temperature },
    stream: true
  };

  if (typeof think === 'boolean') {
    requestBody.think = think;
  }

  const response = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
    signal
  });

  if (!response.ok) {
    throw new Error(`Ollama returned status ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Ollama returned an empty response stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let partialLine = '';
  let evalCount = null;
  let evalDuration = null;

  const processLine = (line) => {
    if (!line.trim()) return;

    try {
      const parsed = JSON.parse(line);
      if (parsed.message?.thinking && typeof onThinking === 'function') {
        onThinking(parsed.message.thinking);
      }
      if (parsed.message?.content && typeof onToken === 'function') {
        onToken(parsed.message.content);
      }
      if (parsed.done && Number.isInteger(parsed.eval_count)) {
        evalCount = parsed.eval_count;
      }
      if (parsed.done && Number.isFinite(parsed.eval_duration)) {
        evalDuration = parsed.eval_duration;
      }
    } catch (error) {
      console.warn('NDJSON Parse warning:', line, error);
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

  return { evalCount, evalDuration };
}
