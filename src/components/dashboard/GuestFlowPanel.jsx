import Card from "../ui/Card";
import KpiCard from "../charts/KpiCard";

// Couleurs catégorielles attribuées dans l'ordre fixe des profils
// (customers/customerGenerator.js PROFILES) -- jamais selon le rang, pour
// qu'un profil garde sa couleur quel que soit le mix du jour. Trois teintes
// sont sous 3:1 face au fond blanc : la légende chiffrée est donc toujours
// affichée, la couleur ne porte jamais seule l'information.
export const PROFILE_COLORS = Object.freeze({
  vip: "#2a78d6",
  business: "#eb6834",
  family: "#1baf7a",
  tourist: "#eda100",
  budget: "#e87ba4",
});

// Paliers de lecture de l'attractivité (1.0 = réputation neutre de 50/100).
export function attractivenessLevel(attractiveness) {
  if (!Number.isFinite(attractiveness)) return null;
  if (attractiveness < 0.8) return "Faible";
  if (attractiveness < 1.2) return "Normale";
  if (attractiveness < 1.6) return "Élevée";
  return "Exceptionnelle";
}

const formatPercent = (share) => `${Math.round(share * 100)} %`;

// Clientèle accueillie par le flux agent-based (hooks/useGuestFlow.js) :
// note moyenne des avis, attractivité, refus pour prix trop élevé et
// répartition des profils. Purement présentationnel.
export default function GuestFlowPanel({ stats }) {
  if (!stats) return null;
  const { averageRating, reviewCount = 0, attractiveness, rejectedCount = 0, welcomedCount = 0, profileDistribution = [] } = stats;
  const level = attractivenessLevel(attractiveness);
  const visibleProfiles = profileDistribution.filter(({ count }) => count > 0);

  return (
    <Card as="section" title="Clientèle accueillie" description="Avis laissés au départ, attractivité de l'hôtel et profils des clients.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Note moyenne"
          value={averageRating === null || averageRating === undefined ? "Aucun avis" : `${averageRating.toFixed(1)}/5 (${reviewCount} avis)`}
        />
        <KpiCard label="Attractivité" value={level ? `${level} (x${attractiveness.toFixed(2)})` : "—"} />
        <KpiCard label="Clients refusés (prix)" value={`${rejectedCount}`} />
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-900">Répartition des profils ({welcomedCount} clients)</h4>
        {visibleProfiles.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucun client accueilli pour l'instant.</p>
        ) : (
          <>
            <div role="img" aria-label="Répartition des profils clients" className="mt-2 flex h-4 w-full gap-0.5 overflow-hidden rounded bg-white">
              {visibleProfiles.map(({ key, label, count, share }) => (
                <div
                  key={key}
                  data-testid={`profile-bar-${key}`}
                  title={`${label} : ${count} (${formatPercent(share)})`}
                  className="h-full first:rounded-l last:rounded-r"
                  style={{ width: `${share * 100}%`, backgroundColor: PROFILE_COLORS[key] }}
                />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
              {visibleProfiles.map(({ key, label, count, share }) => (
                <li key={key} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PROFILE_COLORS[key] }} />
                  <span className="font-medium text-slate-900">{label}</span>
                  <span className="text-slate-500">{count} · {formatPercent(share)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
