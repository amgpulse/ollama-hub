import { renderMarkdownAndHighlight } from '../utils/formatting.js';

export function createMessageList(container, emptyState, getActiveModel, showAlert) {
  let closeOpenMenu = null;
  let nextCopyMenuId = 0;

  function append(role, content, isStreaming = false) {
    const isUser = role === 'user';
    const wrapper = document.createElement('div');
    wrapper.className = `flex gap-4 p-4 rounded-2xl transition-all ${
      isUser ? 'bg-slate-900/40 border border-slate-900' : 'bg-slate-900/90 border border-slate-800'
    }`;

    const avatar = document.createElement('div');
    avatar.className = `w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md ${
      isUser
        ? 'bg-gradient-to-tr from-brand-700 to-indigo-600 text-white'
        : 'bg-gradient-to-tr from-indigo-950 to-slate-900 text-brand-400 border border-brand-500/20'
    }`;
    avatar.innerHTML = isUser
      ? '<i class="fa-solid fa-user text-sm"></i>'
      : '<i class="fa-solid fa-robot text-sm"></i>';

    const panel = document.createElement('div');
    panel.className = 'flex-1 min-w-0 space-y-1.5 text-sm';

    const header = document.createElement('div');
    header.className = 'text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 select-none';
    header.innerHTML = isUser
      ? '<span>USER</span><i class="fa-regular fa-user text-[9px]"></i>'
      : `<span>ASSISTANT (${getActiveModel()})</span><i class="fa-solid fa-robot text-[9px] text-brand-400"></i>`;

    const textBody = document.createElement('div');
    textBody.className = `prose prose-invert max-w-none text-sm break-words whitespace-pre-wrap ${isStreaming ? 'typing-cursor' : ''}`;
    if (isUser) {
      textBody.textContent = content;
    } else {
      renderMarkdownAndHighlight(content, textBody);
    }

    panel.append(header, textBody);
    wrapper.append(avatar, panel);
    container.appendChild(wrapper);
    scrollToBottom();
    return textBody;
  }

  function clear() {
    closeOpenMenu?.();
    container.replaceChildren(emptyState);
  }

  function addCopyButton(responseElement, content) {
    if (!content.trim()) return;

    const copyControl = document.createElement('div');
    copyControl.className = 'relative inline-flex';

    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      'mt-2 p-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500';
    button.setAttribute('aria-label', 'Copy response');
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.title = 'Copy response';
    button.innerHTML = '<i class="fa-regular fa-copy"></i>';

    const menu = document.createElement('div');
    menu.id = `response-copy-menu-${nextCopyMenuId++}`;
    menu.className =
      'hidden absolute left-0 top-full z-20 min-w-40 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-lg';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Copy response as');
    button.setAttribute('aria-controls', menu.id);

    let copiedTimeout;

    async function copyResponse(text) {
      try {
        await navigator.clipboard.writeText(text);
        button.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i>';
        button.title = 'Copied!';
        clearTimeout(copiedTimeout);
        copiedTimeout = setTimeout(() => {
          button.innerHTML = '<i class="fa-regular fa-copy"></i>';
          button.title = 'Copy response';
        }, 2000);
      } catch (error) {
        console.error('Unable to copy response:', error);
        showAlert('Copy Failed', 'Unable to copy the response to the clipboard.');
      }
    }

    function closeMenu() {
      menu.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeydown);
      if (closeOpenMenu === closeMenu) closeOpenMenu = null;
    }

    function handleOutsideClick(event) {
      if (!copyControl.contains(event.target)) closeMenu();
    }

    function handleKeydown(event) {
      if (event.key === 'Escape') {
        closeMenu();
        button.focus();
      }
    }

    function addMenuOption(label, text) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className =
        'block w-full rounded px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none';
      option.textContent = label;
      option.setAttribute('role', 'menuitem');
      option.addEventListener('click', async () => {
        closeMenu();
        await copyResponse(text);
      });
      menu.appendChild(option);
    }

    addMenuOption('Markdown', content);
    const plainTextResponse = responseElement.cloneNode(true);
    plainTextResponse.querySelectorAll('button').forEach((copyButton) => copyButton.remove());
    addMenuOption('Plain text', plainTextResponse.innerText);

    button.addEventListener('click', () => {
      if (!menu.classList.contains('hidden')) {
        closeMenu();
        return;
      }

      closeOpenMenu?.();
      closeOpenMenu = closeMenu;
      menu.classList.remove('hidden');
      button.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleKeydown);
    });

    copyControl.append(button, menu);
    responseElement.parentElement.appendChild(copyControl);
  }

  function addTokenCount(responseElement, tokenCount) {
    if (!Number.isInteger(tokenCount) || tokenCount < 0) return;

    const metadata = document.createElement('div');
    metadata.className = 'mt-2 text-xs text-slate-500';
    metadata.textContent = `Output tokens: ${tokenCount}`;
    responseElement.parentElement.appendChild(metadata);
  }

  function scrollToBottom() {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }

  return { append, addCopyButton, addTokenCount, clear, scrollToBottom };
}
