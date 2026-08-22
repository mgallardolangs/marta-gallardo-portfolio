export const ROOT_SELECTOR = '[data-typed-title]';
export const VISUAL_SELECTOR = '[data-typed-title-visual]';

export interface TypedTitleVisual {
  textContent: string | null;
}

export interface TypedTitleRoot {
  dataset: DOMStringMap & {
    typedText?: string;
    typedTrigger?: string;
    typedTitleComplete?: string;
  };
  querySelector(selector: string): TypedTitleVisual | null;
}

export interface TypedTitleObserver {
  disconnect(): void;
  observe(root: TypedTitleRoot): void;
}

export interface TypedTitleInstance {
  destroy(): void;
}

export interface TypedTitleController {
  typed?: TypedTitleInstance;
  observer?: TypedTitleObserver;
}

export interface TypedTitleState {
  controllers: Map<TypedTitleRoot, TypedTitleController>;
}

export interface TypedTitleScope {
  querySelectorAll(selector: string): Iterable<TypedTitleRoot> | ArrayLike<TypedTitleRoot>;
}

export interface TypedTitleObserverEntry {
  isIntersecting: boolean;
}

export interface InitTypedTitleOptions {
  state: TypedTitleState;
  mediaMatches: boolean;
  createTyped(
    root: TypedTitleRoot,
    element: TypedTitleVisual,
    options: {
      text: string;
      trigger: 'load' | 'visible';
      onComplete: () => void;
    },
  ): TypedTitleInstance;
  createObserver(
    callback: (entries: TypedTitleObserverEntry[]) => void,
    options: { threshold: number },
  ): TypedTitleObserver;
}

export const createTypedTitleState = (): TypedTitleState => ({ controllers: new Map() });

export const collectTypedTitleRoots = (scope: TypedTitleScope): TypedTitleRoot[] =>
  Array.from(scope.querySelectorAll(ROOT_SELECTOR));

export const destroyController = (root: TypedTitleRoot, state: TypedTitleState) => {
  const controller = state.controllers.get(root);
  controller?.observer?.disconnect();
  controller?.typed?.destroy();
  state.controllers.delete(root);

  const text = root.dataset.typedText ?? '';
  const visual = root.querySelector(VISUAL_SELECTOR);
  if (visual) {
    visual.textContent = text;
  }
  delete root.dataset.typedTitleComplete;
};

const finishStatic = (root: TypedTitleRoot) => {
  const visual = root.querySelector(VISUAL_SELECTOR);
  if (visual) {
    visual.textContent = root.dataset.typedText ?? '';
  }
  root.dataset.typedTitleComplete = 'true';
};

const startTyped = (root: TypedTitleRoot, options: InitTypedTitleOptions) => {
  const existing = options.state.controllers.get(root);

  if (existing?.typed || root.dataset.typedTitleComplete === 'true') {
    return;
  }

  const visual = root.querySelector(VISUAL_SELECTOR);
  const text = root.dataset.typedText ?? '';
  const trigger = root.dataset.typedTrigger === 'visible' ? 'visible' : 'load';

  if (!visual || !text) {
    root.dataset.typedTitleComplete = 'true';
    return;
  }

  visual.textContent = '';

  const typed = options.createTyped(root, visual, {
    text,
    trigger,
    onComplete: () => {
      root.dataset.typedTitleComplete = 'true';
    },
  });

  options.state.controllers.set(root, { ...existing, typed });
};

const initTypedTitleRoot = (root: TypedTitleRoot, options: InitTypedTitleOptions) => {
  if (options.state.controllers.has(root) || root.dataset.typedTitleComplete === 'true') {
    return;
  }

  if (options.mediaMatches) {
    finishStatic(root);
    return;
  }

  const trigger = root.dataset.typedTrigger === 'visible' ? 'visible' : 'load';

  if (trigger === 'visible') {
    const observer = options.createObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          observer.disconnect();
          startTyped(root, options);
        });
      },
      { threshold: 0.35 },
    );

    options.state.controllers.set(root, { observer });
    observer.observe(root);
    return;
  }

  startTyped(root, options);
};

export const initAllTypedTitles = (scope: TypedTitleScope, options: InitTypedTitleOptions) => {
  collectTypedTitleRoots(scope).forEach((root) => {
    initTypedTitleRoot(root, options);
  });
};

export const resetAllTypedTitles = (scope: TypedTitleScope, state: TypedTitleState) => {
  collectTypedTitleRoots(scope).forEach((root) => {
    destroyController(root, state);
  });
};
