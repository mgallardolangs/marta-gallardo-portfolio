import test from 'node:test';
import assert from 'node:assert/strict';

import * as contactForms from '../src/lib/contactForms.js';
import * as contactSwitcher from '../src/lib/contactSwitcher.ts';

const { initContactForms } = contactForms;

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
    values() {
      return [...classes];
    },
  };
}

function withEventTarget(target) {
  const listeners = new Map();

  Object.assign(target, {
    addEventListener(type, listener) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type, init = {}) {
      const event = {
        type,
        currentTarget: target,
        target,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...init,
      };

      for (const listener of listeners.get(type) ?? []) {
        listener.call(target, event);
      }

      return event;
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
  });

  return target;
}

class MockElement {
  constructor({ dataset = {}, id = '', role = '', hidden = false } = {}) {
    this.dataset = { ...dataset };
    this.id = id;
    this.role = role;
    this.hidden = hidden;
    this.tabIndex = -1;
    this.classList = createClassList(hidden ? ['hidden'] : []);
    this.attributes = new Map();

    if (id) this.attributes.set('id', id);
    if (role) this.attributes.set('role', role);

    withEventTarget(this);
  }

  setAttribute(name, value) {
    const normalized = String(value);
    this.attributes.set(name, normalized);
    if (name === 'aria-selected') this.ariaSelected = normalized;
    if (name === 'tabindex') this.tabIndex = Number(normalized);
    if (name === 'hidden') {
      this.hidden = true;
      this.classList.add('hidden');
    }
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'hidden') {
      this.hidden = false;
      this.classList.remove('hidden');
    }
  }

  getAttribute(name) {
    if (name === 'aria-selected') return this.ariaSelected ?? null;
    if (name === 'tabindex') return String(this.tabIndex);
    return this.attributes.get(name) ?? null;
  }

  focus(options) {
    this.focusCount = (this.focusCount ?? 0) + 1;
    this.lastFocusOptions = options;
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
    }
  }
}

class MockField extends MockElement {
  constructor() {
    super();
    this.validationMessage = '';
  }

  setCustomValidity(message) {
    this.validationMessage = message;
  }
}

class MockFormElement extends MockElement {
  constructor({ formName, fields = [], requiredFields = [] }) {
    super();
    this.formName = formName;
    this.fields = fields;
    this.requiredFields = requiredFields;
    this.dataset = {};
    this.submitCallCount = 0;
    this.parentElement = null;
  }

  querySelectorAll(selector) {
    return selector === '[required]' ? this.requiredFields : [];
  }

  checkValidity() {
    return true;
  }

  reportValidity() {}

  submit() {
    this.submitCallCount += 1;
  }
}

class MockRoot {
  constructor({ forms = [], tablists = [], tabs = [], panels = [] }) {
    this.forms = forms;
    this.tablists = tablists;
    this.tabs = tabs;
    this.panels = panels;
  }

  querySelectorAll(selector) {
    if (selector === '.contact-form') return this.forms;
    if (selector === '[data-contact-tablist]') return this.tablists;
    if (selector === '[role="tablist"]') return this.tablists;
    if (selector === '[data-contact-tab]') return this.tabs;
    if (selector === '[role="tab"]') return this.tabs;
    if (selector === '[data-contact-panel]') return this.panels;
    if (selector === '[role="tabpanel"]') return this.panels;
    return [];
  }

  querySelector(selector) {
    if (selector === '[data-contact-tablist]' || selector === '[role="tablist"]') {
      return this.tablists[0] ?? null;
    }

    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return [...this.tabs, ...this.panels].find((element) => element.id === id) ?? null;
    }

    const dataTabMatch = selector.match(/^\[data-contact-tab="(.+)"\]$/);
    if (dataTabMatch) {
      return this.tabs.find((tab) => tab.dataset.contactTab === dataTabMatch[1]) ?? null;
    }

    const dataPanelMatch = selector.match(/^\[data-contact-panel="(.+)"\]$/);
    if (dataPanelMatch) {
      return this.panels.find((panel) => panel.dataset.contactPanel === dataPanelMatch[1]) ?? null;
    }

    return this.querySelectorAll(selector)[0] ?? null;
  }
}

class MockTablistElement extends MockElement {
  constructor(tabs = []) {
    super({ dataset: { contactTablist: '' }, role: 'tablist' });
    this.tabs = tabs;
    this.setAttribute('data-contact-tablist', '');
  }

