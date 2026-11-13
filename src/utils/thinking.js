export function parseThinking(text) {
  if (!text || typeof text !== 'string') {
    return { thinking: '', content: '', isThinking: false };
  }

  const startRegex = /<(?:think|thought)>/i;
  const endRegex = /<\/(?:think|thought)>/i;

  const startMatch = text.match(startRegex);
  if (!startMatch) {
    return { thinking: '', content: text, isThinking: false };
  }

  let remaining = text;
  const allThinking = [];
  const allContent = [];
  let isCurrentlyThinking = false;

  while (remaining.length > 0) {
    const sMatch = remaining.match(startRegex);
    if (!sMatch) {
      allContent.push(remaining);
      break;
    }

    if (sMatch.index > 0) {
      allContent.push(remaining.slice(0, sMatch.index));
    }

    const afterStart = remaining.slice(sMatch.index + sMatch[0].length);
    const eMatch = afterStart.match(endRegex);

    if (!eMatch) {
      isCurrentlyThinking = true;
      let thinkingPart = afterStart;
      // Strip partial closing tag at the tail of stream (e.g. </, </t, </th, </thi, </thin, </think)
      const partialEnd = thinkingPart.match(/<\/?(?:t(?:h(?:i(?:n(?:k)?)?)?|h(?:o(?:u(?:g(?:h(?:t)?)?)?)?)?)?)?$/i);
      if (partialEnd && partialEnd.index !== undefined) {
        thinkingPart = thinkingPart.slice(0, partialEnd.index);
      }
      allThinking.push(thinkingPart.trimStart());
      remaining = '';
      break;
    }

    const thinkingText = afterStart.slice(0, eMatch.index);
    allThinking.push(thinkingText.trim());
    remaining = afterStart.slice(eMatch.index + eMatch[0].length);
  }

  const thinking = allThinking.filter(Boolean).join('\n\n');
  const content = allContent.join('').trim();

  return {
    thinking,
    content,
    isThinking: isCurrentlyThinking
  };
}

export function formatThinkingMessage(thinking, content) {
  const parts = [];
  if (thinking && thinking.trim()) {
    parts.push(`<think>\n${thinking.trim()}\n</think>`);
  }
  if (content && content.trim()) {
    parts.push(content.trim());
  }
  return parts.join('\n\n');
}
