// The game's button: bolder press/hover feedback than components/ui/Button
// (which stays in place, untouched, for every existing business page) --
// a slight lift on hover, a slight sink on press, and a `gold` variant for
// the one primary action on a screen (e.g. "Jouer la journée").
const VARIANTS = {
  primary: "bg-[#0b1730] text-white shadow-sm hover:bg-[#122145] hover:shadow-md",
  gold: "bg-[#e9ab1f] text-[#0b1730] shadow-sm hover:bg-[#f5c451] hover:shadow-md",
  outline: "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

export default function GameButton({ children, variant = "primary", icon, className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 " +
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

  return (
    <button type="button" className={`${base} ${VARIANTS[variant] || VARIANTS.primary} ${className}`} {...props}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
