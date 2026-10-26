/**
 * Scoped read-only DOM text extraction.
 * Adapted from Jan T. Müller's Firewatch commit 3bb6ce03423e454ca752b3ec6974b01fe245409d,
 * reimplemented on the current Mozilla WebDriver BiDi and declarative tool-module API.
 */
import type { Script } from 'webdriver-bidi-protocol';
import { successResponse } from '../utils/response-helpers.js';
import { remoteValueToNative } from '../utils/remote-value.js';
import { defineModule, defineToolHandler, type ToolDefinition } from './module.js';
import type { McpToolResponse } from '../types/common.js';

const MAX_CHARS = 20_000;
export const extractTextTool = {
  name: 'extract_text',
  description: 'Read text from the page, a CSS selector, or an existing snapshot UID. No page mutation.',
  annotations: { readOnlyHint: true },
  inputSchema: {
    type: 'object',
    properties: {
      scope: { type: 'string', enum: ['page','selector','uid'], description: 'Default: page.' },
      selector: { type: 'string', description: 'Required with scope=selector.' },
      uid: { type: 'string', description: 'Snapshot UID, required with scope=uid.' },
      source: { type: 'string', enum: ['rendered','dom'], description: 'Rendered innerText (default), or textContent.' },
      maxLength: { type: 'integer', description: 'Characters (1..20000), default 20000.' },
    },
  },
} satisfies ToolDefinition;

export const handleExtractText = defineToolHandler(async (args: unknown): Promise<McpToolResponse> => {
  const value = (args ?? {}) as Record<string, unknown>;
  const scope = value.scope ?? 'page';
  const source = value.source ?? 'rendered';
  const maxLength = value.maxLength ?? MAX_CHARS;
  if (!['page','selector','uid'].includes(scope as string)) throw new Error('Invalid scope');
  if (!['rendered','dom'].includes(source as string)) throw new Error('Invalid text source');
  if (typeof maxLength !== 'number' || !Number.isInteger(maxLength) || maxLength < 1 || maxLength > MAX_CHARS) {
    throw new Error('maxLength must be an integer from 1 through 20000');
  }
  if (scope === 'selector' && (typeof value.selector !== 'string' || !value.selector.trim())) {
    throw new Error('selector is required for scope=selector');
  }
  if (scope === 'uid' && (typeof value.uid !== 'string' || !value.uid.trim())) {
    throw new Error('uid is required for scope=uid');
  }
  const { getFirefox } = await import('../index.js');
  const firefox = await getFirefox();
  const context = firefox.getCurrentContextId();
  if (!context) throw new Error('No active browsing context');
  const uidElement: Script.LocalValue =
    scope === 'uid' ? await firefox.resolveUidToElement(value.uid as string) : { type: 'null' };
  const params: Script.LocalValue[] = [
    { type: 'string', value: scope as string },
    { type: 'string', value: (value.selector as string | undefined) ?? '' },
    { type: 'string', value: source as string },
    uidElement,
  ];
  // Fixed source: only typed values cross into the page. No user-provided JavaScript.
  const functionDeclaration = `(scope, selector, source, uidElement) => {
    const node = scope === 'uid' ? uidElement :
      scope === 'selector' ? document.querySelector(selector) :
      (document.body || document.documentElement);
    if (!node) throw new Error('No element found for the requested text scope');
    const rendered = node instanceof HTMLElement ? node.innerText : node.textContent;
    const text = source === 'dom' ? node.textContent : rendered;
    return String(text ?? '').replace(/\\r\\n?/g,'\\n');
  }`;
  const result = await firefox.sendBiDiCommand('script.callFunction', {
    functionDeclaration, arguments: params, awaitPromise: false, target: { context },
  });
  if (result.type !== 'success') throw new Error('Text extraction failed: ' + result.exceptionDetails.text);
  const extracted = remoteValueToNative(result.result);
  if (typeof extracted !== 'string') throw new Error('Expected string text result');
  const truncated = extracted.length > maxLength;
  return successResponse(`Extracted text [scope=${scope} source=${source} length=${extracted.length}${truncated ? ' truncated=true' : ''}]\n\n` +
    extracted.slice(0,maxLength) + (truncated ? '\n\n[... truncated]' : ''));
});

export const module = defineModule({
  name: 'text-extraction',
  description: 'Bounded, targeted, read-only DOM text extraction adapted from Firewatch.',
  tools: [[extractTextTool, handleExtractText]],
});
