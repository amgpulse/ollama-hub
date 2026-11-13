import test from 'node:test';
import assert from 'node:assert/strict';
import { createMessageList } from '../src/components/MessageList.js';

function createMockElement(tag = 'div') {
  const children = [];
  const classListSet = new Set();
  const attributes = {};
  const listeners = {};

  return {
    tagName: tag.toUpperCase(),
    parentElement: null,
    children,
    style: {},
    innerHTML: '',
    textContent: '',
    className: '',
    classList: {
      add(...cls) {
        cls.forEach((c) => classListSet.add(c));
      },
      remove(...cls) {
        cls.forEach((c) => classListSet.delete(c));
      },
      contains(c) {
        return classListSet.has(c);
      },
      toggle(c, force) {
        if (force === undefined) {
          if (classListSet.has(c)) {
            classListSet.delete(c);
            return false;
          }
          classListSet.add(c);
          return true;
        }
        if (force) classListSet.add(c);
        else classListSet.delete(c);
        return force;
      }
    },
    setAttribute(key, val) {
      attributes[key] = String(val);
    },
    getAttribute(key) {
      return attributes[key];
    },
    appendChild(child) {
      child.parentElement = this;
      children.push(child);
      return child;
    },
    append(...newChildren) {
      newChildren.forEach((child) => this.appendChild(child));
    },
    insertBefore(newChild, refChild) {
      newChild.parentElement = this;
      const idx = children.indexOf(refChild);
      if (idx === -1) children.push(newChild);
      else children.splice(idx, 0, newChild);
      return newChild;
    },
    replaceChildren(...newChildren) {
      children.length = 0;
      newChildren.forEach((child) => this.appendChild(child));
    },
    addEventListener(event, fn) {
      listeners[event] = fn;
    },
    trigger(event, eventObj = {}) {
      if (listeners[event]) listeners[event](eventObj);
    },
    scrollTo() {},
    querySelectorAll() {
      return [];
    }
  };
}

test('createThinkingBlock creates and updates thinking state', () => {
  const originalDoc = globalThis.document;
  globalThis.document = {
    createElement: (tag) => createMockElement(tag)
  };

  try {
    const container = createMockElement('div');
    const emptyState = createMockElement('div');
    const messageList = createMessageList(container, emptyState, () => 'deepseek-r1', () => {});

    const responseElement = messageList.append('assistant', '', true);
    const thinkingBlock = messageList.createThinkingBlock(responseElement);

    assert.equal(thinkingBlock.hasContent(), false);

    thinkingBlock.update('Analyzing the math logic...', 1.5);
    assert.equal(thinkingBlock.hasContent(), true);
    assert.equal(thinkingBlock.getText(), 'Analyzing the math logic...');

    thinkingBlock.finish(2.3);
    assert.equal(thinkingBlock.getText(), 'Analyzing the math logic...');
  } finally {
    globalThis.document = originalDoc;
  }
});

test('append parses and displays thinking for completed messages with <think> tag', () => {
  const originalDoc = globalThis.document;
  globalThis.document = {
    createElement: (tag) => createMockElement(tag)
  };

  try {
    const container = createMockElement('div');
    const emptyState = createMockElement('div');
    const messageList = createMessageList(container, emptyState, () => 'deepseek-r1', () => {});

    const responseElement = messageList.append(
      'assistant',
      '<think>Let me figure this out.</think>The result is 42.'
    );

    assert.ok(responseElement._thinkingBlock);
    assert.equal(responseElement._thinkingBlock.getText(), 'Let me figure this out.');
  } finally {
    globalThis.document = originalDoc;
  }
});
