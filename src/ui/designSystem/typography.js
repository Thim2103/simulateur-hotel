// Text scale for the game UI: strong, short titles and calmer, readable
// body copy -- the two moods the spec asks for ("titres forts, sous-titres
// lisibles"). Each entry is a ready-to-spread Tailwind className string.
export const typography = {
  display: "text-4xl font-extrabold tracking-tight sm:text-6xl",
  h1: "text-2xl font-bold tracking-tight sm:text-3xl",
  h2: "text-base font-semibold",
  h3: "text-sm font-semibold",
  eyebrow: "text-xs font-semibold uppercase tracking-[0.3em]",
  body: "text-sm leading-relaxed",
  bodySmall: "text-xs leading-relaxed",
  stat: "text-2xl font-bold tabular-nums",
};

export default typography;
