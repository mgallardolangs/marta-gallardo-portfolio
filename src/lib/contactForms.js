export {
  CONTACT_INQUIRY_TAB_IDS,
  CONTACT_TAB_IDS,
  cleanupContactInquirySwitcher,
  getContactPanelState,
  getContactTabTargetIndex,
  getNextContactInquiryTabIndex,
  initContactInquirySwitcher,
} from './contactSwitcher.ts';

const contactFormCleanups = new WeakMap();
const contactFormRootCleanups = new WeakMap();
const CONTACT_SUCCESS_SELECTOR = '[data-contact-success]';

function cleanupContactForm(form) {
  contactFormCleanups.get(form)?.();
  contactFormCleanups.delete(form);
  delete form.dataset.contactFormInitialized;
}

function getDefaultRoot() {
  return typeof document === 'undefined' ? undefined : document;
}

export function cleanupContactForms(root = getDefaultRoot()) {
  if (!root || typeof root !== 'object') {
    return;
  }

  contactFormRootCleanups.get(root)?.();
}

function setCustomValidity(input, message) {
  input.setCustomValidity(message);
}

export function initContactForms(root = getDefaultRoot()) {
  if (!root || typeof root !== 'object' || typeof root.querySelectorAll !== 'function') {
    return () => undefined;
  }

  cleanupContactForms(root);

  const rootCleanups = [];

  root.querySelectorAll('.contact-form').forEach((form) => {
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    cleanupContactForm(form);

    const cleanupCallbacks = [];
    const errorMsg = form.getAttribute('data-error-msg') ?? '';

    if (errorMsg) {
      form.querySelectorAll('[required]').forEach((field) => {
        if (
          !(field instanceof HTMLInputElement)
          && !(field instanceof HTMLTextAreaElement)
          && !(field instanceof HTMLSelectElement)
        ) {
          return;
        }

        setCustomValidity(field, '');

        const onInvalid = () => {
          setCustomValidity(field, errorMsg);
        };
        const onInput = () => {
          setCustomValidity(field, '');
        };

        field.addEventListener('invalid', onInvalid);
        field.addEventListener('input', onInput);
        cleanupCallbacks.push(() => {
          field.removeEventListener('invalid', onInvalid);
          field.removeEventListener('input', onInput);
        });
      });
    }

    const onSubmit = async (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = new FormData(form);

      try {
        const response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data).toString(),
        });
        if (!response.ok) {
          form.submit();
          return;
        }

        const success = form.parentElement?.querySelector(CONTACT_SUCCESS_SELECTOR);
        form.classList.add('hidden');
        success?.classList.remove('hidden');
        queueMicrotask(() => {
          success?.focus?.({ preventScroll: false });
        });
      } catch {
        form.submit();
      }
    };

    form.addEventListener('submit', onSubmit);
    cleanupCallbacks.push(() => {
      form.removeEventListener('submit', onSubmit);
    });

    form.dataset.contactFormInitialized = 'true';
    const cleanup = () => {
      cleanupCallbacks.forEach((callback) => callback());
      delete form.dataset.contactFormInitialized;
    };

    contactFormCleanups.set(form, cleanup);
    rootCleanups.push(() => cleanupContactForm(form));
  });

  const cleanupRoot = () => {
    rootCleanups.forEach((cleanup) => cleanup());
    contactFormRootCleanups.delete(root);
  };

  contactFormRootCleanups.set(root, cleanupRoot);

  return () => cleanupContactForms(root);
}
