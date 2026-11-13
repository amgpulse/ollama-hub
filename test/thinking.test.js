import test from 'node:test';
import assert from 'node:assert/strict';
import { parseThinking, formatThinkingMessage } from '../src/utils/thinking.js';

test('parseThinking handles text without thinking tags', () => {
  const result = parseThinking('Hello, how can I help you?');
  assert.deepEqual(result, {
    thinking: '',
    content: 'Hello, how can I help you?',
    isThinking: false
  });
});

test('parseThinking handles null or empty input', () => {
  assert.deepEqual(parseThinking(''), { thinking: '', content: '', isThinking: false });
  assert.deepEqual(parseThinking(null), { thinking: '', content: '', isThinking: false });
  assert.deepEqual(parseThinking(undefined), { thinking: '', content: '', isThinking: false });
});

test('parseThinking extracts completed <think> block', () => {
  const input = '<think>\nAnalyzing the user request...\nCalculating 2 + 2 = 4.\n</think>\nThe answer is 4.';
  const result = parseThinking(input);
  assert.deepEqual(result, {
    thinking: 'Analyzing the user request...\nCalculating 2 + 2 = 4.',
    content: 'The answer is 4.',
    isThinking: false
  });
});

test('parseThinking extracts open <think> block during streaming', () => {
  const input = '<think>\nAnalyzing step 1... Still thinking';
  const result = parseThinking(input);
  assert.deepEqual(result, {
    thinking: 'Analyzing step 1... Still thinking',
    content: '',
    isThinking: true
  });
});

test('parseThinking strips partial closing tag during stream', () => {
  const input = '<think>Analyzing problem</th';
  const result = parseThinking(input);
  assert.deepEqual(result, {
    thinking: 'Analyzing problem',
    content: '',
    isThinking: true
  });

  const input2 = '<think>Analyzing problem</think';
  const result2 = parseThinking(input2);
  assert.deepEqual(result2, {
    thinking: 'Analyzing problem',
    content: '',
    isThinking: true
  });
});

test('parseThinking supports <thought> tags as well as case-insensitivity', () => {
  const input = '<THOUGHT>\nMy reasoning...\n</THOUGHT>\nFinal result';
  const result = parseThinking(input);
  assert.deepEqual(result, {
    thinking: 'My reasoning...',
    content: 'Final result',
    isThinking: false
  });
});

test('formatThinkingMessage formats thinking and content properly', () => {
  assert.equal(
    formatThinkingMessage('Step 1: Check inputs', 'Success'),
    '<think>\nStep 1: Check inputs\n</think>\n\nSuccess'
  );
  assert.equal(
    formatThinkingMessage('', 'Just content'),
    'Just content'
  );
  assert.equal(
    formatThinkingMessage('Just thinking', ''),
    '<think>\nJust thinking\n</think>'
  );
});
