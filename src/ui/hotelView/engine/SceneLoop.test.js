import { createSceneLoop, MAX_DELTA_SECONDS } from "./SceneLoop";

// requestAnimationFrame/cancelAnimationFrame are faked with a manually
// flushed callback queue so every test drives the loop frame-by-frame,
// deterministically, without any real timers.
let pending;
let nextId;

beforeEach(() => {
  pending = [];
  nextId = 1;
  jest.spyOn(global, "requestAnimationFrame").mockImplementation((cb) => {
    const id = nextId++;
    pending.push({ id, cb });
    return id;
  });
  jest.spyOn(global, "cancelAnimationFrame").mockImplementation((id) => {
    pending = pending.filter((entry) => entry.id !== id);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function flush(timestamp) {
  const callbacks = pending;
  pending = [];
  callbacks.forEach(({ cb }) => cb(timestamp));
}

describe("SceneLoop / start", () => {
  it("schedules exactly one animation frame", () => {
    const loop = createSceneLoop(() => {});
    loop.start();
    expect(pending).toHaveLength(1);
  });

  it("calls onTick with deltaSeconds = 0 on the very first frame", () => {
    const onTick = jest.fn();
    const loop = createSceneLoop(onTick);
    loop.start();
    flush(1000);
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(onTick).toHaveBeenCalledWith(0);
  });

  it("is a no-op when already running: never two active loops at once", () => {
    const loop = createSceneLoop(() => {});
    loop.start();
    loop.start();
    loop.start();
    expect(pending).toHaveLength(1);
  });

  it("marks the loop as running", () => {
    const loop = createSceneLoop(() => {});
    expect(loop.isRunning()).toBe(false);
    loop.start();
    expect(loop.isRunning()).toBe(true);
  });
});

describe("SceneLoop / deltaTime", () => {
  it("computes deltaSeconds from the gap between two frame timestamps", () => {
    const onTick = jest.fn();
    const loop = createSceneLoop(onTick);
    loop.start();
    flush(1000);
    flush(1016); // 16ms later
    expect(onTick).toHaveBeenLastCalledWith(expect.closeTo(0.016, 3));
  });

  it("clamps an exceptionally large deltaSeconds (backgrounded tab, long pause...)", () => {
    const onTick = jest.fn();
    const loop = createSceneLoop(onTick);
    loop.start();
    flush(0);
    flush(600000); // 10 minutes later
    expect(onTick).toHaveBeenLastCalledWith(MAX_DELTA_SECONDS);
  });

  it("never reports a negative deltaSeconds", () => {
    const onTick = jest.fn();
    const loop = createSceneLoop(onTick);
    loop.start();
    flush(1000);
    flush(900); // a timestamp that (in theory) went backwards
    expect(onTick.mock.calls[1][0]).toBeGreaterThanOrEqual(0);
  });
});

describe("SceneLoop / pause and resume", () => {
  it("pause stops further onTick calls", () => {
    const onTick = jest.fn();
    const loop = createSceneLoop(onTick);
    loop.start();
    flush(1000); // 1 call, schedules the next frame
    loop.pause();
    flush(1016); // nothing left to flush: pause cancelled the pending frame
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("pause cancels the pending animation frame", () => {
    const loop = createSceneLoop(() => {});
    loop.start();
    flush(1000);
    expect(pending).toHaveLength(1);
    loop.pause();
    expect(pending).toHaveLength(0);
  });

  it("resume schedules a fresh frame and does not report the paused gap as elapsed time", () => {
    const onTick = jest.fn();
    const loop = createSceneLoop(onTick);
    loop.start();
    flush(1000);
    loop.pause();
    loop.resume();
    flush(50000); // a long time later -- must not appear as one giant deltaSeconds
    expect(onTick).toHaveBeenLastCalledWith(0);
  });

  it("resume is a no-op when not paused", () => {
    const loop = createSceneLoop(() => {});
    loop.start();
    flush(1000);
    loop.resume();
    expect(pending).toHaveLength(1); // still just the one already-scheduled frame
  });

  it("isRunning reflects the paused state", () => {
    const loop = createSceneLoop(() => {});
    loop.start();
    expect(loop.isRunning()).toBe(true);
    loop.pause();
    expect(loop.isRunning()).toBe(false);
    expect(loop.isPaused()).toBe(true);
    loop.resume();
    expect(loop.isRunning()).toBe(true);
  });
});

describe("SceneLoop / stop and cleanup", () => {
  it("stop cancels the pending frame and further flushes call nothing", () => {
    const onTick = jest.fn();
    const loop = createSceneLoop(onTick);
    loop.start();
    flush(1000);
    loop.stop();
    expect(pending).toHaveLength(0);
    flush(1016);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("after stop, start begins a brand new loop (first frame is deltaSeconds = 0 again)", () => {
    const onTick = jest.fn();
    const loop = createSceneLoop(onTick);
    loop.start();
    flush(1000);
    flush(1016);
    loop.stop();
    loop.start();
    flush(5000);
    expect(onTick).toHaveBeenLastCalledWith(0);
  });

  it("stop when never started does not throw", () => {
    const loop = createSceneLoop(() => {});
    expect(() => loop.stop()).not.toThrow();
  });
});
