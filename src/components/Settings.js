import { getSetting, setSetting } from '../utils/storage.js';
import { normalizeHost } from '../utils/validation.js';

export function initializeSettings(elements) {
  const host = getSetting('ollama_host', 'http://127.0.0.1:11434');
  elements.hostUrlInput.value = host;
  elements.hostBadge.textContent = host;

  elements.systemPromptInput.value = getSetting('system_prompt');
  elements.tempInput.value = getSetting('temperature', '0.7');
  elements.tempVal.textContent = elements.tempInput.value;

  const isMobile = window.innerWidth < 768;
  elements.sidebar.classList.toggle('collapsed', isMobile);
  if (isMobile) {
    elements.mobileOverlay.classList.add('hidden');
  }

  return host;
}

export function setupSettings(elements, { onReconnect, onClearChat }) {
  const toggleSidebar = () => {
    const isCollapsed = elements.sidebar.classList.toggle('collapsed');
    if (window.innerWidth < 768) {
      elements.mobileOverlay.classList.toggle('hidden', isCollapsed);
    }
  };

  elements.toggleSidebarBtn.addEventListener('click', toggleSidebar);
  elements.mobileOverlay.addEventListener('click', toggleSidebar);
  elements.newChatBtn.addEventListener('click', onClearChat);

  elements.testConnectionBtn.addEventListener('click', async () => {
    const host = normalizeHost(elements.hostUrlInput.value);
    if (!host) return;

    setSetting('ollama_host', host);
    elements.hostBadge.textContent = host;
    await onReconnect(host);
  });

  elements.systemPromptInput.addEventListener('input', (event) => {
    setSetting('system_prompt', event.target.value.trim());
  });
  elements.tempInput.addEventListener('input', (event) => {
    elements.tempVal.textContent = event.target.value;
    setSetting('temperature', event.target.value);
  });

  elements.themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    elements.themeToggle.innerHTML = isDark
      ? '<i class="fa-solid fa-moon"></i>'
      : '<i class="fa-solid fa-sun"></i>';
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
