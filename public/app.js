// Global Memory-only State
let messages = [];
let models = [];
let activeModel = '';
let isGenerating = false;
let abortController = null;

// Default Ollama host, saved in localStorage for user convenience
let ollamaHost = localStorage.getItem('ollama_host') || 'http://127.0.0.1:11434';

// DOM References
const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobile-overlay');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const hostUrlInput = document.getElementById('host-url-input');
const testConnectionBtn = document.getElementById('test-connection-btn');
const testStatusIcon = document.getElementById('test-status-icon');
const themeToggle = document.getElementById('theme-toggle');
const modelSelect = document.getElementById('model-select');
const systemPromptInput = document.getElementById('system-prompt-input');
const tempInput = document.getElementById('temp-input');
const tempVal = document.getElementById('temp-val');
const activeModelTitle = document.getElementById('active-model-title');
const hostBadge = document.getElementById('host-badge');
const chatMessagesContainer = document.getElementById('chat-messages-container');
const emptyState = document.getElementById('empty-state');
const stopGenerationContainer = document.getElementById('stop-generation-container');
const stopGenerationBtn = document.getElementById('stop-generation-btn');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const alertModal = document.getElementById('alert-modal');
const alertTitle = document.getElementById('alert-title');
const alertMessage = document.getElementById('alert-message');
const alertCloseBtn = document.getElementById('alert-close-btn');
const ollamaStatusDot = document.getElementById('ollama-status-dot');
const ollamaStatusText = document.getElementById('ollama-status-text');

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  hostUrlInput.value = ollamaHost;
  hostBadge.textContent = ollamaHost;
  
  // Set system prompt default
  systemPromptInput.value = localStorage.getItem('system_prompt') || '';
  tempInput.value = localStorage.getItem('temperature') || '0.7';
  tempVal.textContent = tempInput.value;

  // Set initial sidebar state based on screen size
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    sidebar.classList.add('collapsed');
    mobileOverlay.classList.add('hidden');
  } else {
    sidebar.classList.remove('collapsed');
  }

  await verifyConnectionAndLoadModels();
});

// Event Listeners Setup
function setupEventListeners() {
  // Collapsible sidebar
  toggleSidebarBtn.addEventListener('click', toggleSidebar);
  closeSidebarBtn.addEventListener('click', toggleSidebar);
  mobileOverlay.addEventListener('click', toggleSidebar);

  // Clear current chat
  newChatBtn.addEventListener('click', clearCurrentChat);

  // Host modification & test connection
  testConnectionBtn.addEventListener('click', async () => {
    let rawHost = hostUrlInput.value.trim();
    if (!rawHost) return;
    
    // Add protocol prefix if missing
    if (!rawHost.startsWith('http://') && !rawHost.startsWith('https://')) {
      rawHost = 'http://' + rawHost;
    }
    // Remove trailing slash
    if (rawHost.endsWith('/')) {
      rawHost = rawHost.slice(0, -1);
    }
    
    ollamaHost = rawHost;
    localStorage.setItem('ollama_host', ollamaHost);
    hostBadge.textContent = ollamaHost;
    
    await verifyConnectionAndLoadModels();
  });

  // Model selection change
  modelSelect.addEventListener('change', (e) => {
    activeModel = e.target.value;
    activeModelTitle.textContent = activeModel || 'No Model Selected';
  });

  // System parameters changes
  systemPromptInput.addEventListener('input', (e) => {
    localStorage.setItem('system_prompt', e.target.value.trim());
  });
  tempInput.addEventListener('input', (e) => {
    tempVal.textContent = e.target.value;
    localStorage.setItem('temperature', e.target.value);
  });

  // Text inputs & send buttons
  chatInput.addEventListener('input', handleInputAutogrow);
  chatInput.addEventListener('keydown', handleInputKeydown);
  sendBtn.addEventListener('click', sendMessage);

  // Stop Generation
  stopGenerationBtn.addEventListener('click', stopGenerating);

  // Standard custom alert close
  alertCloseBtn.addEventListener('click', () => {
    alertModal.classList.add('hidden');
  });

  // Theme Toggle (Dark/Light Mode class)
  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
  });

  // Handle window resize for overlay reset
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      mobileOverlay.classList.add('hidden');
    } else if (!sidebar.classList.contains('collapsed')) {
      mobileOverlay.classList.remove('hidden');
    }
  });
}

// Toggle sidebar (collapsible on both desktop & mobile)
function toggleSidebar() {
  const isCollapsed = sidebar.classList.toggle('collapsed');
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    if (isCollapsed) {
      mobileOverlay.classList.add('hidden');
    } else {
      mobileOverlay.classList.remove('hidden');
    }
  }
}

