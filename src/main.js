import { createChat } from './components/Chat.js';
import { createMessageList } from './components/MessageList.js';
import { renderModelsDropdown } from './components/ModelSelector.js';
import { initializeSettings, setupSettings } from './components/Settings.js';
import { getModels } from './services/ollamaClient.js';

const elements = {
  sidebar: document.getElementById('sidebar'),
  mobileOverlay: document.getElementById('mobile-overlay'),
  toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
  newChatBtn: document.getElementById('new-chat-btn'),
  hostUrlInput: document.getElementById('host-url-input'),
  testConnectionBtn: document.getElementById('test-connection-btn'),
  testStatusIcon: document.getElementById('test-status-icon'),
  themeToggle: document.getElementById('theme-toggle'),
  modelSelect: document.getElementById('model-select'),
  systemPromptInput: document.getElementById('system-prompt-input'),
  tempInput: document.getElementById('temp-input'),
  tempVal: document.getElementById('temp-val'),
  activeModelTitle: document.getElementById('active-model-title'),
  hostBadge: document.getElementById('host-badge'),
  chatMessagesContainer: document.getElementById('chat-messages-container'),
  emptyState: document.getElementById('empty-state'),
  stopGenerationContainer: document.getElementById('stop-generation-container'),
  stopGenerationBtn: document.getElementById('stop-generation-btn'),
  chatInput: document.getElementById('chat-input'),
  sendBtn: document.getElementById('send-btn'),
  alertModal: document.getElementById('alert-modal'),
  alertTitle: document.getElementById('alert-title'),
  alertMessage: document.getElementById('alert-message'),
  alertCloseBtn: document.getElementById('alert-close-btn'),
  ollamaStatusDot: document.getElementById('ollama-status-dot'),
  ollamaStatusText: document.getElementById('ollama-status-text')
};

let ollamaHost = initializeSettings(elements);
let models = [];
let activeModel = '';

function showAlert(title, message) {
  elements.alertTitle.textContent = title;
  elements.alertMessage.textContent = message;
  elements.alertModal.classList.remove('hidden');
}

const messageList = createMessageList(
  elements.chatMessagesContainer,
  elements.emptyState,
  () => activeModel
);

const chat = createChat({
  elements,
  messageList,
  getHost: () => ollamaHost,
  getActiveModel: () => activeModel,
  showAlert
});

async function verifyConnectionAndLoadModels(host) {
  elements.ollamaStatusDot.className = 'inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse';
  elements.ollamaStatusText.textContent = 'Connecting...';
  elements.testStatusIcon.className = 'fa-solid fa-spinner animate-spin';
  elements.testConnectionBtn.disabled = true;

  try {
    models = await getModels(host);
    renderModelsDropdown(models, elements.modelSelect, activeModel);

    elements.ollamaStatusDot.className = 'inline-block w-2 h-2 rounded-full bg-emerald-500';
    elements.ollamaStatusText.textContent = 'Connected to Ollama';
    elements.testStatusIcon.className = 'fa-solid fa-circle-check text-emerald-400';

    if (models.length > 0) {
      if (!activeModel || !models.some((model) => model.name === activeModel)) {
        activeModel = models[0].name;
      }
      elements.modelSelect.value = activeModel;
      elements.activeModelTitle.textContent = activeModel;
    } else {
      elements.activeModelTitle.textContent = 'No models loaded';
      showAlert(
        'No Models Found',
        'Your Ollama system is online, but no AI models are installed. Please run "ollama pull llama3" or "ollama pull deepseek-r1" in your terminal to fetch a model.'
      );
    }
  } catch (error) {
    console.error('Ollama connect failed:', error);
    elements.ollamaStatusDot.className = 'inline-block w-2 h-2 rounded-full bg-rose-500';
    elements.ollamaStatusText.textContent = 'Offline / Connection Error';
    elements.testStatusIcon.className = 'fa-solid fa-triangle-exclamation text-rose-400';
    elements.modelSelect.innerHTML = '<option value="">Ollama is offline</option>';
    elements.activeModelTitle.textContent = 'Ollama Unreachable';

    showAlert(
      'Ollama Connection Error',
      `Unable to connect to Ollama server at ${host}.\n\n1. Make sure Ollama application is active and running.\n2. Verify the host address.\n3. If Ollama runs on another device, check network permissions.`
    );
  } finally {
    elements.testConnectionBtn.disabled = false;
  }
}

elements.modelSelect.addEventListener('change', (event) => {
  activeModel = event.target.value;
  elements.activeModelTitle.textContent = activeModel || 'No Model Selected';
});

elements.alertCloseBtn.addEventListener('click', () => {
  elements.alertModal.classList.add('hidden');
});

document.querySelectorAll('[data-suggestion]').forEach((button) => {
  button.addEventListener('click', () => chat.handleSuggestion(button.dataset.suggestion));
});

setupSettings(elements, {
  onReconnect: async (host) => {
    ollamaHost = host;
    await verifyConnectionAndLoadModels(host);
  },
  onClearChat: chat.clearCurrentChat
});

await verifyConnectionAndLoadModels(ollamaHost);
