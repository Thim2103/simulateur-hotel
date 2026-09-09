import { useId, useState } from "react";

// A small hover/focus tooltip -- wraps its trigger child, shows `label` in
// a floating bubble above it. Keyboard-accessible (shows on focus too),
// pure CSS positioning (no portal/positioning library needed for a single
// short line of text).
export default function GameTooltip({ label, children }) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>
      <span
        id={id}
        role="tooltip"
        hidden={!visible}
        className="pointer-events-none absolute -top-2 left-1/2 z-[10000] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
      >
        {label}
      </span>
    </span>
  );
}
