// Shared helpers for the event system: rolling probabilities, picking a
// weighted variant (e.g. which weather shows up today), and tracking how
// long a multi-day event stays active. Every function here takes an
// injectable `rng` (default Math.random) so the whole system stays
// deterministic in tests.

export function rollProbability(probability, rng = Math.random) {
  const clamped = Math.max(0, Math.min(1, Number(probability) || 0));
  return rng() < clamped;
}

// options: [{ value, weight }]. Picks one option with probability
// proportional to its weight. Falls back to the first option if every
// weight is zero/invalid.
export function pickWeighted(options, rng = Math.random) {
  const safeOptions = Array.isArray(options) ? options : [];
  const totalWeight = safeOptions.reduce((sum, option) => sum + Math.max(0, Number(option.weight) || 0), 0);
  if (!safeOptions.length) return undefined;
  if (totalWeight <= 0) return safeOptions[0].value;

  let roll = rng() * totalWeight;
  for (const option of safeOptions) {
    roll -= Math.max(0, Number(option.weight) || 0);
    if (roll <= 0) return option.value;
  }
  return safeOptions[safeOptions.length - 1].value;
}

// Resolves an event definition's `duration` (a fixed number of days, or a
// function(state, context) => number of days) into a concrete day count.
export function resolveDuration(duration, state, context) {
  if (typeof duration === "function") {
    const resolved = Math.round(Number(duration(state, context)));
    return Number.isFinite(resolved) && resolved > 0 ? resolved : 1;
  }
  const fixed = Math.round(Number(duration));
  return Number.isFinite(fixed) && fixed > 0 ? fixed : 1;
}

// Resolves an event definition's `impact` (a fixed object, or a function
// (state, context) => object) into a concrete { revenue, expenses, staff,
// reputation } delta, defaulting every field to 0.
export function resolveImpact(impact, state, context) {
  const raw = typeof impact === "function" ? impact(state, context) : impact;
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    revenue: Number(source.revenue) || 0,
    expenses: Number(source.expenses) || 0,
    staff: Number(source.staff) || 0,
    reputation: Number(source.reputation) || 0,
  };
}

export function emptyImpact() {
  return { revenue: 0, expenses: 0, staff: 0, reputation: 0 };
}

export function sumImpacts(impacts) {
  return (Array.isArray(impacts) ? impacts : []).reduce((totals, impact) => {
    totals.revenue += Number(impact?.revenue) || 0;
    totals.expenses += Number(impact?.expenses) || 0;
    totals.staff += Number(impact?.staff) || 0;
    totals.reputation += Number(impact?.reputation) || 0;
    return totals;
  }, emptyImpact());
}

export function toDateOnly(value) {
  return String(value?.toISOString ? value.toISOString() : value).slice(0, 10);
}
