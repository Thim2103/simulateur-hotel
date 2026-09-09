// A titled page section -- the wrapper every redesigned page (MorningBriefing,
// DailyReview, MyHotel...) uses instead of a bare <section>+<h2>, so the
// title/eyebrow/icon hierarchy stays consistent everywhere.
export default function GameSection({ id, eyebrow, title, icon, children, className = "" }) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section aria-labelledby={headingId} className={`flex flex-col gap-3 ${className}`}>
      {(title || eyebrow) && (
        <div>
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{eyebrow}</p>}
          {title && (
            <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold text-slate-900">
              {icon && <span aria-hidden="true">{icon}</span>}
              {title}
            </h2>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
