export const CONTACT_TAB_IDS = ['ugc', 'seo'] as const;
export const CONTACT_INQUIRY_TAB_IDS = [...CONTACT_TAB_IDS];

export type ContactTabId = (typeof CONTACT_TAB_IDS)[number];

type ContactRoot = {
  querySelector?: (selector: string) => unknown;
  querySelectorAll?: (selector: string) => Iterable<unknown>;
};

type ContactTabElement = {
  id?: string;
  dataset?: { contactTab?: string };
  tabIndex: number;
  focus: () => void;
  setAttribute: (name: string, value: string) => void;
  getAttribute?: (name: string) => string | null;
  addEventListener: (type: string, listener: (event: KeyboardEvent | MouseEvent) => void) => void;
  removeEventListener: (type: string, listener: (event: KeyboardEvent | MouseEvent) => void) => void;
};

type ContactPanelElement = {
  dataset?: { contactPanel?: string };
  hidden: boolean;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
};

const switcherRootCleanups = new WeakMap<object, () => void>();
const activeSwitcherCleanups = new Set<() => void>();

function getDefaultRoot() {
  return typeof document === 'undefined' ? undefined : document;
}

function isContactTabId(value: string | undefined): value is ContactTabId {
  return CONTACT_TAB_IDS.includes(value as ContactTabId);
}

function isInteractiveNode(value: unknown): value is ContactTabElement {
  return Boolean(value)
    && typeof value === 'object'
    && 'setAttribute' in value
    && 'addEventListener' in value
    && 'removeEventListener' in value
    && 'focus' in value;
}

function isPanelNode(value: unknown): value is ContactPanelElement {
  return Boolean(value)
    && typeof value === 'object'
    && 'setAttribute' in value
    && 'removeAttribute' in value;
}

function getTabRecord(root: ContactRoot, tablist: ContactRoot, tabId: ContactTabId) {
  const tab = tablist.querySelector?.(`[data-contact-tab="${tabId}"]`) ?? root.querySelector?.(`[data-contact-tab="${tabId}"]`);
  const panel = root.querySelector?.(`[data-contact-panel="${tabId}"]`);

  if (!isInteractiveNode(tab) || !isPanelNode(panel)) {
    return null;
  }

  return { tab, panel, tabId };
}

export function getContactTabTargetIndex(currentIndex: number, key: string) {
  switch (key) {
    case 'ArrowRight':
      return (currentIndex + 1) % CONTACT_TAB_IDS.length;
    case 'ArrowLeft':
      return (currentIndex - 1 + CONTACT_TAB_IDS.length) % CONTACT_TAB_IDS.length;
    case 'Home':
      return 0;
    case 'End':
      return CONTACT_TAB_IDS.length - 1;
    default:
      return currentIndex;
  }
}

export const getNextContactInquiryTabIndex = getContactTabTargetIndex;

export function getContactPanelState(activeTab: ContactTabId, panelId: ContactTabId) {
  return {
    hidden: activeTab !== panelId,
  };
}

export function cleanupContactInquirySwitcher(root = getDefaultRoot()) {
  if (!root || typeof root !== 'object') {
    return;
  }

  switcherRootCleanups.get(root)?.();
}

export function initContactInquirySwitcher(root = getDefaultRoot()) {
  if (!root || typeof root !== 'object' || typeof root.querySelectorAll !== 'function') {
    return () => undefined;
  }

  cleanupContactInquirySwitcher(root);

  const cleanupCallbacks: Array<() => void> = [];
  const tablists = Array.from(root.querySelectorAll('[data-contact-tablist]'));

  tablists.forEach((tablistNode) => {
    const tablist = tablistNode as ContactRoot & { setAttribute?: (name: string, value: string) => void };
    const records = CONTACT_TAB_IDS
      .map((tabId) => getTabRecord(root, tablist, tabId))
      .filter((record): record is NonNullable<typeof record> => record !== null);

    if (records.length !== CONTACT_TAB_IDS.length) {
      return;
    }

    tablist.setAttribute?.('role', 'tablist');

    const applyState = (activeTab: ContactTabId, shouldFocus = false) => {
      records.forEach(({ tab, panel, tabId }) => {
        const isActive = tabId === activeTab;
        const panelState = getContactPanelState(activeTab, tabId);

        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(isActive));
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
        tab.tabIndex = isActive ? 0 : -1;

        if (!tab.getAttribute?.('aria-controls') && panel.id) {
          tab.setAttribute('aria-controls', panel.id);
        }

        if (!tab.id && panel.dataset?.contactPanel) {
          tab.setAttribute('id', `contact-tab-${panel.dataset.contactPanel}`);
        }

        panel.setAttribute('role', 'tabpanel');

        const labelledBy = tab.id ?? `contact-tab-${tabId}`;
        panel.setAttribute('aria-labelledby', labelledBy);

        if (panelState.hidden) {
          panel.setAttribute('hidden', '');
          panel.hidden = true;
        } else {
          panel.removeAttribute('hidden');
          panel.hidden = false;
        }

        if (isActive && shouldFocus) {
          tab.focus();
        }
      });
    };

    records.forEach(({ tab, tabId }, index) => {
      const handleClick = () => {
        applyState(tabId);
      };
      const handleKeyDown = (event: KeyboardEvent) => {
        const targetIndex = getContactTabTargetIndex(index, event.key);

        if (targetIndex === index && !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          return;
        }

        const targetTabId = CONTACT_TAB_IDS[targetIndex];

        if (!targetTabId || !isContactTabId(targetTabId)) {
          return;
        }

        event.preventDefault();
        applyState(targetTabId, true);
      };

      tab.addEventListener('click', handleClick);
      tab.addEventListener('keydown', handleKeyDown);

      cleanupCallbacks.push(() => {
        tab.removeEventListener('click', handleClick);
        tab.removeEventListener('keydown', handleKeyDown);
      });
    });

    applyState('ugc');
  });

  const cleanupCurrentRoot = () => {
    cleanupCallbacks.forEach((callback) => callback());
    cleanupCallbacks.length = 0;
    switcherRootCleanups.delete(root);
    activeSwitcherCleanups.delete(cleanupCurrentRoot);
  };

  switcherRootCleanups.set(root, cleanupCurrentRoot);
  activeSwitcherCleanups.add(cleanupCurrentRoot);

  return () => cleanupContactInquirySwitcher(root);
}
