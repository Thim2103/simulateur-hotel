// Catalogue of every daily event the simulator can roll. Each entry is a
// definition: { id, name, category, probability(state), conditions(state),
// apply(state, context), impact, duration }. See eventHandlers/*.js for the
// individual implementations and eventEngine.js for how they're rolled and
// combined.
import { weatherEvent } from "./eventHandlers/weather";
import { vipGuestEvent } from "./eventHandlers/vipGuest";
import { restaurantRushEvent } from "./eventHandlers/restaurantRush";
import { healthInspectionEvent } from "./eventHandlers/healthInspection";
import { powerOutageEvent } from "./eventHandlers/powerOutage";
import { staffStrikeEvent } from "./eventHandlers/staffStrike";
import { customerReviewsEvent } from "./eventHandlers/customerReviews";
import { technicalIncidentsEvent } from "./eventHandlers/technicalIncidents";
import { localEventsEvent } from "./eventHandlers/localEvents";

export const EVENT_DEFINITIONS = [
  weatherEvent,
  vipGuestEvent,
  restaurantRushEvent,
  healthInspectionEvent,
  powerOutageEvent,
  staffStrikeEvent,
  customerReviewsEvent,
  technicalIncidentsEvent,
  localEventsEvent,
];

export const eventDefinitionsById = Object.fromEntries(EVENT_DEFINITIONS.map((definition) => [definition.id, definition]));
