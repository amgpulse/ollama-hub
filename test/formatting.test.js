import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdownAndHighlight } from '../src/utils/formatting.js';

test('renderMarkdownAndHighlight renders markdown without code highlighting during stream', () => {
  let hljsCalled = false;
  globalThis.marked = {
    parse: (str) => `<pre><code>${str}</code></pre>`
  };
  globalThis.hljs = {
    highlightElement: () => {
      hljsCalled = true;
    }
  };

  const fakeElement = { innerHTML: '', querySelectorAll: () => [] };
  renderMarkdownAndHighlight('console.log("hello");', fakeElement, { highlightCode: false });

  assert.equal(fakeElement.innerHTML, '<pre><code>console.log("hello");</code></pre>');
  assert.equal(hljsCalled, false);

  delete globalThis.marked;
  delete globalThis.hljs;
});

test('renderMarkdownAndHighlight invokes hljs when highlightCode is true', () => {
  let highlightedCount = 0;
  const fakeCodeBlock = {
    parentNode: {
      querySelector: () => null,
      appendChild: () => {}
    }
  };

  globalThis.document = {
    createElement: () => ({
      classList: { add: () => {} },
      appendChild: () => {}
    })
  };
  globalThis.marked = {
    parse: (str) => `<pre><code>${str}</code></pre>`
  };
  globalThis.hljs = {
    highlightElement: () => {
      highlightedCount++;
    }
  };

  const fakeElement = {
    innerHTML: '',
    querySelectorAll: () => [fakeCodeBlock]
  };

  renderMarkdownAndHighlight('console.log("hello");', fakeElement, { highlightCode: true });

  assert.equal(highlightedCount, 1);

  delete globalThis.document;
  delete globalThis.marked;
  delete globalThis.hljs;
});
