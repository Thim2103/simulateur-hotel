import { useRef } from "react";
import { Link } from "react-router-dom";
import RadialIcon from "./RadialIcon";
import { RADIAL_HUB } from "./radialConfig";
import { animateHubPulse, animateHubGlow } from "./radialAnimations";

// The central hub: "Mon Hôtel", a softly pulsing/glowing circle (see
// radialNav.css's rn-hub-pulse/rn-hub-glow), always the way back to
// MyHotel (pages/Dashboard.jsx). Clicking it navigates there and closes
// the radial overlay (`onNavigate`, see RadialNavigation.jsx).
export default function RadialHub({ onNavigate }) {
  const ref = useRef(null);

  return (
    <Link
      ref={ref}
      to={RADIAL_HUB.route}
      onClick={() => onNavigate?.()}
      onMouseEnter={() => animateHubGlow(ref.current)}
      className="rn-hub-pulse rn-hub-glow absolute left-1/2 top-1/2 flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-full border-4 border-[#e9ab1f] bg-[#0b1730] text-white shadow-xl"
      onFocus={() => animateHubPulse(ref.current)}
    >
      <RadialIcon name={RADIAL_HUB.icon} size="2xl" />
      <span className="px-2 text-center text-xs font-semibold leading-tight">{RADIAL_HUB.label}</span>
    </Link>
  );
}
