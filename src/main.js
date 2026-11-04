import { createChat } from './components/Chat.js';
import { createMessageList } from './components/MessageList.js';
import { renderModelsDropdown } from './components/ModelSelector.js';
import { initializeSettings, setupSettings } from './components/Settings.js';
import { getModels } from './services/ollamaClient.js';
import { getModels as getLlamaCppModels } from './services/llamaCppClient.js';

const elements = {
  sidebar: document.getElementById('sidebar'),
  mobileOverlay: document.getElementById('mobile-overlay'),
  toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
  newChatBtn: document.getElementById('new-chat-btn'),
  providerSelect: document.getElementById('provider-select'),
  hostUrlInput: document.getElementById('host-url-input'),
  hostUrlLabel: document.getElementById('host-url-label'),
  modelSourceHint: document.getElementById('model-source-hint'),
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

const initialConnection = initializeSettings(elements);
let provider = initialConnection.provider;
let host = initialConnection.host;
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
  () => activeModel,
  showAlert
);

const chat = createChat({
  elements,
  messageList,
  getHost: () => host,
  getProvider: () => provider,
  getActiveModel: () => activeModel,
  showAlert
});

async function verifyConnectionAndLoadModels(connectionProvider, connectionHost) {
  elements.ollamaStatusDot.className = 'inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse';
  elements.ollamaStatusText.textContent = 'Connecting...';
  elements.testStatusIcon.className = 'fa-solid fa-spinner animate-spin';
  elements.testConnectionBtn.disabled = true;

  try {
    const fetchModels = connectionProvider === 'llama.cpp' ? getLlamaCppModels : getModels;
    models = await fetchModels(connectionHost);
    renderModelsDropdown(models, elements.modelSelect, activeModel);

    elements.ollamaStatusDot.className = 'inline-block w-2 h-2 rounded-full bg-emerald-500';
    elements.ollamaStatusText.textContent = `Connected to ${connectionProvider}`;
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
        connectionProvider === 'llama.cpp'
          ? 'Your llama.cpp server is online, but it did not report any models. Check that the server was started with a model loaded.'
          : 'Your Ollama system is online, but no AI models are installed. Please run "ollama pull llama3" or "ollama pull deepseek-r1" in your terminal to fetch a model.'
      );
    }
  } catch (error) {
    console.error(`${connectionProvider} connect failed:`, error);
    elements.ollamaStatusDot.className = 'inline-block w-2 h-2 rounded-full bg-rose-500';
    elements.ollamaStatusText.textContent = 'Offline / Connection Error';
    elements.testStatusIcon.className = 'fa-solid fa-triangle-exclamation text-rose-400';
    elements.modelSelect.innerHTML = `<option value="">${connectionProvider} is offline</option>`;
    elements.activeModelTitle.textContent = `${connectionProvider} Unreachable`;

    showAlert(
      `${connectionProvider} Connection Error`,
      `Unable to connect to ${connectionProvider} server at ${connectionHost}.\n\n1. Make sure the server is active and running.\n2. Verify the host address.\n3. If the server runs on another device, check network permissions and CORS settings.`
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
  onReconnect: async (nextProvider, nextHost) => {
    provider = nextProvider;
    host = nextHost;
    activeModel = '';
    await verifyConnectionAndLoadModels(nextProvider, nextHost);
  },
  onClearChat: chat.clearCurrentChat
});

await verifyConnectionAndLoadModels(provider, host);
