import { useMemo, useState } from "react";
import GmMessage from "./GmMessage";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

const MODULE_LABEL = {
  staff: "RH / Personnel",
  housekeeping: "Housekeeping",
  restaurantAdvanced: "Restaurant",
  finance: "Finance",
  marketing: "Marketing",
  rmAdvanced: "RM / RM Advanced",
  esg: "ESG",
  clients: "Clients",
  pro: "Owner",
  career: "Général",
};

// The inbox list -- every module the spec asks for (RH, Staff,
// Housekeeping, Restaurant, Finance, Marketing, RM/RM Advanced, ESG,
// Clients, Owner, plus incidents/opportunités under "Général") as a
// category filter, and a severity filter (rouge/orange/jaune). Sorted
// most severe first within the current filter.
export default function GmInbox({ messages, onOpen }) {
  const [moduleFilter, setModuleFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const modulesPresent = useMemo(() => Array.from(new Set(messages.map((m) => m.module))), [messages]);

  const filtered = useMemo(() => {
    return messages
      .filter((m) => moduleFilter === "all" || m.module === moduleFilter)
      .filter((m) => severityFilter === "all" || m.severity === severityFilter)
      .slice()
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3));
  }, [messages, moduleFilter, severityFilter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filtrer par catégorie"
          value={moduleFilter}
          onChange={(event) => setModuleFilter(event.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="all">Toutes les catégories</option>
          {modulesPresent.map((module) => (
            <option key={module} value={module}>
              {MODULE_LABEL[module] || module}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrer par priorité"
          value={severityFilter}
          onChange={(event) => setSeverityFilter(event.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="all">Toutes les priorités</option>
          <option value="high">🔴 Haute</option>
          <option value="medium">🟠 Moyenne</option>
          <option value="low">🟡 Basse</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun message pour l'instant : votre hôtel tourne bien.</p>
      ) : (
        <ul aria-label="Messages" className="flex flex-col gap-2">
          {filtered.map((message) => (
            <li key={message.id}>
              <GmMessage message={message} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
