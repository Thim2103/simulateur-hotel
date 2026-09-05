import { assertSupabaseConfigured } from "../../lib/supabase";
import { listReservations } from "../../lib/restaurantRepository";

// -----------------------------
// 1. Charger les données
// -----------------------------

export async function getRooms() {
  const { data, error } = await assertSupabaseConfigured().from("rooms").select("*");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getReservations() {
  return listReservations();
}

// -----------------------------
// 2. Calculs RM classiques
// -----------------------------

export function occupationRate(rooms = [], reservations = []) {
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const safeReservations = Array.isArray(reservations) ? reservations : [];
  return pmsOccupancy(safeRooms, safeReservations);
}

const DAY_MS = 1000 * 60 * 60 * 24;

function isConfirmed(reservation) {
  const status = String(reservation?.status || "").toLowerCase();
  return status.includes("confirm") || status === "booked";
}

function reservationNights(reservation) {
  const nights = (new Date(reservation.departure) - new Date(reservation.arrival)) / DAY_MS;
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

function reservationSegment(reservation) {
  const value = String(reservation?.segment || reservation?.market_segment || "").toLowerCase();
  if (value.includes("corpor") || value.includes("business")) return "corporate";
  if (value.includes("ota") || value.includes("online")) return "ota";
  if (value.includes("group") || value.includes("groupe")) return "groups";
  return "leisure";
}

function reservationChannel(reservation) {
  const value = String(reservation?.channel || reservation?.source || "").toLowerCase();
  if (value.includes("ota") || value.includes("booking") || value.includes("expedia")) return "ota";
  if (value.includes("corpor")) return "corporate";
  if (value.includes("agency") || value.includes("agence")) return "agency";
  return "direct";
}

export function pmsOccupancy(rooms = [], reservations = []) {
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const safeReservations = Array.isArray(reservations) ? reservations : [];

  if (!safeRooms.length) return 0;

  const confirmed = safeReservations.filter(isConfirmed);
  const occupiedKeys = new Set();
  const occupiedDays = new Set();

  confirmed.forEach((reservation) => {
    const arrival = new Date(reservation.arrival);
    const nights = reservationNights(reservation);
    const roomKey = String(reservation.room_id ?? reservation.roomId ?? reservation.room_number ?? reservation.room_type ?? reservation.id ?? "unknown");

    for (let index = 0; index < nights; index += 1) {
      const day = new Date(arrival);
      day.setDate(day.getDate() + index);
      const key = `${day.toISOString().split("T")[0]}::${roomKey}`;
      occupiedKeys.add(key);
      occupiedDays.add(day.toISOString().split("T")[0]);
    }
  });

  if (!occupiedKeys.size || !occupiedDays.size) return 0;

  const numerator = occupiedKeys.size;
  const denominator = safeRooms.length * occupiedDays.size;
  return Math.round(Math.min(100, (numerator / denominator) * 100));
}

export function adr(reservations = []) {
  const confirmed = reservations.filter(isConfirmed);

  if (confirmed.length === 0) return 0;

  let totalRevenue = 0;
  let totalNights = 0;

  confirmed.forEach((r) => {
    const arrival = new Date(r.arrival);
    const departure = new Date(r.departure);
    const nights = (departure - arrival) / DAY_MS;
    const price = Number(r.price) || 0;

    totalRevenue += nights * price;
    totalNights += nights;
  });

  if (totalNights === 0) return 0;

  return Math.round(totalRevenue / totalNights);
}

export function revpar(rooms = [], reservations = []) {
  const adrValue = adr(reservations);
  const occ = occupationRate(rooms, reservations) / 100;
  return Math.round(adrValue * occ);
}

export function totalRevenue(reservations = []) {
  const confirmed = reservations.filter(isConfirmed);

  let total = 0;

  confirmed.forEach((r) => {
    const arrival = new Date(r.arrival);
    const departure = new Date(r.departure);
    const nights = (departure - arrival) / DAY_MS;
    const price = Number(r.price) || 0;

    total += nights * price;
  });

  return Math.round(total);
}

// -----------------------------
// 3. Forecast avancé
// -----------------------------

export function forecastAdvanced(reservations = [], restaurantDemand = 0) {
  const confirmed = reservations.filter(isConfirmed);
  const revenue = totalRevenue(confirmed);
  const dates = confirmed.flatMap((reservation) => [new Date(reservation.arrival), new Date(reservation.departure)]).filter((date) => !Number.isNaN(date.getTime()));
  const historyDays = dates.length ? Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / DAY_MS)) : 30;
  const dailyRunRate = revenue / historyDays;
  const demandFactor = 1 + Math.max(0, Number(restaurantDemand) - 50) / 500;
  return {
    next7: Math.round(dailyRunRate * 7 * demandFactor),
    next30: Math.round(dailyRunRate * 30 * demandFactor),
    next90: Math.round(dailyRunRate * 90 * demandFactor),
    dailyRunRate: Math.round(dailyRunRate),
  };
}

// -----------------------------
// 4. Pick-up (réservations créées par jour)
// -----------------------------

