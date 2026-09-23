import { render, screen, fireEvent } from "@testing-library/react";
import { AppModeProvider, useAppMode } from "./AppModeContext";

function Probe() {
  const { appMode, setAppMode, toggleAppMode } = useAppMode();
  return (
    <div>
      <p>Mode : {appMode}</p>
      <button onClick={toggleAppMode}>Toggle</button>
      <button onClick={() => setAppMode("expert")}>Set expert</button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

test("without a provider, the default is 'expert' (every pre-existing test keeps its full navigation)", () => {
  render(<Probe />);
  expect(screen.getByText("Mode : expert")).toBeInTheDocument();
});

test("a fresh AppModeProvider (no stored preference) defaults to 'normal'", () => {
  render(<AppModeProvider><Probe /></AppModeProvider>);
  expect(screen.getByText("Mode : normal")).toBeInTheDocument();
});

test("toggleAppMode flips between normal and expert", () => {
  render(<AppModeProvider><Probe /></AppModeProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
  expect(screen.getByText("Mode : expert")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
  expect(screen.getByText("Mode : normal")).toBeInTheDocument();
});

test("the chosen mode persists to localStorage and is read back on the next mount", () => {
  const { unmount } = render(<AppModeProvider><Probe /></AppModeProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Set expert" }));
  expect(window.localStorage.getItem("hospitalityLab.appMode")).toBe("expert");
  unmount();

  render(<AppModeProvider><Probe /></AppModeProvider>);
  expect(screen.getByText("Mode : expert")).toBeInTheDocument();
});
