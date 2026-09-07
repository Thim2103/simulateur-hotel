// Mock data mirroring defaultHotelState, used as an offline fallback
// when Supabase and the localStorage cache are both unavailable.
import { defaultHotelState } from "../lib/hotel";

export const mockHotelState = {
  ...defaultHotelState,
  structure: { ...defaultHotelState.structure },
  finance: { ...defaultHotelState.finance },
  marketing: { ...defaultHotelState.marketing },
  esg: { ...defaultHotelState.esg },
  expansion: { ...defaultHotelState.expansion },
  progression: { ...defaultHotelState.progression },
};

export default mockHotelState;
