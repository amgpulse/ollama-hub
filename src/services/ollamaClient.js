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
  signal,
  onToken
}) {
  const response = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      options: { temperature },
      stream: true
    }),
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

  const processLine = (line) => {
    if (!line.trim()) return;

    try {
      const parsed = JSON.parse(line);
      if (parsed.message?.content) {
        onToken(parsed.message.content);
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
}