// Custom Modal Alert displayer
function showAlert(title, message) {
  alertTitle.textContent = title;
  alertMessage.textContent = message;
  alertModal.classList.remove('hidden');
}

// Check local Ollama daemon status & load active models list
async function verifyConnectionAndLoadModels() {
  ollamaStatusDot.className = "inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse";
  ollamaStatusText.textContent = "Connecting...";
  testStatusIcon.className = "fa-solid fa-spinner animate-spin";
  testConnectionBtn.disabled = true;
  
  try {
    const response = await fetch(`${ollamaHost}/api/tags`);
    if (!response.ok) throw new Error('Unreachable');
    
    const data = await response.json();
    models = data.models || [];
    
    renderModelsDropdown();
    
    ollamaStatusDot.className = "inline-block w-2 h-2 rounded-full bg-emerald-500";
    ollamaStatusText.textContent = "Connected to Ollama";
    testStatusIcon.className = "fa-solid fa-circle-check text-emerald-400";
    
    // Auto-select first model if available
    if (models.length > 0) {
      if (!activeModel || !models.some(m => m.name === activeModel)) {
        activeModel = models[0].name;
      }
      modelSelect.value = activeModel;
      activeModelTitle.textContent = activeModel;
    } else {
      activeModelTitle.textContent = 'No models loaded';
      showAlert('No Models Found', 'Your Ollama system is online, but no AI models are installed. Please run "ollama pull llama3" or "ollama pull deepseek-r1" in your terminal to fetch a model.');
    }
  } catch (err) {
    console.error('Ollama connect failed:', err);
    ollamaStatusDot.className = "inline-block w-2 h-2 rounded-full bg-rose-500";
    ollamaStatusText.textContent = "Offline / Connection Error";
    testStatusIcon.className = "fa-solid fa-triangle-exclamation text-rose-400";
    
    modelSelect.innerHTML = '<option value="">Ollama is offline</option>';
    activeModelTitle.textContent = 'Ollama Unreachable';
    
    showAlert('Ollama Connection Error', `Unable to connect to Ollama server at ${ollamaHost}.\n\n1. Make sure Ollama application is active and running.\n2. Verify the host address.\n3. If Ollama runs on another device, check network permissions.`);
  } finally {
    testConnectionBtn.disabled = false;
  }
}

// Fill models selector dropdown list
function renderModelsDropdown() {
  if (models.length === 0) {
    modelSelect.innerHTML = '<option value="">No models found</option>';
    return;
  }
  
  modelSelect.innerHTML = models.map(m => {
    const sizeGB = (m.size / (1024 * 1024 * 1024)).toFixed(1);
    return `<option value="${m.name}" ${m.name === activeModel ? 'selected' : ''}>${m.name} (${sizeGB} GB)</option>`;
  }).join('');
}

// Clear current memory-only chat session
function clearCurrentChat() {
  if (messages.length === 0) return;
  if (!confirm('Are you sure you want to clear this active chat session? History will not be saved.')) return;
  
  messages = [];
  chatMessagesContainer.innerHTML = '';
  chatMessagesContainer.appendChild(emptyState);
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.disabled = true;
  
  // Close sidebar on mobile if it's open
  const isMobile = window.innerWidth < 768;
  if (isMobile && !sidebar.classList.contains('collapsed')) {
    toggleSidebar();
  }
}

