// The game's card: same rounded/soft-shadow language as components/ui/Card
// but with a hover lift, used across the redesigned pages (MyHotel,
// MorningBriefing, DailyReview...). `accent` draws a thin gold left border
// for "this card matters more" (e.g. the day's headline stat).
export default function GameCard({ title, description, icon, accent = false, children, className = "", as: Component = "section" }) {
  return (
    <Component
      className={`rounded-2xl border border-[var(--ds-border)] bg-white p-4 shadow-[var(--ds-shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--ds-shadow-lift)] sm:p-5 ${
        accent ? "border-l-4 border-l-[#e9ab1f]" : ""
      } ${className}`}
    >
      {(title || icon) && (
        <div className="mb-1 flex items-center gap-2">
          {icon && <span aria-hidden="true" className="text-lg leading-none">{icon}</span>}
          {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
        </div>
      )}
      {description && <p className="mb-3 text-sm text-slate-500">{description}</p>}
      {children}
    </Component>
  );
}
