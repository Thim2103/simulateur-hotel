// Persistence for the Academy module (see supabase/migrations/
// 202609070009_academy_module.sql). Not part of the requested lib/academy/
// file list, but necessary: "assign a scenario", "track group progress"
// and "generate a final report" all imply a teacher's classes survive a
// page reload -- the same reasoning that added restaurantRepository.js/
// scenarioRepository-shaped persistence to earlier modules. Every pure
// academy*.js file stays storage-agnostic; only this file talks to
// Supabase.
import { assertSupabaseConfigured, requireUserId } from "../supabase";
import { safeLoad } from "../safeLoad";
import { safeArray } from "../safe";
import { serializeRunState, deserializeRunState } from "./academyState";

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

export async function createClass({ name }) {
  const userId = await requireUserId();
  return insertOne("academy_classes", { user_id: userId, metadata: { name } });
}

export async function listClasses() {
  const userId = await requireUserId();
  const rows = await select("academy_classes", (builder) => builder.eq("user_id", userId).order("created_at"));
  return rows.map((row) => ({ id: row.id, name: row.metadata?.name, teacherId: row.user_id, createdAt: row.created_at }));
}

export async function createGroup({ classId, name, memberNames = [] }) {
  const userId = await requireUserId();
  const row = await insertOne("academy_groups", { user_id: userId, class_id: classId, metadata: { name, memberNames } });
  return { id: row.id, classId: row.class_id, name: row.metadata?.name, memberNames: row.metadata?.memberNames || [] };
}

export async function listGroups(classId) {
  const userId = await requireUserId();
  const rows = await select("academy_groups", (builder) => builder.eq("user_id", userId).eq("class_id", classId).order("created_at"));
  return rows.map((row) => ({ id: row.id, classId: row.class_id, name: row.metadata?.name, memberNames: row.metadata?.memberNames || [] }));
}

export async function createAssignment({ classId, scenario, dueAt = null }) {
  const userId = await requireUserId();
  const row = await insertOne("academy_assignments", {
    user_id: userId,
    class_id: classId,
    scenario_id: scenario.id,
    metadata: { scenario, dueAt },
  });
  return { id: row.id, classId: row.class_id, scenarioId: row.scenario_id, scenario: row.metadata?.scenario, dueAt: row.metadata?.dueAt, assignedAt: row.created_at };
}

export async function listAssignments(classId) {
  const userId = await requireUserId();
  const rows = await select("academy_assignments", (builder) => builder.eq("user_id", userId).eq("class_id", classId).order("created_at"));
  return rows.map((row) => ({ id: row.id, classId: row.class_id, scenarioId: row.scenario_id, scenario: row.metadata?.scenario, dueAt: row.metadata?.dueAt, assignedAt: row.created_at }));
}

// Upserts a group's ScenarioRunState (one row per group, see the unique
// index on group_id).
export async function saveGroupRun({ classId, groupId, scenarioId, runState }) {
  const userId = await requireUserId();
  return upsertOne(
    "academy_runs",
    { user_id: userId, class_id: classId, group_id: groupId, scenario_id: scenarioId, run_state: serializeRunState(runState), updated_at: new Date().toISOString() },
    "group_id"
  );
}

export async function loadGroupRun(groupId) {
  const userId = await requireUserId();
  const rows = await select("academy_runs", (builder) => builder.eq("user_id", userId).eq("group_id", groupId).limit(1));
  const row = rows[0];
  return row ? deserializeRunState(row.run_state) : null;
}

export async function loadRunsForClass(classId) {
  const userId = await requireUserId();
  const rows = await select("academy_runs", (builder) => builder.eq("user_id", userId).eq("class_id", classId));
  return Object.fromEntries(rows.map((row) => [row.group_id, deserializeRunState(row.run_state)]));
}

export async function saveGroupReport({ classId, groupId, scenarioId, report }) {
  const userId = await requireUserId();
  return upsertOne(
    "academy_reports",
    { user_id: userId, class_id: classId, group_id: groupId, scenario_id: scenarioId, reports: report, scoring: { finalScore: report.finalScore, grade: report.grade }, updated_at: new Date().toISOString() },
    "group_id"
  );
}

export async function loadReportsForClass(classId) {
  const userId = await requireUserId();
  const rows = await select("academy_reports", (builder) => builder.eq("user_id", userId).eq("class_id", classId));
  return Object.fromEntries(rows.map((row) => [row.group_id, row.reports]));
}

// Loads everything useAcademy.js needs to rebuild an AcademyState for one
// class: the class itself, its groups, its assignments and every group's
// current run.
export async function loadClassBundle(classId) {
  const [groups, assignments, runsByGroupId, reportsByGroupId] = await Promise.all([
    listGroups(classId),
    listAssignments(classId),
    loadRunsForClass(classId),
    loadReportsForClass(classId),
  ]);
  return { groups: safeArray(groups), assignments: safeArray(assignments), runsByGroupId, reportsByGroupId };
}

export const academyRepository = {
  createClass,
  listClasses,
  createGroup,
  listGroups,
  createAssignment,
  listAssignments,
  saveGroupRun,
  loadGroupRun,
  loadRunsForClass,
  saveGroupReport,
  loadReportsForClass,
  loadClassBundle,
};
export default academyRepository;