export function pickup(reservations = []) {
  const map = {};

  reservations.forEach((r) => {
    if (!r.created_at) return;
    const day = r.created_at.split("T")[0];
    map[day] = (map[day] || 0) + 1;
  });

  return map;
}

export function pickupCurve(reservations = []) {
  const daily = pickup(reservations);
  const labels = Object.keys(daily).sort();
  return labels.map((date, index) => ({
    date,
    value: daily[date],
    delta: index === 0 ? daily[date] : daily[date] - daily[labels[index - 1]],
  }));
}

// -----------------------------
// 5. Segmentation RM
// -----------------------------

export function segmentation(reservations = []) {
  const seg = { corporate: 0, leisure: 0, ota: 0, groups: 0 };

  reservations.forEach((r) => {
    seg[reservationSegment(r)] += 1;
  });

  return seg;
}

export function channelYield(reservations = []) {
  const channels = {};
  reservations.filter(isConfirmed).forEach((reservation) => {
    const channel = reservationChannel(reservation);
    const nights = reservationNights(reservation);
    const grossRevenue = nights * (Number(reservation.price) || 0);
    const commissionRate = channel === "ota" ? 0.18 : channel === "agency" ? 0.1 : channel === "corporate" ? 0.05 : 0;
    const netRevenue = grossRevenue * (1 - commissionRate);
    if (!channels[channel]) channels[channel] = { reservations: 0, roomNights: 0, grossRevenue: 0, netRevenue: 0, adr: 0, yield: "stable" };
    channels[channel].reservations += 1;
    channels[channel].roomNights += nights;
    channels[channel].grossRevenue += grossRevenue;
    channels[channel].netRevenue += netRevenue;
  });
  Object.values(channels).forEach((channel) => {
    channel.adr = channel.roomNights ? Math.round(channel.grossRevenue / channel.roomNights) : 0;
    channel.grossRevenue = Math.round(channel.grossRevenue);
    channel.netRevenue = Math.round(channel.netRevenue);
    channel.yield = channel.adr >= 120 ? "premium" : channel.adr < 80 ? "stimulate" : "stable";
    channel.priceMultiplier = channel.yield === "premium" ? 1.1 : channel.yield === "stimulate" ? 0.9 : 1;
    channel.recommendedAdr = Math.round(channel.adr * channel.priceMultiplier);
  });
  return channels;
}

export function revpash(restaurantMetrics = {}) {
  const averageTicket = Number(restaurantMetrics.avgTicket || 0);
  const demand = Math.max(0, Math.min(100, Number(restaurantMetrics.demand || 0)));
  return Math.round(averageTicket * (demand / 100) * 100) / 100;
}

export function filterReservations(reservations = [], filters = {}) {
  return reservations.filter((reservation) => {
    const arrival = String(reservation.arrival || "").slice(0, 10);
    return (!filters.startDate || arrival >= filters.startDate) &&
      (!filters.endDate || arrival <= filters.endDate) &&
      (!filters.roomType || reservation.room_type === filters.roomType) &&
      (!filters.segment || reservationSegment(reservation) === filters.segment) &&
      (!filters.channel || reservationChannel(reservation) === filters.channel) &&
      (!filters.status || String(reservation.status || "").toLowerCase() === filters.status.toLowerCase());
  });
}

// -----------------------------
// 6. Revenus par type de chambre
// -----------------------------

export function revenueByRoomType(reservations = []) {
  const map = {};

  reservations.forEach((r) => {
    const arrival = new Date(r.arrival);
    const departure = new Date(r.departure);
    const nights = (departure - arrival) / DAY_MS;
    const price = Number(r.price) || 0;

    map[r.room_type] = (map[r.room_type] || 0) + nights * price;
  });

  return map;
}

// -----------------------------
// 7. Heatmap d’occupation (par date)
// -----------------------------

export function occupancyHeatmap(reservations = []) {
  const map = {};

  reservations.forEach((r) => {
    const arrival = new Date(r.arrival);
    const departure = new Date(r.departure);

    for (
      let d = new Date(arrival);
      d < departure;
      d.setDate(d.getDate() + 1)
    ) {
      const day = d.toISOString().split("T")[0];
      map[day] = (map[day] || 0) + 1;
    }
  });

  return map;
}

// -----------------------------
// 8. Fonction globale RM
// -----------------------------

export async function getRMStats(filters = {}, restaurantMetrics = {}) {
  const rooms = await getRooms();
  const reservations = filterReservations(await getReservations(), filters);
  const restaurantDemand = Number(restaurantMetrics.demand || 0);

  const revenue = totalRevenue(reservations);

  return {
    occupancy: occupationRate(rooms, reservations),
    adr: adr(reservations),
    revpar: revpar(rooms, reservations),
    revenue,
    forecastAdvanced: forecastAdvanced(reservations, restaurantDemand),
    pickup: pickup(reservations),
    pickupCurve: pickupCurve(reservations),
    segmentation: segmentation(reservations),
    channelYield: channelYield(reservations),
    restaurantDemand,
    revpash: revpash(restaurantMetrics),
    combinedDemand: Math.round((occupationRate(rooms, reservations) + restaurantDemand) / 2),
    revenueByRoomType: revenueByRoomType(reservations),
    heatmap: occupancyHeatmap(reservations),
  };
}
