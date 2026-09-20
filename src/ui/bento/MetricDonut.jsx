import { toneOf } from "../designSystem/bentoTokens";

// A donut gauge (`.metric-donut`): `value` out of `max`, drawn with a
// conic-gradient so it needs no SVG. Announced as one image with its
// reading, e.g. "Occupation : 75 %".
export default function MetricDonut({ value, max = 100, label, caption, tone = "action", size, display }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, Number(value) / max)) : 0;
  const percent = Number.isFinite(ratio) ? Math.round(ratio * 100) : 0;
  const shown = display ?? `${percent} %`;
  return (
    <div
      role="img"
      aria-label={`${label} : ${shown}`}
      data-tone={toneOf(tone, "action")}
      data-percent={percent}
      className="metric-donut"
      style={{ "--pct": percent, ...(size ? { "--donut-size": size } : null) }}
    >
      <span aria-hidden="true" className="metric-donut__label">
        <span className="metric-donut__value">{shown}</span>
        {caption && <span className="metric-donut__caption">{caption}</span>}
      </span>
    </div>
  );
}
