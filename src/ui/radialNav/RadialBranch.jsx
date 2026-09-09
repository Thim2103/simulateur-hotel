import { useRef } from "react";
import { Link } from "react-router-dom";
import RadialIcon from "./RadialIcon";
import { animateBranchHover, animateBranchSelect } from "./radialAnimations";

// One branch, positioned around the hub via CSS custom properties
// (`--rn-x`/`--rn-y`, set from radialConfig.js's branchPosition() so the
// positioning math stays in one pure, testable place) that
// radialNav.css's rn-branch-enter keyframe also reads, so the same
// translate offset drives both the resting position and the entrance
// animation. `index` staggers the entrance (see RadialNavigation.jsx).
export default function RadialBranch({ branch, x, y, index, onNavigate }) {
  const ref = useRef(null);

  const handleClick = () => {
    animateBranchSelect(ref.current);
    onNavigate?.();
  };

  return (
    <Link
      ref={ref}
      to={branch.route}
      onClick={handleClick}
      onMouseEnter={() => animateBranchHover(ref.current)}
      onFocus={() => animateBranchHover(ref.current)}
      style={{ "--rn-x": `${x}px`, "--rn-y": `${y}px`, animationDelay: `${index * 45}ms` }}
      className="rn-branch-enter absolute left-1/2 top-1/2 flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border border-slate-200 bg-white text-slate-800 shadow-lg"
    >
      <RadialIcon name={branch.icon} size="lg" />
      <span className="px-1 text-center text-[10px] font-semibold leading-tight">{branch.label}</span>
    </Link>
  );
}
