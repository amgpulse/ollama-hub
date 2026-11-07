import { streamChat as streamOllamaChat } from '../services/ollamaClient.js';
import { streamChat as streamLlamaCppChat } from '../services/llamaCppClient.js';
import { renderMarkdownAndHighlight } from '../utils/formatting.js';

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
    const outputMetrics = messageList.addOutputMetrics(responseElement);

    abortController = new AbortController();
    let assistantResponse = '';
    let generationStartedAt = null;

    const currentSystemPrompt = elements.systemPromptInput.value.trim();
    const requestMessages = currentSystemPrompt
      ? [{ role: 'system', content: currentSystemPrompt }, ...messages]
      : [...messages];

    const RENDER_INTERVAL_MS = 60;
    let renderTimer = null;
    let lastRenderTime = 0;

    function renderStreamFrame(isFinal = false) {
      if (renderTimer) {
        cancelFrame(renderTimer);
        renderTimer = null;
      }
      lastRenderTime = performance.now();
      renderMarkdownAndHighlight(assistantResponse, responseElement, {
        highlightCode: isFinal
      });

      if (generationStartedAt) {
        const elapsedSeconds = (performance.now() - generationStartedAt) / 1000;
        if (elapsedSeconds > 0) {
          const estimatedTokenCount = Math.ceil(assistantResponse.length / 4);
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
      if (assistantResponse) {
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
      const result = await streamChat({
        host: getHost(),
        model: activeModel,
        messages: requestMessages,
        temperature: parseFloat(elements.tempInput.value),
        signal: abortController.signal,
        onToken: (token) => {
          generationStartedAt ??= performance.now();
          assistantResponse += token;
          scheduleStreamRender();
        }
      });

      flushStreamRender(true);

      if (Number.isInteger(result.evalCount)) {
        const tokensPerSecond = Number.isFinite(result.evalDuration) && result.evalDuration > 0
          ? result.evalCount / (result.evalDuration / 1_000_000_000)
          : Number.NaN;
        messageList.updateOutputMetrics(outputMetrics, tokensPerSecond, result.evalCount, false);
      }
      messages.push({ role: 'assistant', content: assistantResponse });
      messageList.addCopyButton(responseElement, assistantResponse);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
        flushStreamRender(true);
        if (assistantResponse.trim()) {
          messages.push({ role: 'assistant', content: `${assistantResponse} [Generation stopped by user]` });
          messageList.addCopyButton(responseElement, assistantResponse);
        }
      } else {
        cancelStreamRender();
        console.error(error);
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
