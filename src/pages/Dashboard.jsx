import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useCareerContext } from "../context/CareerContext";
import { useDashboard } from "../hooks/useDashboard";
import { useTfeEngine } from "../hooks/useTfeEngine";
import { useClientsEngine } from "../hooks/useClientsEngine";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";
import { useProEngine } from "../hooks/useProEngine";
import { skillLabel } from "../lib/career/careerSkills";
import { buildAttentionItems } from "../lib/dashboard/attentionItems";
import { buildDecisionGroups } from "../lib/dashboard/dailyDecisions";
import { findQuickAction } from "../lib/dashboard/dashboardActions";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardViewModeToggle from "../components/dashboard/DashboardViewModeToggle";
import DashboardKpis from "../components/dashboard/DashboardKpis";
import DashboardNotifications from "../components/dashboard/DashboardNotifications";
import DashboardReplaySummary from "../components/dashboard/DashboardReplaySummary";
import DashboardInsights from "../components/dashboard/DashboardInsights";
import HotelView2DAnimated from "../ui/hotelView/v2/HotelView2DAnimated";
import IsoFinalView from "../ui/hotelView/isometricFinal/IsoFinalView";
import { feedbackForAction } from "../ui/hotelView/v2/decisionFeedback";
import AttentionPanel from "../components/dashboard/AttentionPanel";
import DecisionsPanel from "../components/dashboard/DecisionsPanel";
import { useGmDesk } from "../ui/gmDesk/GmDeskProvider";
import GameNotification from "../ui/components/GameNotification";
import { openRadialNav } from "../ui/radialNav/radialNavBus";
import { fadeIn } from "../ui/animations";

