// Mock data mirroring defaultRestaurantState, used as an offline fallback
// when Supabase is unreachable/misconfigured.
import { defaultRestaurantState } from "../lib/legacyRestaurantSimulator";

export const mockRestaurantState = {
  ...defaultRestaurantState,
  structure: { ...defaultRestaurantState.structure },
  finance: { ...defaultRestaurantState.finance },
  staff: [...defaultRestaurantState.staff],
  menu: [...defaultRestaurantState.menu],
  operations: [...defaultRestaurantState.operations],
  marketing: { ...defaultRestaurantState.marketing },
  esg: { ...defaultRestaurantState.esg },
  expansion: { ...defaultRestaurantState.expansion },
  pmsContext: { ...defaultRestaurantState.pmsContext },
  progression: { ...defaultRestaurantState.progression },
};

export default mockRestaurantState;
