import { renderMarkdownAndHighlight } from '../utils/formatting.js';
import { parseThinking, formatThinkingMessage } from '../utils/thinking.js';

export function createMessageList(container, emptyState, getActiveModel, showAlert) {
  let closeOpenMenu = null;
  let nextCopyMenuId = 0;

  function createThinkingBlock(responseElement) {
    const panel = responseElement.parentElement;

    const blockContainer = document.createElement('div');
    blockContainer.className =
      'thinking-block hidden rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden my-2.5 transition-all text-xs';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className =
      'thinking-toggle w-full px-3.5 py-2 flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 transition-colors select-none text-left';
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.title = 'Toggle thinking process';

    const leftSide = document.createElement('div');
    leftSide.className = 'flex items-center gap-2 font-medium';

    const brainIcon = document.createElement('i');
    brainIcon.className = 'fa-solid fa-brain text-brand-400 text-xs';

    const statusLabel = document.createElement('span');
    statusLabel.className = 'thinking-label';
    statusLabel.textContent = 'Thinking...';

    const pulseDot = document.createElement('span');
    pulseDot.className = 'thinking-pulse inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse';

    leftSide.append(brainIcon, statusLabel, pulseDot);

    const rightSide = document.createElement('div');
    rightSide.className = 'flex items-center gap-2 text-slate-500 text-[11px] font-mono';

    const chevron = document.createElement('i');
    chevron.className = 'fa-solid fa-chevron-down thinking-chevron text-[10px] transition-transform duration-200';

    rightSide.append(chevron);
    toggleBtn.append(leftSide, rightSide);

    const contentArea = document.createElement('div');
    contentArea.className =
      'thinking-content px-3.5 py-2.5 text-slate-400/90 border-t border-slate-800/60 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words max-h-80 overflow-y-auto bg-slate-950/40 select-text';

    blockContainer.append(toggleBtn, contentArea);
    if (panel) {
      panel.insertBefore(blockContainer, responseElement);
    }

    let isExpanded = true;
    let userManuallyToggled = false;

    function setExpanded(expanded) {
      isExpanded = expanded;
      toggleBtn.setAttribute('aria-expanded', String(expanded));
      if (expanded) {
        contentArea.classList.remove('hidden');
        chevron.classList.remove('-rotate-90');
      } else {
        contentArea.classList.add('hidden');
        chevron.classList.add('-rotate-90');
      }
    }

    toggleBtn.addEventListener('click', () => {
      userManuallyToggled = true;
      setExpanded(!isExpanded);
    });

    return {
      element: blockContainer,
      contentElement: contentArea,
      show() {
        blockContainer.classList.remove('hidden');
      },
      update(text, elapsedSeconds) {
        blockContainer.classList.remove('hidden');
        contentArea.textContent = text;
        if (Number.isFinite(elapsedSeconds)) {
          statusLabel.textContent = `Thinking (${elapsedSeconds.toFixed(1)}s)...`;
        } else {
          statusLabel.textContent = 'Thinking...';
        }
        contentArea.scrollTop = contentArea.scrollHeight;
      },
      finish(durationSeconds) {
        pulseDot.classList.add('hidden');
        if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
          statusLabel.textContent = `Thought for ${durationSeconds.toFixed(1)}s`;
        } else {
          statusLabel.textContent = 'Thinking Process';
        }
        if (!userManuallyToggled) {
          setExpanded(false);
        }
      },
      getText() {
        return contentArea.textContent;
      },
      hasContent() {
        return !blockContainer.classList.contains('hidden') && contentArea.textContent.trim().length > 0;
      },
      setExpanded
    };
  }

  function append(role, content, isStreaming = false, initialThinking = '') {
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
      ? '<i class="fa-regular fa-user text-sm"></i>'
      : '<i class="fa-solid fa-robot text-sm"></i>';

    const panel = document.createElement('div');
    panel.className = 'flex-1 min-w-0 space-y-1.5 text-sm';

    const header = document.createElement('div');
    header.className = 'text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 select-none';
    header.innerHTML = isUser
      ? '<span>USER</span><i class="fa-regular fa-user text-[9px]"></i>'
      : `<span>ASSISTANT (${getActiveModel()})</span><i class="fa-solid fa-robot text-[9px] text-brand-400"></i>`;

    let displayContent = content;
    let thinkingText = initialThinking;

    if (!isUser && !thinkingText && displayContent) {
      const parsed = parseThinking(displayContent);
      if (parsed.thinking) {
        thinkingText = parsed.thinking;
        displayContent = parsed.content;
      }
    }

    const textBody = document.createElement('div');
    textBody.className = `prose prose-invert max-w-none text-sm break-words whitespace-pre-wrap ${isStreaming ? 'typing-cursor' : ''}`;
    if (isUser) {
      textBody.textContent = displayContent;
    } else {
      renderMarkdownAndHighlight(displayContent, textBody);
    }

    panel.append(header, textBody);
    wrapper.append(avatar, panel);
    container.appendChild(wrapper);

    if (!isUser && thinkingText) {
      const thinkingBlock = createThinkingBlock(textBody);
      thinkingBlock.update(thinkingText);
      thinkingBlock.finish();
      textBody._thinkingBlock = thinkingBlock;
    }

    scrollToBottom();
    return textBody;
  }

  function clear() {
    closeOpenMenu?.();
    container.replaceChildren(emptyState);
  }

  function addCopyButton(responseElement, content, thinkingText = '') {
    if (!content.trim() && !thinkingText.trim()) return;

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
      'hidden absolute left-0 top-full z-20 min-w-44 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-lg';
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
    if (thinkingText.trim()) {
      addMenuOption('With thinking process', formatThinkingMessage(thinkingText, content));
      addMenuOption('Thinking process only', thinkingText.trim());
    }
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

  function addOutputMetrics(responseElement) {
    const metadata = document.createElement('div');
    metadata.className = 'mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500';
    const speed = document.createElement('span');
    const count = document.createElement('span');
    speed.textContent = 'Average output speed: waiting for tokens...';
    count.textContent = 'Output tokens: waiting...';
    metadata.append(speed, count);
    responseElement.parentElement.appendChild(metadata);
    return { speed, count };
  }

  function updateOutputMetrics(metrics, tokensPerSecond, tokenCount, isEstimated) {
    if (Number.isFinite(tokensPerSecond) && tokensPerSecond >= 0) {
      const estimateLabel = isEstimated ? ' (estimated)' : '';
      metrics.speed.textContent = `Average output speed: ${tokensPerSecond.toFixed(1)} tokens/s${estimateLabel}`;
    }
    if (Number.isInteger(tokenCount) && tokenCount >= 0) {
      const estimatePrefix = isEstimated ? '~' : '';
      metrics.count.textContent = `Output tokens: ${estimatePrefix}${tokenCount}`;
    }
  }

  function scrollToBottom() {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }

  return {
    append,
    createThinkingBlock,
    addCopyButton,
    addOutputMetrics,
    updateOutputMetrics,
    clear,
    scrollToBottom
  };
}
