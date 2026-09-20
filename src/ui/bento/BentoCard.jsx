import { toneOf } from "../designSystem/bentoTokens";

// How many of the grid's 3 columns a card takes on a wide screen (literal
// class names, so Tailwind's scanner sees them).
const SPANS = { 1: "", 2: "lg:col-span-2", 3: "lg:col-span-3" };

// The Bento grid's card (`.bento-card`, see index.css): white, 16px corners,
// a soft shadow, and an optional coloured top edge (`tone`) that says what
// the card is about -- action blue, success green, V.I.P. orange, MICE
// violet. `title` renders as an <h2> next to a tinted icon tile.
export default function BentoCard({ title, icon, tone, span = 1, action = null, children, className = "", as: Component = "section", ...props }) {
  return (
    <Component data-tone={tone ? toneOf(tone) : undefined} className={`bento-card ${SPANS[span] || ""} ${className}`} {...props}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="bento-card__title">
              {icon && <span aria-hidden="true" className="bento-card__icon">{icon}</span>}
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      {children}
    </Component>
  );
}
