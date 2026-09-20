import { toneOf } from "../designSystem/bentoTokens";

// A status pill (`.badge-status`): a short label with a tone and an optional
// leading icon. Unlike GameBadge it is not uppercase -- it reads as a phrase.
export default function StatusBadge({ tone = "neutral", icon, children, className = "", ...props }) {
  return (
    <span data-tone={toneOf(tone)} className={`badge-status ${className}`} {...props}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
