import { useState } from "react";
import { BentoCard, SoftButton, StatusBadge } from "../../ui/bento";
import { PROJECT_IDS, STARS_PER_PROJECT, WING_SIZES, MIN_EQUITY_RATE, describeProjects } from "../../lib/expansion/majorProjectsEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const stars = (value) => `${value.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(value) ? 0 : 1 })}★`;
const days = (count) => `${count} jour${count > 1 ? "s" : ""}`;

const REASONS = {
  built: "",
  "in-progress": "",
  busy: "Un autre chantier est en cours : un seul à la fois",
  "no-funds": "Trésorerie insuffisante",
  "no-equity": `Apport personnel insuffisant (${Math.round(MIN_EQUITY_RATE * 100)} % du coût du chantier requis en trésorerie)`,
  "invalid-size": "Taille d'aile non proposée",
  unknown: "",
};

function Works({ works, label }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Travaux en cours</span>
        <span>
          {works.progressPercent} % · {works.daysLeft > 0 ? `${days(works.daysLeft)} restant${works.daysLeft > 1 ? "s" : ""}` : "livraison imminente"}
        </span>
      </div>
      <div role="meter" aria-label={`Avancement des travaux : ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={works.progressPercent} className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-[var(--ds-vip)] transition-all" style={{ width: `${works.progressPercent}%` }} />
      </div>
    </div>
  );
}

function ProjectCard({ project, onStart }) {
  const [size, setSize] = useState(WING_SIZES[0]);
  const isWing = project.id === "wing";
  const option = isWing ? project.sizes.find((item) => item.size === size) : null;
  const status = isWing && project.status === "available" ? option.status : project.status;
  const cost = isWing ? (project.works ? project.cost : option.cost) : project.cost;
  const reason = REASONS[status] || "";

  return (
    <li
      data-testid={`project-${project.id}`}
      data-status={status}
      data-tone={project.built ? "success" : project.works ? "vip" : "action"}
      className="flex flex-col gap-2 rounded-2xl border border-l-4 border-[var(--ds-border)] border-l-[var(--tone)] bg-white p-3 shadow-[var(--ds-shadow-card)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          <span aria-hidden="true">{project.icon}</span> {project.label}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge tone="neutral">{days(project.works ? project.works.completesOnDay - project.works.startedOnDay : project.days)} de travaux</StatusBadge>
          {project.built && <StatusBadge tone="success" data-testid={`project-built-${project.id}`}>✅ Terminé{project.builtSize ? ` · ${project.builtSize} chambres` : ""}</StatusBadge>}
        </div>
      </div>
      <p className="text-xs text-slate-600">{project.description}</p>
      <ul className="flex flex-wrap gap-1.5">
        {project.effects.map((effect) => (
          <li key={effect}>
            <StatusBadge tone="action" className="!whitespace-normal">{effect}</StatusBadge>
          </li>
        ))}
      </ul>

      {project.works && <Works works={project.works} label={project.label} />}

      {!project.built && !project.works && (
        <div className="flex flex-wrap items-end gap-3">
          {isWing && (
            <label className="flex flex-col gap-0.5 text-xs text-slate-600">
              Taille de l'aile
              <select
                data-testid="project-size-wing"
                aria-label="Taille de l'aile"
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                className="rounded-xl border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {project.sizes.map((item) => (
                  <option key={item.size} value={item.size}>
                    {item.size} chambres · {euro(item.cost)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <SoftButton tone="vip" icon="🚧" data-testid={`project-start-${project.id}`} disabled={status !== "available"} onClick={() => onStart?.(project.id, isWing ? size : undefined)} className="!px-3 !py-1.5 !text-xs">
            Lancer le chantier · {euro(cost)}
          </SoftButton>
          <span data-testid={`project-stars-${project.id}`} className="text-xs text-slate-500">
            Hôtel {stars(project.starsAfter)} une fois livré
          </span>
        </div>
      )}
      {reason && (
        <p data-testid={`project-reason-${project.id}`} className="text-xs text-rose-700">
          {reason}
        </p>
      )}
    </li>
  );
}

// The building site desk (see lib/expansion/majorProjectsEngine.js): the hotel's
// stars, the three major projects -- a new wing, a spa, an ecological renovation
// -- with their cost, their works in real time and what they bring.
// `onStart(projectId, size)` starts one -- Dashboard.jsx wires it through
// applyHotelAdjustment(). Shared by HotelExpansionModal.
export default function MajorProjectsPanel({ hotelState, rooms, day, onStart }) {
  const described = describeProjects(hotelState, { day, rooms });
  const { current, rating, built } = described.stars;
  const missing = Math.ceil((rating + 1 - current) / STARS_PER_PROJECT);
  const done = rating >= 5;

  return (
    <div data-testid="projects-panel" className="flex flex-col gap-4">
      <BentoCard as="div" tone="vip" title="Classement de l'hôtel" icon="⭐">
        <div className="flex flex-wrap items-center gap-3">
          <p data-testid="projects-stars" className="text-2xl font-bold text-slate-900">{stars(current)}</p>
          <StatusBadge tone="vip" data-testid="projects-stars-next">
            {done ? "Classement maximal" : `Encore ${missing} projet${missing > 1 ? "s" : ""} pour passer ${rating + 1}★`}
          </StatusBadge>
          <span className="text-xs text-slate-500">
            {built} grand{built > 1 ? "s" : ""} chantier{built > 1 ? "s" : ""} livré{built > 1 ? "s" : ""}{described.rooms > 0 ? ` · ${described.rooms} chambres dans la nouvelle aile` : ""} · chaque projet vaut une demi-étoile
          </span>
        </div>
      </BentoCard>

      <ul className="flex flex-col gap-3">
        {PROJECT_IDS.map((id) => (
          <ProjectCard key={id} project={described.projects.find((project) => project.id === id)} onStart={onStart} />
        ))}
      </ul>
    </div>
  );
}
