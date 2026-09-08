import { isDesktopBuild, isDevMode } from "./env";

describe("isDevMode", () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test("is true outside of a production build", () => {
    process.env.NODE_ENV = "development";
    expect(isDevMode()).toBe(true);
  });

  test("is false in a production build", () => {
    process.env.NODE_ENV = "production";
    expect(isDevMode()).toBe(false);
  });
});

describe("isDesktopBuild", () => {
  afterEach(() => {
    delete window.__TAURI__;
    delete window.electronAPI;
  });

  test("is false on a plain web build", () => {
    expect(isDesktopBuild()).toBe(false);
  });

  test("is true when a Tauri global is present", () => {
    window.__TAURI__ = {};
    expect(isDesktopBuild()).toBe(true);
  });

  test("is true when an Electron API global is present", () => {
    window.electronAPI = {};
    expect(isDesktopBuild()).toBe(true);
  });
});
