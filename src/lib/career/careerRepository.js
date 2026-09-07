// Persistence for the Solo/Career module (see supabase/migrations/
// 202609080001_career_module.sql). Not part of the requested
// lib/career/ file list, but necessary for the same reason every other
// mode's repository was: a career has to survive a page reload. Reads/
// writes the single career_state snapshot per user -- the other 6 tables
// the migration creates exist for a future normalized audit trail (see
// that migration's header) and aren't written here yet.
import { assertSupabaseConfigured, requireUserId } from "../supabase";
import { safeLoad } from "../safeLoad";
import { deserializeCareerState, serializeCareerState } from "./careerState";

export async function saveCareerState(state) {
  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const serialized = serializeCareerState(state);

  const { error } = await client.from("career_state").upsert(
    {
      user_id: userId,
      state: { playerId: serialized.playerId, status: serialized.status, day: serialized.day, hotel: serialized.hotel, activeMiniScenario: serialized.activeMiniScenario, lastDayReport: serialized.lastDayReport, lastAnalysis: serialized.lastAnalysis, replayLog: serialized.replayLog, scoreHistory: serialized.scoreHistory },
      progression: {},
      missions: serialized.missions,
      objectives: serialized.objectives,
      storyline: serialized.storyline,
      skills: serialized.skills,
      rewards: serialized.rewardsInbox,
      metadata: { claimedRewardIds: serialized.claimedRewardIds },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function loadCareerState() {
  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("career_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) return null;

      return deserializeCareerState({
        ...row.state,
        missions: row.missions,
        objectives: row.objectives,
        storyline: row.storyline,
        skills: row.skills,
        rewardsInbox: row.rewards,
        claimedRewardIds: row.metadata?.claimedRewardIds || [],
      });
    },
    null,
    { label: "select:career_state" }
  );
}

export const careerRepository = { saveCareerState, loadCareerState };
export default careerRepository;
