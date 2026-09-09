import { getIcon } from "../designSystem/icons";

// The animated icon glyph shown inside the hub/each branch -- reuses the
// shared icon pack (ui/designSystem/icons.js) rather than a new one, same
// convention as GameIcon.jsx. `animation` is an optional extra className
// (a radialNav.css class, e.g. "rn-hub-pulse") applied on top.
export default function RadialIcon({ name, size = "2xl", animation = "", className = "" }) {
  const SIZE_CLASS = { lg: "text-2xl", xl: "text-3xl", "2xl": "text-4xl" };
  return (
    <span aria-hidden="true" className={`inline-block leading-none ${SIZE_CLASS[size] || SIZE_CLASS["2xl"]} ${animation} ${className}`}>
      {getIcon(name)}
    </span>
  );
}