  querySelectorAll(selector) {
    if (selector === '[data-contact-tab]') return this.tabs;
    if (selector === '[role="tab"]') return this.tabs;
    return [];
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this.tabs.find((tab) => tab.id === id) ?? null;
    }

    const dataTabMatch = selector.match(/^\[data-contact-tab="(.+)"\]$/);
    if (dataTabMatch) {
      return this.tabs.find((tab) => tab.dataset.contactTab === dataTabMatch[1]) ?? null;
    }

    return this.querySelectorAll(selector)[0] ?? null;
  }
}

class MockButtonElement extends MockElement {
  constructor(tabId, controls) {
    super({ dataset: { contactTab: tabId }, id: `contact-tab-${tabId}`, role: 'tab' });
    this.setAttribute('data-contact-tab', tabId);
    this.setAttribute('aria-controls', controls);
  }
}

class MockPanelElement extends MockElement {
  constructor(panelId) {
    super({ dataset: { contactPanel: panelId }, id: `contact-panel-${panelId}`, role: 'tabpanel', hidden: panelId !== 'ugc' });
    this.setAttribute('data-contact-panel', panelId);
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

function createContactForm(formName) {
  const successMessage = new MockElement({ hidden: true });
  const submitButton = new MockElement();
  const documentState = { activeElement: submitButton };
  successMessage.ownerDocument = documentState;
  submitButton.ownerDocument = documentState;
  const form = new MockFormElement({
    formName,
    fields: [
      ['form-name', formName],
      ['Email', `${formName}@example.com`],
      ['Project Details', `Hello from ${formName}`],
    ],
    requiredFields: [new MockField(), new MockField()],
  });

  form.parentElement = {
    querySelector(selector) {
      return selector === '.contact-success' || selector === '[data-contact-success]' ? successMessage : null;
    },
  };

  return { form, successMessage, submitButton, documentState };
}

function createInquiryRoot() {
  const ugcTab = new MockButtonElement('ugc', 'contact-panel-ugc');
  const seoTab = new MockButtonElement('seo', 'contact-panel-seo');
  const tablist = new MockTablistElement([ugcTab, seoTab]);
  const ugcPanel = new MockPanelElement('ugc');
  const seoPanel = new MockPanelElement('seo');

  return {
    root: new MockRoot({
      tablists: [tablist],
      tabs: [ugcTab, seoTab],
      panels: [ugcPanel, seoPanel],
    }),
    tablist,
    tabs: { ugc: ugcTab, seo: seoTab },
    panels: { ugc: ugcPanel, seo: seoPanel },
  };
}

function createIntegratedContactRoot() {
  const inquiry = createInquiryRoot();
  const ugc = createContactForm('ugc-contact');
  const seo = createContactForm('seo-contact');

  return {
    root: new MockRoot({
      forms: [ugc.form, seo.form],
      tablists: [inquiry.tablist],
      tabs: Object.values(inquiry.tabs),
      panels: Object.values(inquiry.panels),
    }),
    tablist: inquiry.tablist,
    tabs: inquiry.tabs,
    panels: inquiry.panels,
    contacts: { ugc, seo },
  };
}

test('resolved non-ok contact submissions fall back to native submit instead of showing success', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalHTMLFormElement = globalThis.HTMLFormElement;
  const originalHTMLInputElement = globalThis.HTMLInputElement;
  const originalHTMLTextAreaElement = globalThis.HTMLTextAreaElement;
  const originalHTMLSelectElement = globalThis.HTMLSelectElement;
  const originalFormData = globalThis.FormData;

  globalThis.fetch = async () => ({ ok: false, status: 500 });
  globalThis.HTMLFormElement = MockFormElement;
  globalThis.HTMLInputElement = MockField;
  globalThis.HTMLTextAreaElement = MockField;
  globalThis.HTMLSelectElement = MockField;
  globalThis.FormData = MockFormData;

  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.HTMLFormElement = originalHTMLFormElement;
    globalThis.HTMLInputElement = originalHTMLInputElement;
    globalThis.HTMLTextAreaElement = originalHTMLTextAreaElement;
    globalThis.HTMLSelectElement = originalHTMLSelectElement;
    globalThis.FormData = originalFormData;
  });

  const { form, successMessage } = createContactForm('ugc-contact');
  const root = new MockRoot({ forms: [form] });

  initContactForms(root);

  const onSubmit = form.listenerCount('submit');
  assert.equal(onSubmit, 1);

