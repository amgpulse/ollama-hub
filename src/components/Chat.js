import { streamChat } from '../services/ollamaClient.js';
import { renderMarkdownAndHighlight } from '../utils/formatting.js';

export function createChat({
  elements,
  messageList,
  getHost,
  getActiveModel,
  showAlert
}) {
  let messages = [];
  let isGenerating = false;
  let abortController = null;

  function clearCurrentChat() {
    if (messages.length === 0) return;
    if (!confirm('Are you sure you want to clear this active chat session? History will not be saved.')) return;

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

    try {
      const result = await streamChat({
        host: getHost(),
        model: activeModel,
        messages: requestMessages,
        temperature: parseFloat(elements.tempInput.value),
        signal: abortController.signal,
        onToken: (token) => {
          generationStartedAt ??= performance.now();
          assistantResponse += token;
          renderMarkdownAndHighlight(assistantResponse, responseElement);
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
          messageList.scrollToBottom();
        }
      });

      if (
        Number.isInteger(result.evalCount) &&
        Number.isFinite(result.evalDuration) &&
        result.evalDuration > 0
      ) {
        messageList.updateOutputMetrics(
          outputMetrics,
          result.evalCount / (result.evalDuration / 1_000_000_000),
          result.evalCount,
          false
        );
      }
      messages.push({ role: 'assistant', content: assistantResponse });
      messageList.addCopyButton(responseElement, assistantResponse);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
        if (assistantResponse.trim()) {
          messages.push({ role: 'assistant', content: `${assistantResponse} [Generation stopped by user]` });
          messageList.addCopyButton(responseElement, assistantResponse);
        }
      } else {
        console.error(error);
        responseElement.innerHTML = `<span class="text-rose-500 font-bold flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation"></i> Error communicating with Ollama: ${error.message}</span>`;
        messages.push({ role: 'assistant', content: `Error: ${error.message}` });
      }
    } finally {
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
