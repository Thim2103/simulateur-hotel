import { safeArray, safeNumber, safeObject } from "../safe";
import { treasuryOf } from "../finance/investmentFunding";
import { careerReferenceDate } from "../career/careerEngine";
import { describeCalendar } from "../hotelEvents/hotelEventsEngine";
import { listReviews, unansweredNegativeReviews } from "../clients/guestReviewEngine";
import { describeVipGuests } from "../clients/vipServiceEngine";
import { isMeetingRoom, pendingRequests } from "../mice/miceEngine";
import { describeActiveCrisis } from "../mediaCrisis/mediaCrisisEngine";

// What the top bar keeps in view at all times, and what the notification
// centre lists, read straight off the career's hotel: treasury, the date and
// season, tonight's occupancy, the guests' average rating and the things that
// need the player now. Pure: no state, no clock (the date is the career's).

const round1 = (value) => Math.round(value * 10) / 10;

// Occupancy of the rooms guests can sleep in (a meeting room is not one).
export function occupancyOf(rooms) {
  const beds = safeArray(rooms).filter((room) => !isMeetingRoom(room));
  const occupied = beds.filter((room) => room.status === "occupée").length;
  return { occupied, total: beds.length, rate: beds.length > 0 ? Math.round((occupied / beds.length) * 100) : 0 };
}

// The average of every review's stars (1..5), or null when there is none.
export function ratingOf(hotelState) {
  const ratings = listReviews(hotelState).map((review) => safeNumber(review.rating, NaN)).filter(Number.isFinite);
  if (ratings.length === 0) return { average: null, count: 0 };
  return { average: round1(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length), count: ratings.length };
}

// The urgent things, most pressing first: breakdowns to repair (a critical one
// weighs more), V.I.P.s in the hotel nobody has looked after, bad reviews
// without an answer, seminar quotes to answer, messages at the GM Desk.
// Each: { id, kind, tone, icon, count, label, to }.
export function urgentItems(careerState, { gmMessages = 0 } = {}) {
  const hotel = safeObject(careerState?.hotel);
  const hotelState = safeObject(hotel.hotelState);
  const date = careerReferenceDate(careerState);
  const items = [];

  // A media crisis comes first, and shouts until the player has answered it.
  const crisis = describeActiveCrisis(hotelState, date);
  if (crisis) {
    items.push({
      id: "crisis",
      kind: "crisis",
      tone: crisis.decided ? "vip" : "danger",
      icon: "🚨",
      count: 1,
      priority: !crisis.decided,
      label: crisis.decided ? `Crise médiatique en cours : ${crisis.title}` : `Crise médiatique : ${crisis.title}. Répondez !`,
      to: "/dashboard#crisis",
    });
  }

  const breakdowns = safeArray(hotelState.activeIncidents).filter((incident) => incident.status === "active");
  const critical = breakdowns.filter((incident) => incident.severity === "critical").length;
  if (breakdowns.length > 0) {
    items.push({
      id: "incidents",
      kind: "incident",
      tone: "danger",
      icon: "🔧",
      count: breakdowns.length,
      label: critical > 0 ? `${breakdowns.length} panne${breakdowns.length > 1 ? "s" : ""} à réparer dont ${critical} critique${critical > 1 ? "s" : ""}` : `${breakdowns.length} panne${breakdowns.length > 1 ? "s" : ""} à réparer`,
      to: "/dashboard#hotel-plan",
    });
  }

  const vipToWelcome = describeVipGuests({ hotelState, reservations: hotel.reservations, rooms: hotel.rooms, date }).filter((guest) => guest.attentions.length === 0);
  if (vipToWelcome.length > 0) {
    items.push({
      id: "vip",
      kind: "vip",
      tone: "vip",
      icon: "👑",
      count: vipToWelcome.length,
      label: `${vipToWelcome.length} V.I.P. à accueillir${vipToWelcome.length === 1 ? ` : ${vipToWelcome[0].guestName}` : ""}`,
      to: "/dashboard#hotel-plan",
    });
  }

  const badReviews = unansweredNegativeReviews(hotelState).length;
  if (badReviews > 0) {
    items.push({ id: "reviews", kind: "review", tone: "danger", icon: "⭐", count: badReviews, label: `${badReviews} avis négatif${badReviews > 1 ? "s" : ""} sans réponse`, to: "/clients/reviews" });
  }

  const quotes = pendingRequests(hotelState, date).length;
  if (quotes > 0) {
    items.push({ id: "mice", kind: "mice", tone: "mice", icon: "🤝", count: quotes, label: `${quotes} devis séminaire en attente`, to: "/corporate/events" });
  }

  if (gmMessages > 0) {
    items.push({ id: "gm", kind: "gm", tone: "action", icon: "📬", count: gmMessages, label: `${gmMessages} message${gmMessages > 1 ? "s" : ""} au GM Desk`, to: "/gm-desk" });
  }

  return items;
}

// null until there is a career (nothing to keep in view before that).
export function buildStatusSummary(careerState, { gmMessages = 0 } = {}) {
  if (!careerState?.hotel) return null;
  const hotelState = careerState.hotel.hotelState;
  const date = careerReferenceDate(careerState);
  const calendar = describeCalendar(date, hotelState);
  const notifications = urgentItems(careerState, { gmMessages });
  return {
    day: safeNumber(careerState.day, 0),
    date: calendar.date,
    season: calendar.season,
    ongoingEvents: calendar.ongoing,
    treasury: treasuryOf(hotelState),
    occupancy: occupancyOf(careerState.hotel.rooms),
    rating: ratingOf(hotelState),
    notifications,
    notificationCount: notifications.reduce((sum, item) => sum + item.count, 0),
  };
}

export default buildStatusSummary;
