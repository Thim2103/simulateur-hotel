// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

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
