// Persistence for the Competition module (see supabase/migrations/
// 202609070010_competition_module.sql). Not part of the requested
// lib/competition/ file list, but necessary for the same reason
// lib/academy/academyRepository.js was: "register players", "assign a
// scenario" and "automatic ranking" all imply an organizer's matches
// survive a page reload. Every pure competition*.js file stays
// storage-agnostic; only this file talks to Supabase.
import { assertSupabaseConfigured, requireUserId } from "../supabase";
import { safeLoad } from "../safeLoad";
import { safeArray } from "../safe";
import { deserializeRunState, serializeRunState } from "./competitionState";

async function select(table, query = (builder) => builder) {
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await query(client.from(table).select("*"));
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    [],
    { label: `select:${table}` }
  );
}

async function insertOne(table, row) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function upsertOne(table, row, onConflict) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from(table).upsert(row, { onConflict }).select().single();
  if (error) throw error;
  return data;
}

export async function createMatch({ name }) {
  const userId = await requireUserId();
  return insertOne("competition_matches", { user_id: userId, metadata: { name } });
}

export async function listMatches() {
  const userId = await requireUserId();
  const rows = await select("competition_matches", (builder) => builder.eq("user_id", userId).order("created_at"));
  return rows.map((row) => ({ id: row.id, name: row.metadata?.name, organizerId: row.user_id, scenario: row.metadata?.scenario || null, createdAt: row.created_at }));
}

export async function registerPlayer({ matchId, name }) {
  const userId = await requireUserId();
  const row = await insertOne("competition_players", { user_id: userId, match_id: matchId, metadata: { name } });
  return { id: row.id, matchId: row.match_id, name: row.metadata?.name };
}

export async function listPlayers(matchId) {
  const userId = await requireUserId();
  const rows = await select("competition_players", (builder) => builder.eq("user_id", userId).eq("match_id", matchId).order("created_at"));
  return rows.map((row) => ({ id: row.id, matchId: row.match_id, name: row.metadata?.name }));
}

// Persists the match's shared scenario (with its stamped seed) onto the
// match row's own metadata, alongside creating each player's run below.
export async function saveMatchScenario({ matchId, scenario }) {
  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("competition_matches")
    .update({ scenario_id: scenario.id, metadata: { scenario }, updated_at: new Date().toISOString() })
    .eq("id", matchId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Upserts a player's ScenarioRunState (one row per player, see the
// unique index on player_id).
export async function savePlayerRun({ matchId, playerId, scenarioId, runState }) {
  const userId = await requireUserId();
  return upsertOne(
    "competition_runs",
    { user_id: userId, match_id: matchId, player_id: playerId, scenario_id: scenarioId, run_state: serializeRunState(runState), updated_at: new Date().toISOString() },
    "player_id"
  );
}

export async function loadPlayerRun(playerId) {
  const userId = await requireUserId();
  const rows = await select("competition_runs", (builder) => builder.eq("user_id", userId).eq("player_id", playerId).limit(1));
  const row = rows[0];
  return row ? deserializeRunState(row.run_state) : null;
}

export async function loadRunsForMatch(matchId) {
  const userId = await requireUserId();
  const rows = await select("competition_runs", (builder) => builder.eq("user_id", userId).eq("match_id", matchId));
  return Object.fromEntries(rows.map((row) => [row.player_id, deserializeRunState(row.run_state)]));
}

export async function savePlayerReport({ matchId, playerId, scenarioId, report }) {
  const userId = await requireUserId();
  return upsertOne(
    "competition_reports",
    { user_id: userId, match_id: matchId, player_id: playerId, scenario_id: scenarioId, reports: report, scoring: { finalScore: report.finalScore, grade: report.grade }, updated_at: new Date().toISOString() },
    "player_id"
  );
}

export async function loadReportsForMatch(matchId) {
  const userId = await requireUserId();
  const rows = await select("competition_reports", (builder) => builder.eq("user_id", userId).eq("match_id", matchId));
  return Object.fromEntries(rows.map((row) => [row.player_id, row.reports]));
}

export async function saveRanking({ matchId, ranking }) {
  const userId = await requireUserId();
  return upsertOne("competition_rankings", { user_id: userId, match_id: matchId, ranking, updated_at: new Date().toISOString() }, "match_id");
}

export async function loadRanking(matchId) {
  const userId = await requireUserId();
  const rows = await select("competition_rankings", (builder) => builder.eq("user_id", userId).eq("match_id", matchId).limit(1));
  return rows[0]?.ranking || null;
}

// Loads everything useCompetition.js needs to rebuild a CompetitionState
// for one match: its players, every player's current run and report.
export async function loadMatchBundle(matchId) {
  const [players, runsByPlayerId, reportsByPlayerId] = await Promise.all([
    listPlayers(matchId),
    loadRunsForMatch(matchId),
    loadReportsForMatch(matchId),
  ]);
  return { players: safeArray(players), runsByPlayerId, reportsByPlayerId };
}

export const competitionRepository = {
  createMatch,
  listMatches,
  registerPlayer,
  listPlayers,
  saveMatchScenario,
  savePlayerRun,
  loadPlayerRun,
  loadRunsForMatch,
  savePlayerReport,
  loadReportsForMatch,
  saveRanking,
  loadRanking,
  loadMatchBundle,
};
export default competitionRepository;
