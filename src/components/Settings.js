import { getSetting, setSetting } from '../utils/storage.js';
import { normalizeHost } from '../utils/validation.js';

export function initializeSettings(elements) {
  const provider = getSetting('provider', 'ollama') === 'llama.cpp' ? 'llama.cpp' : 'ollama';
  const configuredHost = provider === 'llama.cpp'
    ? window.__APP_CONFIG__?.llamaCppHost || 'http://127.0.0.1:8080'
    : window.__APP_CONFIG__?.ollamaHost || 'http://127.0.0.1:11434';
  const host = getSetting(`${provider}_host`, configuredHost);
  elements.providerSelect.value = provider;
  elements.hostUrlInput.value = host;
  elements.hostBadge.textContent = host;
  updateProviderLabels(elements, provider);

  const isDark = getSetting('theme', 'dark') !== 'light';
  document.documentElement.classList.toggle('dark', isDark);
  updateThemeToggle(elements.themeToggle, isDark);

  elements.systemPromptInput.value = getSetting('system_prompt');
  elements.tempInput.value = getSetting('temperature', '0.7');
  elements.tempVal.textContent = elements.tempInput.value;

  const isMobile = window.innerWidth < 768;
  elements.sidebar.classList.toggle('collapsed', isMobile);
  if (isMobile) {
    elements.mobileOverlay.classList.add('hidden');
  }

  return { provider, host };
}

export function setupSettings(elements, { onReconnect, onClearChat }) {
  let provider = elements.providerSelect.value;

  const toggleSidebar = () => {
    const isCollapsed = elements.sidebar.classList.toggle('collapsed');
    if (window.innerWidth < 768) {
      elements.mobileOverlay.classList.toggle('hidden', isCollapsed);
    }
  };

  elements.toggleSidebarBtn.addEventListener('click', toggleSidebar);
  elements.mobileOverlay.addEventListener('click', toggleSidebar);
  elements.newChatBtn.addEventListener('click', onClearChat);

  elements.providerSelect.addEventListener('change', async () => {
    provider = elements.providerSelect.value;
    setSetting('provider', provider);
    const configuredHost = provider === 'llama.cpp'
      ? window.__APP_CONFIG__?.llamaCppHost || 'http://127.0.0.1:8080'
      : window.__APP_CONFIG__?.ollamaHost || 'http://127.0.0.1:11434';
    const host = getSetting(`${provider}_host`, configuredHost);
    elements.hostUrlInput.value = host;
    elements.hostBadge.textContent = host;
    updateProviderLabels(elements, provider);
    await onReconnect(provider, host);
  });

  elements.testConnectionBtn.addEventListener('click', async () => {
    const host = normalizeHost(elements.hostUrlInput.value);
    if (!host) return;

    setSetting(`${provider}_host`, host);
    elements.hostBadge.textContent = host;
    await onReconnect(provider, host);
  });

  elements.systemPromptInput.addEventListener('input', (event) => {
    setSetting('system_prompt', event.target.value.trim());
  });
  elements.tempInput.addEventListener('input', (event) => {
    elements.tempVal.textContent = event.target.value;
    setSetting('temperature', event.target.value);
  });

  elements.themeToggle.addEventListener('click', () => {
    const isDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', isDark);
    setSetting('theme', isDark ? 'dark' : 'light');
    updateThemeToggle(elements.themeToggle, isDark);
  });

  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      elements.mobileOverlay.classList.add('hidden');
    } else if (!elements.sidebar.classList.contains('collapsed')) {
      elements.mobileOverlay.classList.remove('hidden');
    }
  });
}

function updateProviderLabels(elements, provider) {
  const isLlamaCpp = provider === 'llama.cpp';
  elements.hostUrlLabel.textContent = `${isLlamaCpp ? 'llama.cpp' : 'Ollama'} Server Host:`;
  elements.hostUrlInput.placeholder = isLlamaCpp
    ? 'http://127.0.0.1:8080'
    : 'http://127.0.0.1:11434';
  elements.modelSourceHint.textContent = isLlamaCpp
    ? 'Models are fetched from your llama.cpp server. Start it with the OpenAI-compatible API enabled.'
    : 'Models are fetched directly from your local Ollama daemon. Pull models using ollama pull <model> in your command line.';
}

function updateThemeToggle(button, isDark) {
  button.innerHTML = isDark
    ? '<i class="fa-solid fa-moon"></i>'
    : '<i class="fa-solid fa-sun"></i>';
  button.title = `Switch to ${isDark ? 'light' : 'dark'} mode`;
  button.setAttribute('aria-label', button.title);
  button.setAttribute('aria-pressed', String(isDark));
}
