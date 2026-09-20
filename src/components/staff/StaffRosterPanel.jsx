import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import {
  ROLES,
  LEVELS,
  DAYS_PER_MONTH,
  MAX_ROSTER_SIZE,
  TRAINING_DURATION_DAYS,
  hasRoster,
  getRoster,
  hiringCost,
  severanceCost,
  trainingCost,
  nextLevel,
  dailySalaryFor,
  rosterDailyPayroll,
  computeStaffing,
  hireEmployee,
  fireEmployee,
  trainEmployee,
  seedStarterRoster,
} from "../../lib/staff/staffRoster";
import { grantBonus, grantRaise, declineRaise, bonusCost, canGrantBonus, canGrantRaise, BONUS_COOLDOWN_DAYS, RAISE_COOLDOWN_DAYS, RAISE_FACTOR } from "../../lib/staff/staffEventsEngine";

const LEVEL_BADGE = { beginner: "info", experienced: "success", expert: "warning" };
const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;

// A small hotel with a big team can be at several hundred percent: show
// "200 %+" rather than a meaningless 867 %.
function coverageLabel(coverage) {
  return coverage > 2 ? "200 %+" : `${Math.round(coverage * 100)} %`;
}

// A colour-coded bar: green when healthy, amber in between, red when bad.
// `higherIsBetter` is true for morale, false for fatigue.
function Gauge({ label, value, higherIsBetter }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  const health = higherIsBetter ? percent : 100 - percent;
  const color = health >= 60 ? "bg-emerald-500" : health >= 35 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex min-w-32 flex-1 flex-col gap-0.5">
      <span className="text-xs text-slate-600">
        {label} {percent}/100
      </span>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} data-health={health >= 60 ? "good" : health >= 35 ? "warn" : "bad"} className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function tone(value, { good, bad, invert = false }) {
  const isGood = invert ? value <= good : value >= good;
  const isBad = invert ? value >= bad : value <= bad;
  return isGood ? "text-emerald-700" : isBad ? "text-rose-700" : "text-amber-700";
}

