import { toneOf } from "../designSystem/bentoTokens";

const WIDTH = 240;
const HEIGHT = 56;
const PAD = 4;

// A tiny line chart for a short series (e.g. the last days' revenue). Fewer
// than two points draws nothing -- there is no trend to show yet.
export default function Sparkline({ values, label, tone = "success" }) {
  const series = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
  if (series.length < 2) return null;
  const min = Math.min(...series);
  const span = Math.max(...series) - min || 1;
  const step = (WIDTH - PAD * 2) / (series.length - 1);
  const points = series.map((value, index) => `${(PAD + index * step).toFixed(1)},${(HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2)).toFixed(1)}`);
  const last = points[points.length - 1].split(",");
  return (
    <svg
      role="img"
      aria-label={label}
      data-tone={toneOf(tone, "success")}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-14 w-full"
      preserveAspectRatio="none"
    >
      <polyline points={points.join(" ")} fill="none" stroke="var(--tone)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--tone)" />
    </svg>
  );
}