  let prevented = false;
  await form.dispatch('submit', {
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(form.submitCallCount, 1);
  assert.equal(form.classList.contains('hidden'), false);
  assert.equal(successMessage.classList.contains('hidden'), true);
});

test('contact inquiry helper exports a pure two-tab keyboard contract', () => {
  assert.deepEqual(contactSwitcher.CONTACT_TAB_IDS, ['ugc', 'seo']);
  assert.equal(typeof contactSwitcher.getContactTabTargetIndex, 'function');
  assert.equal(typeof contactSwitcher.getContactPanelState, 'function');
  assert.equal(contactSwitcher.getContactTabTargetIndex(0, 'ArrowRight'), 1);
  assert.equal(contactSwitcher.getContactTabTargetIndex(1, 'ArrowRight'), 0);
  assert.equal(contactSwitcher.getContactTabTargetIndex(0, 'ArrowLeft'), 1);
  assert.equal(contactSwitcher.getContactTabTargetIndex(1, 'ArrowLeft'), 0);
  assert.equal(contactSwitcher.getContactTabTargetIndex(1, 'Home'), 0);
  assert.equal(contactSwitcher.getContactTabTargetIndex(0, 'End'), 1);
  assert.deepEqual(contactSwitcher.getContactPanelState('ugc', 'ugc'), { hidden: false });
  assert.deepEqual(contactSwitcher.getContactPanelState('ugc', 'seo'), { hidden: true });

  assert.deepEqual(contactForms.CONTACT_INQUIRY_TAB_IDS, ['ugc', 'seo']);
  assert.equal(typeof contactForms.getNextContactInquiryTabIndex, 'function');
  assert.equal(contactForms.getNextContactInquiryTabIndex(0, 'ArrowRight'), 1);
  assert.equal(contactForms.getNextContactInquiryTabIndex(1, 'ArrowRight'), 0);
  assert.equal(contactForms.getNextContactInquiryTabIndex(0, 'ArrowLeft'), 1);
  assert.equal(contactForms.getNextContactInquiryTabIndex(1, 'ArrowLeft'), 0);
  assert.equal(contactForms.getNextContactInquiryTabIndex(1, 'Home'), 0);
  assert.equal(contactForms.getNextContactInquiryTabIndex(0, 'End'), 1);
});

test('contact inquiry switcher keeps one visible panel, keyboard focus, and rerun-safe cleanup for public and admin roots', () => {
  assert.equal(typeof contactForms.initContactInquirySwitcher, 'function');

  const originalHTMLElement = globalThis.HTMLElement;
  const originalHTMLButtonElement = globalThis.HTMLButtonElement;

  globalThis.HTMLElement = MockElement;
  globalThis.HTMLButtonElement = MockButtonElement;

  try {
    const publicInquiry = createInquiryRoot();
    const adminInquiry = createInquiryRoot();

    const publicCleanup = contactForms.initContactInquirySwitcher(publicInquiry.root);
    const adminCleanup = contactForms.initContactInquirySwitcher(adminInquiry.root);

    assert.equal(typeof publicCleanup, 'function');
    assert.equal(typeof adminCleanup, 'function');

    assert.equal(publicInquiry.tabs.ugc.getAttribute('aria-selected'), 'true');
    assert.equal(publicInquiry.tabs.ugc.tabIndex, 0);
    assert.equal(publicInquiry.tabs.seo.getAttribute('aria-selected'), 'false');
    assert.equal(publicInquiry.tabs.seo.tabIndex, -1);
    assert.equal(publicInquiry.panels.ugc.hidden, false);
    assert.equal(publicInquiry.panels.seo.hidden, true);

    publicInquiry.tabs.seo.dispatch('click');
    assert.equal(publicInquiry.tabs.seo.getAttribute('aria-selected'), 'true');
    assert.equal(publicInquiry.tabs.seo.tabIndex, 0);
    assert.equal(publicInquiry.panels.seo.hidden, false);
    assert.equal(publicInquiry.panels.ugc.hidden, true);
    assert.equal(publicInquiry.tabs.seo.focusCount ?? 0, 0);

    const arrowEvent = adminInquiry.tabs.ugc.dispatch('keydown', { key: 'ArrowRight' });
    assert.equal(arrowEvent.defaultPrevented, true);
    assert.equal(adminInquiry.tabs.seo.getAttribute('aria-selected'), 'true');
    assert.equal(adminInquiry.tabs.seo.focusCount, 1);

    adminInquiry.tabs.seo.dispatch('keydown', { key: 'Home' });
    assert.equal(adminInquiry.tabs.ugc.getAttribute('aria-selected'), 'true');
    assert.equal(adminInquiry.tabs.ugc.focusCount, 1);

    contactForms.initContactInquirySwitcher(publicInquiry.root);
    publicInquiry.tabs.ugc.dispatch('keydown', { key: 'End' });
    assert.equal(publicInquiry.tabs.seo.focusCount, 1);

    publicCleanup();
    publicInquiry.tabs.ugc.dispatch('click');
    assert.equal(publicInquiry.tabs.seo.getAttribute('aria-selected'), 'true');
  } finally {
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.HTMLButtonElement = originalHTMLButtonElement;
  }
});

test('contact form init stays root-scoped across public and admin and success hides only the submitted panel', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalHTMLFormElement = globalThis.HTMLFormElement;
  const originalHTMLInputElement = globalThis.HTMLInputElement;
  const originalHTMLTextAreaElement = globalThis.HTMLTextAreaElement;
  const originalHTMLSelectElement = globalThis.HTMLSelectElement;
  const originalFormData = globalThis.FormData;

  globalThis.fetch = async () => ({ ok: true, status: 200 });
  globalThis.HTMLFormElement = MockFormElement;
  globalThis.HTMLInputElement = MockField;
  globalThis.HTMLTextAreaElement = MockField;
  globalThis.HTMLSelectElement = MockField;
  globalThis.FormData = MockFormData;

  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.HTMLFormElement = originalHTMLFormElement;
    globalThis.HTMLInputElement = originalHTMLInputElement;
    globalThis.HTMLTextAreaElement = originalHTMLTextAreaElement;
    globalThis.HTMLSelectElement = originalHTMLSelectElement;
    globalThis.FormData = originalFormData;
  });

  const publicContact = createContactForm('ugc-contact');
  const adminContact = createContactForm('seo-contact');

  const publicRoot = new MockRoot({ forms: [publicContact.form] });
  const adminRoot = new MockRoot({ forms: [adminContact.form] });

  initContactForms(publicRoot);
  initContactForms(adminRoot);

  assert.equal(publicContact.form.listenerCount('submit'), 1);
  assert.equal(adminContact.form.listenerCount('submit'), 1);

  await publicContact.form.dispatch('submit');

  assert.equal(publicContact.form.classList.contains('hidden'), true);
  assert.equal(publicContact.successMessage.classList.contains('hidden'), false);
  assert.equal(adminContact.form.classList.contains('hidden'), false);
  assert.equal(adminContact.successMessage.classList.contains('hidden'), true);
});

