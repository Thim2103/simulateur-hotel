// What the MICE desk looks like around a played day, for the DailyReview: the
// quotes that arrived, the events under way, those starting soon and those
// that ended, plus how many quotes still wait for an answer. Null when there
// is nothing to report. See miceEngine.js.
import { safeArray, safeObject } from "../safe";
import { toIsoDate } from "../hotelEvents/hotelEventsEngine";
import { eventsOnDate, eventsStartingSoon, miceEvents, pendingRequests } from "./miceEngine";

export function describeMiceDay(hotelState, date) {
  const state = safeObject(safeObject(hotelState).mice);
  const today = toIsoDate(date);
  const newRequests = safeArray(state.requests).filter((request) => request.receivedOn === today);
  const pending = pendingRequests(hotelState, date).length;
  const running = eventsOnDate(hotelState, date).filter((event) => event.status === "confirmed" || event.completedOn === today);
  const completed = miceEvents(hotelState).filter((event) => event.completedOn === today);
  const startingSoon = eventsStartingSoon(hotelState, date, 3);

  if (newRequests.length === 0 && running.length === 0 && completed.length === 0 && startingSoon.length === 0 && pending === 0) return null;
  return { newRequests, today: running, startingSoon, completed, pending };
}