// The general Dashboard ("Mon Hôtel") -- the living, narrative home page:
// the hotel as a character (KPIs, notifications, yesterday's story),
// what needs attention today, and the one button that moves the story
// forward. See lib/dashboard/ for the aggregation logic and
// hooks/useDashboard.js for how it's wired to Career/Replay/Analytics.
// Works identically for a real Supabase session and a Guest Mode session
// (see hooks/useSupabaseSession.js) -- useCareer.js/useDashboard.js
// already bypass Supabase transparently in guest mode.
export default function Dashboard() {
  const navigate = useNavigate();
  const { careerState, isRunning: isCareerRunning, error: careerError, startCareer, nextDay } = useCareerContext();
  const {
    dashboardState,
    isRunning: isDashboardRunning,
    error: dashboardError,
    isGuest,
    loadDashboardState,
    setViewMode,
    applyQuickAction,
  } = useDashboard();

  // Reads the player's TFE Solo run, if any, purely to surface its score
  // on this shared Dashboard. Never starts or advances a TFE run here.
  const { tfeState, loadTfeState } = useTfeEngine();

  // Reads the clients satisfaction score purely to surface it on this
  // Dashboard as the 12th KPI. Never applies clients actions from here --
  // same read-only pattern as tfeState above. A career with no clients
  // cycle yet simply shows "—". See hooks/useClientsEngine.js's own
  // docstring for why this is kept separate from useDashboard.js.
  const { clientsState, loadClientsState } = useClientsEngine();

  // Reads the RM Advanced module's own OTA-vs-direct mix, purely to
  // surface it on this Dashboard as the 13th KPI. Never applies RM
  // Advanced actions from here -- same read-only pattern as tfeState/
  // clientsState above. A career with no RM Advanced cycle yet simply
  // shows "—". See hooks/useRmAdvancedEngine.js's own docstring for why
  // this is kept separate from useDashboard.js.
  const { rmAdvancedState, loadRmAdvancedState } = useRmAdvancedEngine();

  // Reads the Mode Professionnel Solo run's own score, purely to surface
  // it on this Dashboard as the 14th KPI. Never plays a month or applies
  // Pro actions from here -- same read-only pattern as tfeState/
  // clientsState/rmAdvancedState above. No Pro run yet simply shows "—".
  // See hooks/useProEngine.js's own docstring for why this is kept
  // separate from useDashboard.js.
  const { proState, loadProState } = useProEngine();

  // HotelView2D v2's visual feedback for the player's last decision (see
  // ui/hotelView/v2/decisionFeedback.js/HotelView2DAnimated.jsx) -- purely
  // local UI state, never persisted, reset by the next decision.
  const [decisionFeedback, setDecisionFeedback] = useState(null);
  const [cleaningRoomIds, setCleaningRoomIds] = useState(new Set());

  // IsoFinalView (the "Retro-Moderne Premium" isometric view, per the
  // Bible Artistique) is now the default hotel view ("isométrique premium
  // par défaut"), with a toggle back to v2's flat HotelView2DAnimated --
  // both read the exact same props (see either component's own
  // docstring), so this is a pure presentation switch, nothing about the
  // underlying data changes. v3's HotelViewIsometric and RetroView both
  // stay in the codebase, fully tested, but are no longer wired into this
  // toggle -- IsoFinalView replaces RetroView here per the spec.
  const [isIsometric, setIsIsometric] = useState(true);

  // GM Desk (see ui/gmDesk/GmDeskProvider.jsx, mounted once in App.js):
  // the "📬 GM Desk" link's own unread-style badge, plus a GameNotification
  // the first time new messages appear after this page has already loaded
  // once (so it doesn't fire on the very first render, only when the
  // inbox actually grows -- e.g. after "Jouer la journée").
  const { messages: gmMessages } = useGmDesk();
  const [gmNotification, setGmNotification] = useState(null);
  const previousGmMessageCount = useRef(null);

  useEffect(() => {
    if (previousGmMessageCount.current !== null && gmMessages.length > previousGmMessageCount.current) {
      setGmNotification(`${gmMessages.length - previousGmMessageCount.current} nouveau(x) message(s) au GM Desk.`);
    }
    previousGmMessageCount.current = gmMessages.length;
  }, [gmMessages.length]);

  useEffect(() => {
    loadDashboardState().catch(() => undefined);
    loadTfeState().catch(() => undefined);
    loadClientsState().catch(() => undefined);
    loadRmAdvancedState().catch(() => undefined);
    loadProState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isDashboardRunning;
  const error = dashboardError || careerError;

  const handleNextDay = async () => {
    try {
      const outcome = await nextDay();
      // Pass the CareerState nextDay() just returned explicitly: reading
      // careerState off context here would still be the pre-nextDay()
      // value until the next render (see useDashboard.js's
      // loadDashboardState() docstring).
      await loadDashboardState(outcome.state);
      // Closes the daily loop (Morning -> MyHotel -> Decisions -> Day ->
      // Results): "Passer la journée" lands on DailyReview.jsx, which
      // rebuilds its own view straight from the same CareerState/
      // DashboardState (see hooks/useDailyReview.js) rather than anything
      // passed through navigation state.
      navigate("/daily-review");
    } catch {
      // error surfaced via `error`.
    }
  };

  const handleQuickAction = async (actionId) => {
    // Trigger the hotel's own visual reaction to this decision (pulse the
    // rooms, staff walking, shimmer the reception...) immediately -- it's
    // purely cosmetic feedback, so it doesn't wait for applyQuickAction()
    // to resolve, and `nonce` makes it retrigger even for the same
    // actionId twice in a row (see HotelAnimations.js's retriggerAnimation()).
    const category = findQuickAction(actionId)?.category;
    const feedback = { ...feedbackForAction(actionId, category), nonce: Date.now() };
    setDecisionFeedback(feedback);
    if (feedback.target === "housekeeping") {
      const rooms = careerState?.hotel?.rooms || [];
      const targetRoom = rooms.find((room) => room.housekeeping_status === "dirty") || rooms[0];
      if (targetRoom) {
        setCleaningRoomIds(new Set([targetRoom.id]));
        setTimeout(() => setCleaningRoomIds(new Set()), 3000);
      }
    }

    try {
      await applyQuickAction(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if ((isCareerRunning || isDashboardRunning) && !careerState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement de votre hôtel…
        </span>
      </div>
    );
  }

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">{isGuest ? "Mode invité" : "Vue d'ensemble"}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Bienvenue dans votre hôtel</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir votre hôtel prendre vie.</p>
          </div>
        </header>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
        <Card>
          <Button
            onClick={async () => {
              const newCareerState = await startCareer("moi").catch(() => null);
              await loadDashboardState(newCareerState).catch(() => undefined);
            }}
            disabled={isRunning}
          >
            {isRunning ? "Démarrage…" : "Démarrer ma carrière"}
          </Button>
        </Card>
      </div>
    );
  }

  const viewMode = dashboardState?.viewMode || "casual";
  const careerSummary = dashboardState?.careerSummary;
  const attentionItems = buildAttentionItems(dashboardState?.notifications);
  const decisionGroups = buildDecisionGroups(dashboardState?.quickActions);

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader day={careerState.day} date={dashboardState?.kpis?.date} isGuest={isGuest} onNextDay={handleNextDay} isRunning={isRunning} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Statut : {careerState.status}
          {careerSummary && ` · Objectifs atteints : ${careerSummary.achievedObjectivesCount}/${careerSummary.totalObjectives}`}
        </p>
        <div className="flex items-center gap-3">
          <Link to="/briefing" className="text-sm font-medium text-cyan-700 hover:underline">Briefing du matin →</Link>
          <Link to="/gm-desk" className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-700 hover:underline">
            📬 GM Desk
            {gmMessages.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-semibold text-white">
                {gmMessages.length}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={openRadialNav}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-700 hover:underline"
          >
            🎯 Radial Navigation
          </button>
          <button
            type="button"
            onClick={() => setIsIsometric((value) => !value)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-700 hover:underline"
          >
            {isIsometric ? "🗺️ Vue 2D" : "🏙️ Vue isométrique"}
          </button>
          <DashboardViewModeToggle viewMode={viewMode} onChange={(mode) => setViewMode(mode).catch(() => undefined)} />
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {careerState.storyline.currentEventId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Un événement narratif vous attend. <Link to="/career/story" className="font-semibold underline">Le consulter →</Link>
        </div>
      )}

      <DashboardKpis
        kpis={dashboardState?.kpis ? {
          ...dashboardState.kpis,
          tfeScore: tfeState?.score?.total ?? null,
          clientsSatisfaction: clientsState?.satisfaction ?? null,
          rmAdvancedMix: rmAdvancedState?.otaStrategy?.directShare ?? null,
          proScore: proState?.score?.total ?? null,
        } : null}
        viewMode={viewMode}
      />

      {isIsometric ? (
        <IsoFinalView
          day={careerState.day}
          rooms={careerState?.hotel?.rooms ?? []}
          staffCount={dashboardState?.kpis?.staffCount ?? 0}
          todaysEvents={dashboardState?.replaySummary?.events ?? []}
          diagnostics={dashboardState?.insights?.diagnostics ?? []}
          decisionFeedback={decisionFeedback}
          cleaningRoomIds={cleaningRoomIds}
          onNextDay={handleNextDay}
          isRunning={isRunning}
        />
      ) : (
        <HotelView2DAnimated
          day={careerState.day}
          rooms={careerState?.hotel?.rooms ?? []}
          staffCount={dashboardState?.kpis?.staffCount ?? 0}
          todaysEvents={dashboardState?.replaySummary?.events ?? []}
          diagnostics={dashboardState?.insights?.diagnostics ?? []}
          decisionFeedback={decisionFeedback}
          cleaningRoomIds={cleaningRoomIds}
          onNextDay={handleNextDay}
          isRunning={isRunning}
        />
      )}

      <div className={fadeIn}>
        <AttentionPanel items={attentionItems} />
      </div>

      <DashboardNotifications notifications={dashboardState?.notifications} />

      {careerSummary && (
        <section aria-labelledby="dashboard-career" className="flex flex-col gap-3">
          <h2 id="dashboard-career" className="text-base font-semibold text-slate-900">Progression de carrière</h2>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Missions en cours ({careerSummary.acceptedMissions.length})</h3>
              {careerSummary.acceptedMissions.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune mission en cours. <Link to="/career/missions" className="font-semibold text-cyan-700">En accepter une →</Link></p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {careerSummary.acceptedMissions.map((mission) => (
                    <li key={mission.id} className="rounded-lg border border-slate-200 p-2">{mission.title}</li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Compétences</h3>
              <ul className="flex flex-col gap-2 text-sm">
                {Object.entries(careerSummary.skills).map(([skillId, skill]) => (
                  <li key={skillId} className="flex justify-between rounded-lg border border-slate-200 p-2">
                    <span className="font-medium text-slate-900">{skillLabel(skillId)}</span>
                    <span className="text-slate-600">Niveau {skill.level}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          {careerSummary.pendingRewardsCount > 0 && (
            <Card>
              <p className="text-sm text-slate-700">
                {careerSummary.pendingRewardsCount} récompense(s) débloquée(s) à réclamer. <Link to="/career/rewards" className="font-semibold text-cyan-700">Voir →</Link>
              </p>
            </Card>
          )}
        </section>
      )}

      <DashboardReplaySummary replaySummary={dashboardState?.replaySummary} />

      <DashboardInsights insights={dashboardState?.insights} />

      <DecisionsPanel groups={decisionGroups} onRunAction={handleQuickAction} isRunning={isRunning} />

      {gmNotification && <GameNotification tone="info" message={gmNotification} onDismiss={() => setGmNotification(null)} />}
    </div>
  );
}
