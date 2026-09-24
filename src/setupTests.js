// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Jest compatibility: legacy tests call jest.fn()/jest.spyOn()/vi.mock().
globalThis.jest = vi;

// context/AppModeContext.jsx's AppModeProvider (mounted once in App.js)
// reads its initial value from localStorage, defaulting a real, fresh
// player to "normal" (Étape 2's simplified 5-space navigation). Every
// existing test that renders the full <App/> and clicks through the
// classic hub menus (Finance/RM/ESG/Staff...) predates that redesign and
// expects the old, full navigation -- so tests default to "expert"
// instead, matching AppModeContext's own no-provider default. Test files
// that call `window.localStorage.clear()` in their own beforeEach (it
// runs after this one) re-set this same key themselves, right after
// their clear() -- see e.g. staffGuestFlow.integration.test.jsx.
try {
  window.localStorage.setItem('hospitalityLab.appMode', 'expert');
} catch {
  // best-effort only -- some environments don't have localStorage
}

// jsdom has no canvas backend: HTMLCanvasElement#getContext() returns null,
// so chart.js (through react-chartjs-2) fails to acquire a context, keeps a
// null canvas, then crashes in its resize/detach handler with "Cannot read
// properties of null (reading 'ownerDocument')" -- taking down every
// full-<App/> integration test that renders a chart. Hand it an inert 2D
// context instead: every method is a no-op, measureText() returns a width.
if (typeof HTMLCanvasElement !== 'undefined') {
  const noop = () => {};
  HTMLCanvasElement.prototype.getContext = function getContext() {
    const canvas = this;
    return new Proxy(
      {},
      {
        get(target, prop) {
          if (prop === 'canvas') return canvas;
          if (prop === 'measureText') return (text = '') => ({ width: String(text).length * 6 });
          if (prop === 'getImageData' || prop === 'createImageData') {
            return () => ({ data: new Uint8ClampedArray(4) });
          }
          if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
            return () => ({ addColorStop: noop });
          }
          if (prop === 'getLineDash') return () => [];
          if (prop in target) return target[prop];
          return noop;
        },
        set(target, prop, value) {
          target[prop] = value;
          return true;
        },
      },
    );
  };
}

// Once it has a context, chart.js (responsive: true) watches its container
// with ResizeObserver, which jsdom doesn't implement either.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
