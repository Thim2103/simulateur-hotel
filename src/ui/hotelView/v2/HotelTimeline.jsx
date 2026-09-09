import GameButton from "../../components/GameButton";
import { shimmer } from "../../animations";

const SEGMENTS = [
  { id: "morning", label: "Matin", icon: "🌅" },
  { id: "noon", label: "Midi", icon: "☀️" },
  { id: "afternoon", label: "Après-midi", icon: "🌤️" },
  { id: "evening", label: "Soir", icon: "🌆" },
  { id: "night", label: "Nuit", icon: "🌙" },
];

// The day's timeline: Matin -> Midi -> Après-midi -> Soir -> Nuit, a
// progress bar and the "Avancer la journée" action. The simulation itself
// is day-granular (careerEngine.js/proEngine.js only ever advance by one
// full day, there's no intraday clock to read), so the 5 segments are a
// narrative device -- always shown in full, with a shimmering progress
// bar standing in for "the day is in motion" -- rather than a real
// per-hour position this data model doesn't have.
export default function HotelTimeline({ day, eventCount = 0, onNextDay, isRunning }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Journée</p>
          <p className="text-sm font-semibold text-slate-900">
            Jour {day} · {eventCount} événement{eventCount === 1 ? "" : "s"}
          </p>
        </div>
        <GameButton variant="gold" icon="⏩" onClick={onNextDay} disabled={isRunning}>
          {isRunning ? "Calcul en cours…" : "Avancer la journée"}
        </GameButton>
      </div>

      <ol aria-label="Segments de la journée" className="flex items-center gap-1">
        {SEGMENTS.map((segment, index) => (
          <li key={segment.id} className="flex flex-1 flex-col items-center gap-1">
            <span aria-hidden="true" className="text-lg">{segment.icon}</span>
            <span className="text-[11px] font-medium text-slate-500">{segment.label}</span>
            {index < SEGMENTS.length - 1 && <span aria-hidden="true" className="sr-only" />}
          </li>
        ))}
      </ol>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full w-full rounded-full bg-gradient-to-r from-[#0b1730] via-[#e9ab1f] to-[#0b1730] ${shimmer}`} />
      </div>
    </div>
  );
}
