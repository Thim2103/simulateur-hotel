import {
  animateBranchEnter,
  animateBranchExit,
  animateHubPulse,
  animateHubGlow,
  animateBranchHover,
  animateBranchSelect,
} from "./radialAnimations";

const FUNCTIONS = {
  animateBranchEnter: [animateBranchEnter, "rn-branch-enter"],
  animateBranchExit: [animateBranchExit, "rn-branch-exit"],
  animateHubPulse: [animateHubPulse, "rn-hub-pulse"],
  animateHubGlow: [animateHubGlow, "rn-hub-glow"],
  animateBranchHover: [animateBranchHover, "rn-branch-hover"],
  animateBranchSelect: [animateBranchSelect, "rn-branch-select"],
};

Object.entries(FUNCTIONS).forEach(([name, [fn, className]]) => {
  test(`${name} is a no-op when given no element (never throws)`, () => {
    expect(() => fn(null)).not.toThrow();
  });

  test(`${name} removes then re-adds its own CSS class on the element`, () => {
    const el = document.createElement("div");
    el.classList.add(className);
    fn(el);
    expect(el.classList.contains(className)).toBe(false);
  });
});