test('successful contact submission focuses only the submitted success panel and rerun init preserves success state', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalHTMLFormElement = globalThis.HTMLFormElement;
  const originalHTMLInputElement = globalThis.HTMLInputElement;
  const originalHTMLTextAreaElement = globalThis.HTMLTextAreaElement;
  const originalHTMLSelectElement = globalThis.HTMLSelectElement;
  const originalFormData = globalThis.FormData;

  globalThis.fetch = async () => ({ ok: true, status: 200 });
  globalThis.HTMLFormElement = MockFormElement;
  globalThis.HTMLInputElement = MockField;
  globalThis.HTMLTextAreaElement = MockField;
  globalThis.HTMLSelectElement = MockField;
  globalThis.FormData = MockFormData;

  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.HTMLFormElement = originalHTMLFormElement;
    globalThis.HTMLInputElement = originalHTMLInputElement;
    globalThis.HTMLTextAreaElement = originalHTMLTextAreaElement;
    globalThis.HTMLSelectElement = originalHTMLSelectElement;
    globalThis.FormData = originalFormData;
  });

  const integrated = createIntegratedContactRoot();
  integrated.contacts.ugc.submitButton.focus();

  initContactForms(integrated.root);
  await integrated.contacts.ugc.form.dispatch('submit');
  await Promise.resolve();

  assert.equal(integrated.contacts.ugc.form.classList.contains('hidden'), true);
  assert.equal(integrated.contacts.ugc.successMessage.classList.contains('hidden'), false);
  assert.equal(integrated.contacts.ugc.documentState.activeElement, integrated.contacts.ugc.successMessage);
  assert.equal(integrated.contacts.ugc.successMessage.focusCount, 1);
  assert.deepEqual(integrated.contacts.ugc.successMessage.lastFocusOptions, { preventScroll: false });
  assert.equal(integrated.contacts.seo.successMessage.focusCount ?? 0, 0);

  initContactForms(integrated.root);
  await Promise.resolve();

  assert.equal(integrated.contacts.ugc.form.classList.contains('hidden'), true);
  assert.equal(integrated.contacts.ugc.successMessage.classList.contains('hidden'), false);
  assert.equal(integrated.contacts.ugc.documentState.activeElement, integrated.contacts.ugc.successMessage);
  assert.equal(integrated.contacts.ugc.successMessage.focusCount, 1);
});

