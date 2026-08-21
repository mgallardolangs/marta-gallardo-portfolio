const contactFormCleanups = new WeakMap();
const activeContactFormCleanups = new Set();

function cleanupContactForm(form) {
  contactFormCleanups.get(form)?.();
  contactFormCleanups.delete(form);
  delete form.dataset.contactFormInitialized;
}

function cleanupAllContactForms() {
  activeContactFormCleanups.forEach((cleanup) => cleanup());
  activeContactFormCleanups.clear();
}

function setCustomValidity(input, message) {
  input.setCustomValidity(message);
}

export function initContactForms(root = document) {
  cleanupAllContactForms();

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
        form.classList.add('hidden');
        form.parentElement?.querySelector('.contact-success')?.classList.remove('hidden');
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
      activeContactFormCleanups.delete(cleanup);
    };

    contactFormCleanups.set(form, cleanup);
    activeContactFormCleanups.add(cleanup);
  });
}