// The hotel-side team: hire, train and dismiss housekeepers, technicians
// and receptionists, see what they cost per day and whether they cover
// today's guests. Pure presentation over lib/staff/staffRoster.js: every
// action is a plain (bundle) => bundle transform handed to `onAdjust`
// (useCareer's applyHotelAdjustment), the same primitive every other real
// action in the app persists through. Kitchen/service staff live in
// restaurantState.staff and keep their own page (/restaurant/hr).
export default function StaffRosterPanel({ hotelState, day = 0, onAdjust, isRunning = false }) {
  const [role, setRole] = useState("housekeeping");
  const [level, setLevel] = useState("beginner");
  const [confirmingId, setConfirmingId] = useState(null);

  const roster = getRoster(hotelState);
  const staffing = hotelState?.staffing || computeStaffing(hotelState, { occupiedRooms: 0, day });
  const daily = rosterDailyPayroll(hotelState);
  const adjust = (updater) => {
    setConfirmingId(null);
    return onAdjust?.(updater);
  };

  if (!hasRoster(hotelState)) {
    return (
      <section aria-labelledby="staff-roster" className="flex flex-col gap-3">
        <h2 id="staff-roster" className="text-base font-semibold text-slate-900">Équipe de l'hôtel</h2>
        <Card>
          <p className="text-sm text-slate-600">
            Votre hôtel n'a pas encore d'équipe nommée : ses effectifs ne sont qu'estimés à partir de la masse salariale. Constituez une équipe de départ
            (2 gouvernantes, 1 technicien, 1 réceptionniste) sans changer votre masse salariale, puis recrutez, formez ou licenciez à votre guise.
          </p>
          <div className="mt-3">
            <Button disabled={isRunning} onClick={() => adjust((bundle) => ({ ...bundle, hotelState: seedStarterRoster(bundle.hotelState, { force: true }) }))}>
              Constituer l'équipe de départ
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  const hireDaily = dailySalaryFor(role, level);
  // Who needs the player's attention right now, most urgent first.
  const alerts = [
    ...roster.filter((employee) => employee.resignation).map((employee) => `${employee.name} a donné son préavis (départ au jour ${employee.resignation.noticeUntilDay}) : une prime ou une augmentation peut le retenir.`),
    ...roster.filter((employee) => employee.raiseRequested).map((employee) => `${employee.name} demande une augmentation.`),
    ...roster.filter((employee) => employee.sick).map((employee) => `${employee.name} est en arrêt maladie : son poste n'est pas couvert aujourd'hui.`),
  ];

  return (
    <section aria-labelledby="staff-roster" className="flex flex-col gap-3">
      <h2 id="staff-roster" className="text-base font-semibold text-slate-900">Équipe de l'hôtel</h2>

      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">Masse salariale quotidienne</dt>
            <dd data-testid="roster-daily-payroll" className="font-semibold text-slate-900">{euro(daily)} / jour</dd>
            <dd className="text-xs text-slate-500">≈ {euro(daily * DAYS_PER_MONTH)} / mois</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Couverture ménage</dt>
            <dd data-testid="roster-hk-coverage" className={`font-semibold ${tone(staffing?.housekeepingCoverage ?? 1, { good: 1, bad: 0.8 })}`}>
              {coverageLabel(staffing?.housekeepingCoverage ?? 1)}
            </dd>
            {(staffing?.cleaningDelayFactor ?? 1) > 1 && (
              <dd data-testid="roster-cleaning-delay" className="text-xs text-rose-700">Nettoyage ×{staffing.cleaningDelayFactor.toFixed(1)} plus long</dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-slate-500">Couverture réception</dt>
            <dd data-testid="roster-reception-coverage" className={`font-semibold ${tone(staffing?.receptionCoverage ?? 1, { good: 1, bad: 0.8 })}`}>
              {coverageLabel(staffing?.receptionCoverage ?? 1)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Techniciens</dt>
            <dd className="font-semibold text-slate-900">{roster.filter((employee) => employee.role === "maintenance").length}</dd>
          </div>
        </dl>
      </Card>

      {alerts.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-rose-800">Alertes RH</h3>
          <ul data-testid="roster-alerts" className="flex flex-col gap-1 text-sm text-rose-800">
            {alerts.map((message) => (
              <li key={message}>⚠️ {message}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        {roster.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun employé. Recrutez ci-dessous.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {roster.map((employee) => {
              const toLevel = nextLevel(employee.level);
              return (
                <li key={employee.id} data-testid="roster-employee" className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{employee.name}</span>
                      <span className="text-slate-500">{ROLES[employee.role]?.label}</span>
                      <Badge type={LEVEL_BADGE[employee.level] || "info"}>{LEVELS[employee.level]?.label}</Badge>
                      {employee.sick && <Badge type="danger">Malade (retour jour {employee.sickUntilDay + 1})</Badge>}
                      {employee.resignation && (
                        <Badge type="danger">Préavis de démission (départ jour {employee.resignation.noticeUntilDay})</Badge>
                      )}
                      {employee.raiseRequested && <Badge type="warning">Demande une augmentation</Badge>}
                      {employee.training && (
                        <Badge type="warning">
                          En formation → {LEVELS[employee.training.toLevel]?.label} (jour {employee.training.untilDay})
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 text-xs text-slate-600">
                      <span>{euro(employee.dailySalary)} / jour</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <Gauge label="Fatigue" value={employee.fatigue} higherIsBetter={false} />
                      <Gauge label="Moral" value={employee.morale} higherIsBetter />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {toLevel && !employee.training && (
                      <Button variant="outline" disabled={isRunning} onClick={() => adjust((bundle) => trainEmployee(bundle, employee.id, { day }))}>
                        Former ({euro(trainingCost(employee))}, {TRAINING_DURATION_DAYS} j)
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      disabled={isRunning || !canGrantBonus(employee, day)}
                      title={canGrantBonus(employee, day) ? undefined : `Une prime par ${BONUS_COOLDOWN_DAYS} jours`}
                      onClick={() => adjust((bundle) => grantBonus(bundle, employee.id, { day }))}
                    >
                      Prime ({euro(bonusCost(employee))})
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isRunning || !canGrantRaise(employee, day)}
                      title={canGrantRaise(employee, day) ? undefined : `Une augmentation par ${RAISE_COOLDOWN_DAYS} jours`}
                      onClick={() => adjust((bundle) => grantRaise(bundle, employee.id, { day }))}
                    >
                      Augmenter (+{Math.round((RAISE_FACTOR - 1) * 100)} %)
                    </Button>
                    {employee.raiseRequested && (
                      <Button variant="outline" disabled={isRunning} onClick={() => adjust((bundle) => declineRaise(bundle, employee.id))}>
                        Refuser la demande
                      </Button>
                    )}
                    {confirmingId === employee.id ? (
                      <>
                        <Button variant="outline" disabled={isRunning} onClick={() => adjust((bundle) => fireEmployee(bundle, employee.id))}>
                          Confirmer le licenciement ({euro(severanceCost(employee))})
                        </Button>
                        <Button variant="outline" onClick={() => setConfirmingId(null)}>Annuler</Button>
                      </>
                    ) : (
                      <Button variant="outline" disabled={isRunning} onClick={() => setConfirmingId(employee.id)}>
                        Licencier
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Recruter</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            Poste
            <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              {Object.entries(ROLES).map(([id, definition]) => (
                <option key={id} value={id}>{definition.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            Niveau
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              {Object.entries(LEVELS).map(([id, definition]) => (
                <option key={id} value={id}>{definition.label}</option>
              ))}
            </select>
          </label>
          <Button disabled={isRunning || roster.length >= MAX_ROSTER_SIZE} onClick={() => adjust((bundle) => hireEmployee(bundle, { role, level, day }))}>
            Recruter
          </Button>
        </div>
        <p data-testid="hire-preview" className="mt-2 text-xs text-slate-500">
          {euro(hireDaily)} / jour · frais de recrutement {euro(hiringCost(role, level))}
          {roster.length >= MAX_ROSTER_SIZE ? " · équipe complète" : ""}
        </p>
      </Card>

      <p className="text-xs text-slate-500">
        Cuisiniers et serveurs se gèrent dans <Link to="/restaurant/hr" className="font-semibold text-cyan-700 hover:underline">le personnel du restaurant</Link>.
      </p>
    </section>
  );
}
