import { streamChat as streamOllamaChat } from '../services/ollamaClient.js';
import { streamChat as streamLlamaCppChat } from '../services/llamaCppClient.js';
import { renderMarkdownAndHighlight } from '../utils/formatting.js';
import { parseThinking } from '../utils/thinking.js';

const requestFrame = typeof requestAnimationFrame === 'function'
  ? requestAnimationFrame
  : (cb) => setTimeout(cb, 16);
const cancelFrame = typeof cancelAnimationFrame === 'function'
  ? cancelAnimationFrame
  : (id) => clearTimeout(id);

export function createChat({
  elements,
  messageList,
  getHost,
  getProvider,
  getActiveModel,
  getEnableThinking,
  showAlert
}) {
  let messages = [];
  let isGenerating = false;
  let abortController = null;

  function clearCurrentChat() {
    if (messages.length === 0) return;
    if (!confirm('Are you sure you want to clear this active chat session? History will not be saved.')) return;

    if (isGenerating && abortController) {
      abortController.abort();
    }

    messages = [];
    messageList.clear();
    elements.chatInput.value = '';
    elements.chatInput.style.height = 'auto';
    elements.sendBtn.disabled = true;

    if (window.innerWidth < 768 && !elements.sidebar.classList.contains('collapsed')) {
      elements.toggleSidebarBtn.click();
    }
  }

  async function sendMessage() {
    if (isGenerating) return;

    const text = elements.chatInput.value.trim();
    if (!text) return;

    const activeModel = getActiveModel();
    if (!activeModel) {
      showAlert('Select Model', 'Please select an LLM model before sending a message.');
      return;
    }

    if (messages.length === 0) {
      elements.chatMessagesContainer.replaceChildren();
    }

    messages.push({ role: 'user', content: text });
    messageList.append('user', text);

    elements.chatInput.value = '';
    elements.chatInput.style.height = 'auto';
    elements.sendBtn.disabled = true;

    isGenerating = true;
    elements.stopGenerationContainer.classList.remove('hidden');
    const responseElement = messageList.append('assistant', '', true);
    const thinkingBlock = messageList.createThinkingBlock(responseElement);
    const outputMetrics = messageList.addOutputMetrics(responseElement);

    abortController = new AbortController();
    let rawContent = '';
    let rawThinking = '';
    let assistantResponse = '';
    let assistantThinking = '';
    let isThinking = false;
    let thinkingStartedAt = null;
    let thinkingDuration = null;
    let generationStartedAt = null;

    const currentSystemPrompt = elements.systemPromptInput.value.trim();
    const requestMessages = currentSystemPrompt
      ? [{ role: 'system', content: currentSystemPrompt }, ...messages]
      : [...messages];

    const RENDER_INTERVAL_MS = 60;
    let renderTimer = null;
    let lastRenderTime = 0;

    function updateStateFromBuffers() {
      if (rawThinking.length > 0) {
        assistantThinking = rawThinking;
        const parsed = parseThinking(rawContent);
        if (parsed.thinking) {
          assistantThinking += '\n' + parsed.thinking;
          assistantResponse = parsed.content;
        } else {
          assistantResponse = rawContent;
        }
        if (assistantResponse.length > 0 && isThinking) {
          isThinking = false;
          if (thinkingStartedAt && !thinkingDuration) {
            thinkingDuration = (performance.now() - thinkingStartedAt) / 1000;
          }
        }
      } else {
        const parsed = parseThinking(rawContent);
        if (parsed.thinking || parsed.isThinking) {
          thinkingStartedAt ??= performance.now();
          assistantThinking = parsed.thinking;
          assistantResponse = parsed.content;
          if (parsed.isThinking) {
            isThinking = true;
          } else {
            if (isThinking || (thinkingStartedAt && !thinkingDuration)) {
              isThinking = false;
              thinkingDuration = (performance.now() - thinkingStartedAt) / 1000;
            }
          }
        } else {
          assistantResponse = rawContent;
        }
      }
    }

    function renderStreamFrame(isFinal = false) {
      if (renderTimer) {
        cancelFrame(renderTimer);
        renderTimer = null;
      }
      lastRenderTime = performance.now();

      updateStateFromBuffers();

      if (assistantThinking) {
        if (isThinking) {
          const elapsed = thinkingStartedAt ? (performance.now() - thinkingStartedAt) / 1000 : null;
          thinkingBlock.update(assistantThinking, elapsed);
          responseElement.classList.remove('typing-cursor');
        } else {
          thinkingBlock.finish(thinkingDuration);
          if (isGenerating && !isFinal) {
            responseElement.classList.add('typing-cursor');
          }
        }
      }

      renderMarkdownAndHighlight(assistantResponse, responseElement, {
        highlightCode: isFinal
      });

      if (generationStartedAt) {
        const elapsedSeconds = (performance.now() - generationStartedAt) / 1000;
        if (elapsedSeconds > 0) {
          const totalChars = assistantResponse.length + assistantThinking.length;
          const estimatedTokenCount = Math.ceil(totalChars / 4);
          messageList.updateOutputMetrics(
            outputMetrics,
            estimatedTokenCount / elapsedSeconds,
            estimatedTokenCount,
            true
          );
        }
      }
      messageList.scrollToBottom();
    }

    function scheduleStreamRender() {
      const now = performance.now();
      if (now - lastRenderTime >= RENDER_INTERVAL_MS) {
        renderStreamFrame(false);
      } else if (!renderTimer) {
        renderTimer = requestFrame(() => {
          renderTimer = null;
          renderStreamFrame(false);
        });
      }
    }

    function flushStreamRender(isFinal = true) {
      if (renderTimer) {
        cancelFrame(renderTimer);
        renderTimer = null;
      }
      if (rawContent || rawThinking) {
        renderStreamFrame(isFinal);
      }
    }

    function cancelStreamRender() {
      if (renderTimer) {
        cancelFrame(renderTimer);
        renderTimer = null;
      }
    }

    try {
      const streamChat = getProvider() === 'llama.cpp' ? streamLlamaCppChat : streamOllamaChat;
      const enableThinking = typeof getEnableThinking === 'function' ? getEnableThinking() : true;
      const result = await streamChat({
        host: getHost(),
        model: activeModel,
        messages: requestMessages,
        temperature: parseFloat(elements.tempInput.value),
        think: enableThinking,
        signal: abortController.signal,
        onThinking: (chunk) => {
          generationStartedAt ??= performance.now();
          thinkingStartedAt ??= performance.now();
          isThinking = true;
          rawThinking += chunk;
          scheduleStreamRender();
        },
        onToken: (token) => {
          generationStartedAt ??= performance.now();
          rawContent += token;
          scheduleStreamRender();
        }
      });

      flushStreamRender(true);

      if (isThinking) {
        isThinking = false;
        if (thinkingStartedAt && !thinkingDuration) {
          thinkingDuration = (performance.now() - thinkingStartedAt) / 1000;
        }
        thinkingBlock.finish(thinkingDuration);
      }

      if (Number.isInteger(result.evalCount)) {
        const tokensPerSecond = Number.isFinite(result.evalDuration) && result.evalDuration > 0
          ? result.evalCount / (result.evalDuration / 1_000_000_000)
          : Number.NaN;
        messageList.updateOutputMetrics(outputMetrics, tokensPerSecond, result.evalCount, false);
      }
      const assistantMsg = { role: 'assistant', content: assistantResponse };
      if (assistantThinking) {
        assistantMsg.thinking = assistantThinking;
      }
      messages.push(assistantMsg);
      messageList.addCopyButton(responseElement, assistantResponse, assistantThinking);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
        flushStreamRender(true);
        if (isThinking) {
          isThinking = false;
          thinkingBlock.finish((performance.now() - (thinkingStartedAt || performance.now())) / 1000);
        }
        if (assistantResponse.trim() || assistantThinking.trim()) {
          const stoppedMsg = {
            role: 'assistant',
            content: `${assistantResponse} [Generation stopped by user]`.trim()
          };
          if (assistantThinking) {
            stoppedMsg.thinking = assistantThinking;
          }
          messages.push(stoppedMsg);
          messageList.addCopyButton(responseElement, assistantResponse, assistantThinking);
        }
      } else {
        cancelStreamRender();
        console.error(error);
        if (isThinking) {
          thinkingBlock.finish();
        }
        responseElement.textContent = `Error communicating with ${getProvider()}: ${error.message}`;
        responseElement.classList.add('text-rose-500', 'font-bold');
        messages.push({ role: 'assistant', content: `Error: ${error.message}` });
      }
    } finally {
      cancelStreamRender();
      isGenerating = false;
      responseElement.classList.remove('typing-cursor');
      elements.stopGenerationContainer.classList.add('hidden');
      abortController = null;
      messageList.scrollToBottom();
    }
  }

  function handleSuggestion(promptText) {
    if (isGenerating) return;
    elements.chatInput.value = promptText;
    handleInputAutogrow();
    sendMessage();
  }

  function handleInputAutogrow() {
    elements.chatInput.style.height = 'auto';
    elements.chatInput.style.height = `${elements.chatInput.scrollHeight}px`;
    elements.sendBtn.disabled = elements.chatInput.value.trim() === '';
  }

  function handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!elements.sendBtn.disabled && !isGenerating) {
        sendMessage();
      }
    }
  }

  function stopGenerating() {
    abortController?.abort();
  }

  elements.chatInput.addEventListener('input', handleInputAutogrow);
  elements.chatInput.addEventListener('keydown', handleInputKeydown);
  elements.sendBtn.addEventListener('click', sendMessage);
  elements.stopGenerationBtn.addEventListener('click', stopGenerating);

  return { clearCurrentChat, handleSuggestion, sendMessage };
}
