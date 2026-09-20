import { toneOf } from "../designSystem/bentoTokens";

// The soft call-to-action (`.btn-soft-primary`): a tinted pill that fills
// with its tone on hover. Renders a <button>, or any element/component via
// `as` (e.g. a router <Link>) when the action is a navigation.
export default function SoftButton({ tone = "action", icon, as: Component = "button", className = "", children, ...props }) {
  const buttonProps = Component === "button" ? { type: "button", ...props } : props;
  return (
    <Component data-tone={toneOf(tone, "action")} className={`btn-soft-primary ${className}`} {...buttonProps}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </Component>
  );
}
