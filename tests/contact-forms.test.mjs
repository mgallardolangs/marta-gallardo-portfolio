import test from 'node:test';
import assert from 'node:assert/strict';

import { initContactForms } from '../src/lib/contactForms.js';

function createClassList(initialClasses = []) {
  const classes = new Set(initialClasses);

  return {
    add(...tokens) {
      tokens.forEach((token) => classes.add(token));
    },
    remove(...tokens) {
      tokens.forEach((token) => classes.delete(token));
    },
    contains(token) {
      return classes.has(token);
    },
  };
}

test('resolved non-ok contact submissions fall back to native submit instead of showing success', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalHTMLFormElement = globalThis.HTMLFormElement;
  const originalHTMLInputElement = globalThis.HTMLInputElement;
  const originalHTMLTextAreaElement = globalThis.HTMLTextAreaElement;
  const originalHTMLSelectElement = globalThis.HTMLSelectElement;
  const originalFormData = globalThis.FormData;

  const successMessage = { classList: createClassList(['hidden']) };

  class MockFormElement {
    constructor() {
      this.attributes = new Map();
      this.classList = createClassList();
      this.dataset = {};
      this.fields = [
        ['form-name', 'ugc-contact'],
        ['name', 'Ada Lovelace'],
        ['email', 'ada@example.com'],
        ['message', 'Hola'],
      ];
      this.parentElement = {
        querySelector: (selector) => (selector === '.contact-success' ? successMessage : null),
      };
      this.listeners = new Map();
      this.submitCallCount = 0;
    }

    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    }

    querySelectorAll() {
      return [];
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    removeEventListener(type, listener) {
      if (this.listeners.get(type) === listener) {
        this.listeners.delete(type);
      }
    }

    checkValidity() {
      return true;
    }

    reportValidity() {}

    submit() {
      this.submitCallCount += 1;
    }
  }

  class MockFormData {
    constructor(form) {
      this.form = form;
    }

    *[Symbol.iterator]() {
      yield* this.form.fields;
    }
  }

  globalThis.fetch = async () => ({ ok: false, status: 500 });
  globalThis.HTMLFormElement = MockFormElement;
  globalThis.HTMLInputElement = class {};
  globalThis.HTMLTextAreaElement = class {};
  globalThis.HTMLSelectElement = class {};
  globalThis.FormData = MockFormData;

  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.HTMLFormElement = originalHTMLFormElement;
    globalThis.HTMLInputElement = originalHTMLInputElement;
    globalThis.HTMLTextAreaElement = originalHTMLTextAreaElement;
    globalThis.HTMLSelectElement = originalHTMLSelectElement;
    globalThis.FormData = originalFormData;
  });

  const form = new MockFormElement();
  const root = {
    querySelectorAll: (selector) => (selector === '.contact-form' ? [form] : []),
  };

  initContactForms(root);

  const onSubmit = form.listeners.get('submit');
  assert.equal(typeof onSubmit, 'function');

  let prevented = false;
  await onSubmit({
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(form.submitCallCount, 1);
  assert.equal(form.classList.contains('hidden'), false);
  assert.equal(successMessage.classList.contains('hidden'), true);
});
