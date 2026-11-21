// The smoke-test hook (Development Plan M0). Playwright reads `window.__TEST__` to know when the game
// is ready and what it is showing, without scraping the canvas. It is read-only: tests drive the game
// with the keyboard and mouse like a player would.
//
// It only exists in dev builds, or in any build opened with `?test` in the address.

export interface TestSnapshot {
  /** The scene the player is looking at, e.g. "Title". */
  scene: string;
  /** Scene-specific details, e.g. which menu item is selected. */
  [key: string]: unknown;
}

export interface TestHook {
  readonly ready: boolean;
  readonly version: string;
  /** A frozen copy of the current state; changing it does nothing to the game. */
  state(): Readonly<TestSnapshot>;
}

declare global {
  interface Window {
    __TEST__?: TestHook;
  }
}

let snapshot: TestSnapshot = { scene: 'none' };
let ready = false;

export function testHookEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('test');
}

export function installTestHook(version: string): void {
  // Already there after a dev hot reload; redefining a non-configurable property would throw.
  if (!testHookEnabled() || window.__TEST__) return;
  const hook: TestHook = {
    get ready() {
      return ready;
    },
    version,
    state: () => Object.freeze(structuredClone(snapshot)),
  };
  Object.defineProperty(window, '__TEST__', { value: Object.freeze(hook), configurable: false });
}

/** Scenes call this whenever what the player sees changes. Cheap when the hook is off. */
export function reportState(next: TestSnapshot): void {
  snapshot = next;
}

export function markReady(): void {
  ready = true;
}
