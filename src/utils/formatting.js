export function renderMarkdownAndHighlight(text, container) {
  if (!text) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = marked.parse(text);

  container.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);

    const pre = block.parentNode;
    if (pre && !pre.querySelector('.copy-code-btn')) {
      pre.className = 'relative group mt-3 mb-3';

      const button = document.createElement('button');
      button.className = 'copy-code-btn absolute top-2 right-2 bg-slate-800/95 hover:bg-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded text-[10px] flex items-center gap-1.5 transition-all border border-slate-700/50 opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-md';
      button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';

      button.onclick = async () => {
        try {
          await navigator.clipboard.writeText(block.innerText);
          button.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> Copied!';
          setTimeout(() => {
            button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
          }, 2000);
        } catch (error) {
          console.error('Unable to copy code block:', error);
        }
      };

      pre.appendChild(button);
    }
  });
}
