import { listReservations, listRooms } from "../pmsRepository";

// -----------------------------
// 1. Charger les données
// -----------------------------

export async function getRooms() {
  return listRooms();
}

export async function getReservations() {
  return listReservations();
}

export function normalizeReservation(reservation = {}) {
  return {
    ...reservation,
    arrival: reservation.arrival ?? reservation.check_in ?? reservation.checkIn,
    departure: reservation.departure ?? reservation.check_out ?? reservation.checkOut,
    price: Number(reservation.price ?? reservation.rate ?? reservation.room_rate ?? 0),
    room_id: reservation.room_id ?? reservation.roomId ?? reservation.room_number ?? reservation.room,
  };
}

export function normalizeRMData(data = {}) {
  return {
    rooms: Array.isArray(data.rooms) ? data.rooms : [],
    reservations: Array.isArray(data.reservations) ? data.reservations.map(normalizeReservation) : [],
  };
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

export function forecastPlaceholder() {
  return {
    next30: null,
    next90: null,
    daily: [],
    source: "supabase",
    status: "pending",
  };
}

// One entry per day: share of rooms occupied by a confirmed reservation.
export function dailyOccupancyFeed(rooms = [], reservations = [], days = 14, referenceDate = new Date()) {
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const confirmed = (Array.isArray(reservations) ? reservations : []).filter(isConfirmed);
  const feed = [];

  for (let index = 0; index < days; index += 1) {
    const day = new Date(referenceDate);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + index);
    const dayString = day.toISOString().split("T")[0];

    const occupiedRoomIds = new Set(
      confirmed
        .filter((reservation) => dayString >= String(reservation.arrival || "").slice(0, 10) && dayString < String(reservation.departure || "").slice(0, 10))
        .map((reservation) => String(reservation.room_id ?? reservation.roomId ?? reservation.room))
    );

    feed.push({
      date: dayString,
      occupancy: safeRooms.length ? Math.round(Math.min(100, (occupiedRoomIds.size / safeRooms.length) * 100)) : 0,
    });
  }

  return feed;
}