// Message submission flow
async function sendMessage() {
  if (isGenerating) return;
  
  const text = chatInput.value.trim();
  if (!text) return;
  
  if (!activeModel) {
    showAlert('Select Model', 'Please select an LLM model before sending a message.');
    return;
  }

  // Hide template triggers
  if (messages.length === 0) {
    chatMessagesContainer.innerHTML = '';
  }

  // Save and render user message
  const userMsg = { role: 'user', content: text };
  messages.push(userMsg);
  appendMessageToDOM('user', text);
  
  // Clear textarea
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.disabled = true;
  
  // Prepare AI Response placeholder
  isGenerating = true;
  stopGenerationContainer.classList.remove('hidden');
  const responseElement = appendMessageToDOM('assistant', '', true);
  
  abortController = new AbortController();
  let assistantResponse = '';

  // Get current system instruction
  const currentSystemPrompt = systemPromptInput.value.trim();
  const requestMessages = [];
  if (currentSystemPrompt) {
    requestMessages.push({ role: 'system', content: currentSystemPrompt });
  }
  requestMessages.push(...messages);

  try {
    const response = await fetch(`${ollamaHost}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: activeModel,
        messages: requestMessages,
        options: {
          temperature: parseFloat(tempInput.value)
        },
        stream: true
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let partialLine = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: !done });
        const lines = (partialLine + chunk).split('\n');
        partialLine = lines.pop(); // buffer incomplete chunk

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message && parsed.message.content) {
              assistantResponse += parsed.message.content;
              renderMarkdownAndHighlight(assistantResponse, responseElement);
              scrollToBottom();
            }
          } catch (err) {
            console.warn('NDJSON Parse warning:', line, err);
          }
        }
      }
    }

    // Save final AI response to state
    messages.push({ role: 'assistant', content: assistantResponse });

  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Stream generation aborted by user.');
      if (assistantResponse.trim()) {
        messages.push({ role: 'assistant', content: assistantResponse + ' [Generation stopped by user]' });
      }
    } else {
      console.error(err);
      responseElement.innerHTML = `<span class="text-rose-500 font-bold flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation"></i> Error communicating with Ollama: ${err.message}</span>`;
      messages.push({ role: 'assistant', content: `Error: ${err.message}` });
    }
  } finally {
    isGenerating = false;
    responseElement.classList.remove('typing-cursor');
    stopGenerationContainer.classList.add('hidden');
    abortController = null;
    scrollToBottom();
  }
}

// Stop generation signal
function stopGenerating() {
  if (abortController) {
    abortController.abort();
  }
}

// Append messages directly to the chat log
function appendMessageToDOM(role, content, isStreaming = false) {
  const isUser = role === 'user';
  
  const msgWrapper = document.createElement('div');
  msgWrapper.className = `flex gap-4 p-4 rounded-2xl transition-all ${
    isUser ? 'bg-slate-900/40 border border-slate-900' : 'bg-slate-900/90 border border-slate-800'
  }`;
  
  // Avatar
  const avatar = document.createElement('div');
  avatar.className = `w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md ${
    isUser 
      ? 'bg-gradient-to-tr from-brand-700 to-indigo-600 text-white' 
      : 'bg-gradient-to-tr from-indigo-950 to-slate-900 text-brand-400 border border-brand-500/20'
  }`;
  avatar.innerHTML = isUser ? '<i class="fa-solid fa-user text-sm"></i>' : '<i class="fa-solid fa-robot text-sm"></i>';
  
  // Content panel
  const panel = document.createElement('div');
  panel.className = "flex-1 min-w-0 space-y-1.5 text-sm";
  
  const header = document.createElement('div');
  header.className = "text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 select-none";
  header.innerHTML = isUser 
    ? '<span>USER</span><i class="fa-regular fa-user text-[9px]"></i>' 
    : `<span>ASSISTANT (${activeModel})</span><i class="fa-solid fa-robot text-[9px] text-brand-400"></i>`;
  
  const textBody = document.createElement('div');
  textBody.className = `prose prose-invert max-w-none text-sm break-words whitespace-pre-wrap ${isStreaming ? 'typing-cursor' : ''}`;
  
  if (isUser) {
    textBody.textContent = content;
  } else {
    renderMarkdownAndHighlight(content, textBody);
  }
  
  panel.appendChild(header);
  panel.appendChild(textBody);
  msgWrapper.appendChild(avatar);
  msgWrapper.appendChild(panel);
  
  chatMessagesContainer.appendChild(msgWrapper);
  scrollToBottom();
  
  return textBody;
}

// Parse markdown & integrate highlight tags & Copy trigger buttons
function renderMarkdownAndHighlight(text, container) {
  if (!text) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = marked.parse(text);
  
  container.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
    
    // Add beautiful hoverable Copy buttons to each code section
    const pre = block.parentNode;
    if (pre && !pre.querySelector('.copy-code-btn')) {
      pre.className = 'relative group mt-3 mb-3';
      
      const btn = document.createElement('button');
      btn.className = 'copy-code-btn absolute top-2 right-2 bg-slate-800/95 hover:bg-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded text-[10px] flex items-center gap-1.5 transition-all border border-slate-700/50 opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-md';
      btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
      
      btn.onclick = () => {
        navigator.clipboard.writeText(block.innerText);
        btn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> Copied!';
        setTimeout(() => {
          btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
        }, 2000);
      };
      
      pre.appendChild(btn);
    }
  });
}

// suggestion templates triggers
function handleSuggestion(promptText) {
  if (isGenerating) return;
  chatInput.value = promptText;
  handleInputAutogrow();
  sendMessage();
}

// Input autogrow height handler
function handleInputAutogrow() {
  chatInput.style.height = 'auto';
  chatInput.style.height = (chatInput.scrollHeight) + 'px';
  sendBtn.disabled = chatInput.value.trim() === '';
}

// Keyboard shortcuts (Enter sends, Shift+Enter newline)
function handleInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled && !isGenerating) {
      sendMessage();
    }
  }
}

// Autoscroll message viewport
function scrollToBottom() {
  chatMessagesContainer.scrollTo({
    top: chatMessagesContainer.scrollHeight,
    behavior: 'smooth'
  });
}
