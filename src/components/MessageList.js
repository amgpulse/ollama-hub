import { renderMarkdownAndHighlight } from '../utils/formatting.js';

export function createMessageList(container, emptyState, getActiveModel, showAlert) {
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
    container.replaceChildren(emptyState);
  }

  function addCopyButton(responseElement, content) {
    if (!content.trim()) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      'mt-2 px-2 py-1 rounded text-[10px] flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500';
    button.setAttribute('aria-label', 'Copy response');
    button.innerHTML = '<i class="fa-regular fa-copy"></i><span>Copy response</span>';

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(content);
        button.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i><span>Copied!</span>';
        setTimeout(() => {
          button.innerHTML = '<i class="fa-regular fa-copy"></i><span>Copy response</span>';
        }, 2000);
      } catch (error) {
        console.error('Unable to copy response:', error);
        showAlert('Copy Failed', 'Unable to copy the response to the clipboard.');
      }
    });

    responseElement.parentElement.appendChild(button);
  }

  function scrollToBottom() {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }

  return { append, addCopyButton, clear, scrollToBottom };
}