export function buildRMKpis(rooms = [], reservations = [], restaurantMetrics = {}) {
  const occupancy = occupationRate(rooms, reservations);
  const restaurantDemand = Math.max(0, Math.min(100, Number(restaurantMetrics.demand || 0)));
  return {
    adr: adr(reservations),
    revpar: revpar(rooms, reservations),
    occupancy,
    restaurantDemand,
    combinedDemand: Math.round((occupancy + restaurantDemand) / 2),
    currency: "EUR",
    source: "supabase",
  };
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

const WEEKDAY_LABELS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

function dailyRevenueSeries(reservations = []) {
  const map = {};
  reservations.filter(isConfirmed).forEach((reservation) => {
    const arrival = new Date(reservation.arrival);
    const nights = reservationNights(reservation);
    const price = Number(reservation.price) || 0;
    for (let index = 0; index < nights; index += 1) {
      const day = new Date(arrival);
      day.setDate(day.getDate() + index);
      const key = day.toISOString().split("T")[0];
      map[key] = (map[key] || 0) + price;
    }
  });
  return map;
}

// Weekday demand curve: average revenue per weekday relative to the overall daily average.
export function seasonalityFactors(reservations = []) {
  const series = dailyRevenueSeries(reservations);
  const days = Object.keys(series);
  if (!days.length) return WEEKDAY_LABELS.reduce((acc, label) => ({ ...acc, [label]: 1 }), {});

  const totals = Array(7).fill(0);
  const counts = Array(7).fill(0);
  days.forEach((day) => {
    const weekday = new Date(day).getDay();
    totals[weekday] += series[day];
    counts[weekday] += 1;
  });
  const overallAvg = days.reduce((sum, day) => sum + series[day], 0) / days.length;

  const factors = {};
  WEEKDAY_LABELS.forEach((label, index) => {
    const avg = counts[index] ? totals[index] / counts[index] : overallAvg;
    factors[label] = overallAvg ? Math.round((avg / overallAvg) * 100) / 100 : 1;
  });
  return factors;
}

// 30/90-day forecast built from demand curves, weekday seasonality, and occupancy-based adjustment.
export function forecastEngine(reservations = [], rooms = [], restaurantDemand = 0) {
  const confirmed = reservations.filter(isConfirmed);
  const revenue = totalRevenue(confirmed);
  const dates = confirmed.flatMap((reservation) => [new Date(reservation.arrival), new Date(reservation.departure)]).filter((date) => !Number.isNaN(date.getTime()));
  const historyDays = dates.length ? Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / DAY_MS)) : 30;
  const dailyRunRate = revenue / historyDays;
  const seasonality = seasonalityFactors(confirmed);
  const occupancy = occupationRate(rooms, confirmed);
  const occupancyAdjustment = 1 + Math.max(-0.15, Math.min(0.15, (occupancy - 60) / 200));
  const demandFactor = 1 + Math.max(0, Number(restaurantDemand) - 50) / 500;
  const lastArrival = dates.length ? new Date(Math.max(...dates)) : new Date();

  const buildHorizon = (horizonDays) => {
    const daily = [];
    let total = 0;
    for (let index = 1; index <= horizonDays; index += 1) {
      const day = new Date(lastArrival);
      day.setDate(day.getDate() + index);
      const label = WEEKDAY_LABELS[day.getDay()];
      const value = Math.round(dailyRunRate * (seasonality[label] ?? 1) * occupancyAdjustment * demandFactor);
      daily.push({ date: day.toISOString().split("T")[0], value });
      total += value;
    }
    return { total, daily };
  };

  const horizon30 = buildHorizon(30);
  const horizon90 = buildHorizon(90);

  return {
    next30: horizon30.total,
    next90: horizon90.total,
    daily30: horizon30.daily,
    daily90: horizon90.daily,
    dailyRunRate: Math.round(dailyRunRate),
    seasonality,
    occupancyAdjustment: Math.round(occupancyAdjustment * 100) / 100,
    demandFactor: Math.round(demandFactor * 100) / 100,
    status: "ready",
    source: "internal",
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

// Booking pace: average and cumulative reservations created, used to gauge how fast demand is building.
export function bookingPace(reservations = []) {
  const curve = pickupCurve(reservations);
  const cumulative = curve.reduce((sum, point) => sum + point.value, 0);
  const averagePerDay = curve.length ? Math.round((cumulative / curve.length) * 10) / 10 : 0;
  return { averagePerDay, cumulative, days: curve.length };
}

// Trend of the most recent pickup deltas: "up", "down", or "stable".
export function pickupTrend(reservations = []) {
  const curve = pickupCurve(reservations);
  if (curve.length < 2) return "stable";
  const recent = curve.slice(-Math.min(7, curve.length));
  const trendSum = recent.reduce((sum, point) => sum + point.delta, 0);
  if (trendSum > 0) return "up";
  if (trendSum < 0) return "down";
  return "stable";
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

// Per-segment revenue/ADR and share of total revenue (the segmentation demand mix).
export function segmentPerformance(reservations = []) {
  const segments = {};
  reservations.filter(isConfirmed).forEach((reservation) => {
    const segment = reservationSegment(reservation);
    const nights = reservationNights(reservation);
    const revenue = nights * (Number(reservation.price) || 0);
    if (!segments[segment]) segments[segment] = { reservations: 0, roomNights: 0, revenue: 0, adr: 0, mixShare: 0 };
    segments[segment].reservations += 1;
    segments[segment].roomNights += nights;
    segments[segment].revenue += revenue;
  });
  const totalSegmentRevenue = Object.values(segments).reduce((sum, segment) => sum + segment.revenue, 0);
  Object.values(segments).forEach((segment) => {
    segment.adr = segment.roomNights ? Math.round(segment.revenue / segment.roomNights) : 0;
    segment.mixShare = totalSegmentRevenue ? Math.round((segment.revenue / totalSegmentRevenue) * 1000) / 10 : 0;
    segment.revenue = Math.round(segment.revenue);
  });
  return segments;
}

// How the current segment mix pulls ADR above or below the blended (overall) ADR.
export function segmentMixImpact(reservations = []) {
  const performance = segmentPerformance(reservations);
  const blendedAdr = adr(reservations);
  const bySegment = {};
  Object.entries(performance).forEach(([segment, data]) => {
    bySegment[segment] = {
      mixShare: data.mixShare,
      adr: data.adr,
      adrDelta: blendedAdr ? Math.round(((data.adr - blendedAdr) / blendedAdr) * 1000) / 10 : 0,
    };
  });
  return { blendedAdr, bySegment };
}

export function channelYield(reservations = [], occupancy = 50) {
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

  // BAR logic: the direct channel's ADR is the Best Available Rate reference (fallback to blended ADR).
  const barRate = channels.direct?.adr || Math.round(reservations.filter(isConfirmed).reduce((sum, r) => sum + (Number(r.price) || 0), 0) / Math.max(1, reservations.filter(isConfirmed).length));
  const occupancyAdjustment = occupancy > 80 ? 1.08 : occupancy < 40 ? 0.92 : 1;
  Object.entries(channels).forEach(([channelName, channel]) => {
    channel.barRate = barRate;
    const targetRate = channelName === "ota"
      ? Math.round(barRate * 1.15) // OTA uplift recaptures commission loss
      : channelName === "corporate"
        ? Math.round(barRate * 0.9) // corporate negotiated rate
        : channelName === "agency"
          ? Math.round(barRate * 0.92)
          : barRate;
    channel.strategyRate = targetRate;
    channel.dynamicRate = Math.round(targetRate * occupancyAdjustment);
  });

  return channels;
}

export function revpash(restaurantMetrics = {}) {
  const averageTicket = Number(restaurantMetrics.avgTicket || 0);
  const demand = Math.max(0, Math.min(100, Number(restaurantMetrics.demand || 0)));
  return Math.round(averageTicket * (demand / 100) * 100) / 100;
}

export function restaurantRevenue(restaurantMetrics = {}) {
  return Math.round(Number(restaurantMetrics.totalMonthlyRevenue || restaurantMetrics.revenue || 0));
}

export function integratedHotelReputation(restaurantMetrics = {}) {
  const satisfaction = Math.max(0, Math.min(5, Number(restaurantMetrics.customerSatisfaction || restaurantMetrics.satisfaction || 0)));
  const demand = Math.max(0, Math.min(100, Number(restaurantMetrics.demand || 0)));
  return Math.round(satisfaction * 12 + demand * 0.2);
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

export async function getRMStats(filters = {}, restaurantMetrics = {}, hotelMetrics = {}) {
  const data = normalizeRMData({
    rooms: await listRooms(),
    reservations: await listReservations(),
  });
  const rooms = data.rooms;
  const reservations = filterReservations(data.reservations, filters);
  const restaurantDemand = Number(restaurantMetrics.demand || 0);
  const marketingReach = Number(hotelMetrics.marketingReach || 0);
  const sustainabilityScore = Number(hotelMetrics.sustainabilityScore || 0);

  const revenue = totalRevenue(reservations);
  const baseOccupancy = occupationRate(rooms, reservations);
  const restaurantRevenueValue = restaurantRevenue(restaurantMetrics);
  const restaurantSatisfaction = Number(restaurantMetrics.customerSatisfaction || restaurantMetrics.satisfaction || 0);
  const integratedOccupancy = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        baseOccupancy + (restaurantDemand - 50) * 0.1 + (marketingReach - 50) * 0.08 + (sustainabilityScore - 50) * 0.03
      )
    )
  );
  const kpis = buildRMKpis(rooms, reservations, restaurantMetrics);
  const dailyOccupancy = dailyOccupancyFeed(rooms, reservations);
  const combinedDemand = Math.round((integratedOccupancy + restaurantDemand + (marketingReach || integratedOccupancy)) / 3);

  return {
    kpis: { ...kpis, occupancy: integratedOccupancy, combinedDemand },
    forecast: forecastEngine(reservations, rooms, restaurantDemand),
    dailyOccupancy,
    occupancy: integratedOccupancy,
    adr: kpis.adr,
    revpar: kpis.revpar,
    revenue,
    forecastAdvanced: forecastAdvanced(reservations, restaurantDemand),
    pickup: pickup(reservations),
    pickupCurve: pickupCurve(reservations),
    pickupFeed: pickupCurve(reservations),
    bookingPace: bookingPace(reservations),
    pickupTrend: pickupTrend(reservations),
    segmentation: segmentation(reservations),
    segmentPerformance: segmentPerformance(reservations),
    segmentMixImpact: segmentMixImpact(reservations),
    channelYield: channelYield(reservations, integratedOccupancy),
    restaurantDemand,
    restaurantRevenue: restaurantRevenueValue,
    restaurantSatisfaction,
    reputation: integratedHotelReputation(restaurantMetrics),
    revpash: revpash(restaurantMetrics),
    combinedDemand,
    revenueByRoomType: revenueByRoomType(reservations),
    heatmap: occupancyHeatmap(reservations),
  };
}