test('contact task1 keeps ugc success visible after switching to seo and back inside one shared contact desk root', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalHTMLElement = globalThis.HTMLElement;
  const originalHTMLButtonElement = globalThis.HTMLButtonElement;
  const originalHTMLFormElement = globalThis.HTMLFormElement;
  const originalHTMLInputElement = globalThis.HTMLInputElement;
  const originalHTMLTextAreaElement = globalThis.HTMLTextAreaElement;
  const originalHTMLSelectElement = globalThis.HTMLSelectElement;
  const originalFormData = globalThis.FormData;

  globalThis.fetch = async () => ({ ok: true, status: 200 });
  globalThis.HTMLElement = MockElement;
  globalThis.HTMLButtonElement = MockButtonElement;
  globalThis.HTMLFormElement = MockFormElement;
  globalThis.HTMLInputElement = MockField;
  globalThis.HTMLTextAreaElement = MockField;
  globalThis.HTMLSelectElement = MockField;
  globalThis.FormData = MockFormData;

  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.HTMLButtonElement = originalHTMLButtonElement;
    globalThis.HTMLFormElement = originalHTMLFormElement;
    globalThis.HTMLInputElement = originalHTMLInputElement;
    globalThis.HTMLTextAreaElement = originalHTMLTextAreaElement;
    globalThis.HTMLSelectElement = originalHTMLSelectElement;
    globalThis.FormData = originalFormData;
  });

  const integrated = createIntegratedContactRoot();

  contactForms.initContactInquirySwitcher(integrated.root);
  initContactForms(integrated.root);

  assert.equal(integrated.root.querySelector('[data-contact-tablist]'), integrated.tablist);
  assert.equal(integrated.root.querySelectorAll('[role="tabpanel"]').length, 2);
  assert.equal(integrated.root.querySelectorAll('.contact-form').length, 2);
  assert.equal(integrated.contacts.ugc.form.listenerCount('submit'), 1);
  assert.equal(integrated.contacts.seo.form.listenerCount('submit'), 1);

  await integrated.contacts.ugc.form.dispatch('submit');
  await Promise.resolve();

  assert.equal(integrated.contacts.ugc.form.classList.contains('hidden'), true);
  assert.equal(integrated.contacts.ugc.successMessage.classList.contains('hidden'), false);
  assert.equal(integrated.contacts.ugc.successMessage.focusCount, 1);
  assert.equal(integrated.contacts.seo.form.classList.contains('hidden'), false);
  assert.equal(integrated.contacts.seo.successMessage.classList.contains('hidden'), true);

  integrated.tabs.seo.dispatch('click');

  assert.equal(integrated.tabs.seo.getAttribute('aria-selected'), 'true');
  assert.equal(integrated.panels.seo.hidden, false);
  assert.equal(integrated.panels.ugc.hidden, true);
  assert.equal(integrated.contacts.seo.form.classList.contains('hidden'), false);
  assert.equal(integrated.contacts.seo.form.listenerCount('submit'), 1);
  assert.equal(integrated.contacts.ugc.successMessage.classList.contains('hidden'), false);
  assert.equal(integrated.contacts.ugc.successMessage.focusCount, 1);
  assert.equal(integrated.contacts.ugc.form.classList.contains('hidden'), true);

  integrated.tabs.ugc.dispatch('click');

  assert.equal(integrated.tabs.ugc.getAttribute('aria-selected'), 'true');
  assert.equal(integrated.panels.ugc.hidden, false);
  assert.equal(integrated.panels.seo.hidden, true);
  assert.equal(integrated.contacts.ugc.successMessage.classList.contains('hidden'), false);
  assert.equal(integrated.contacts.ugc.successMessage.focusCount, 1);
  assert.equal(integrated.contacts.ugc.form.classList.contains('hidden'), true);
});
