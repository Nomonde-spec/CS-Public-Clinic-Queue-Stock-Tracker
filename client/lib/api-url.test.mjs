import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from './api-url.js';

test('uses configured API URL when provided', () => {
  assert.equal(resolveApiBaseUrl('https://api.example.com/', 'https://app.example.com'), 'https://api.example.com');
});

test('falls back to the current origin when no API URL is configured', () => {
  assert.equal(resolveApiBaseUrl('', 'https://app.example.com/'), 'https://app.example.com');
});

test('returns an empty string when neither value is available', () => {
  assert.equal(resolveApiBaseUrl('', ''), '');
});
