import { supabase } from "../../lib/supabase";

// -----------------------------
// 1. Charger les données
// -----------------------------

export async function getRooms() {
  const { data, error } = await supabase.from("rooms").select("*");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getReservations() {
  const { data, error } = await supabase.from("reservations").select("*");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// -----------------------------
// 2. Calculs RM classiques
// -----------------------------

export function occupationRate(rooms = [], reservations = []) {
  const totalRooms = rooms.length;
  const occupied = reservations.filter(
    (r) => r?.status?.toLowerCase() === "confirmée"
  ).length;

  if (totalRooms === 0) return 0;
  return Math.round((occupied / totalRooms) * 100);
}

export function adr(reservations = []) {
  const confirmed = reservations.filter(
    (r) => r?.status?.toLowerCase() === "confirmée"
  );

  if (confirmed.length === 0) return 0;

  let totalRevenue = 0;
  let totalNights = 0;

  confirmed.forEach((r) => {
    const arrival = new Date(r.arrival);
    const departure = new Date(r.departure);
    const nights = (departure - arrival) / (1000 * 60 * 60 * 24);
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
  const confirmed = reservations.filter(
    (r) => r?.status?.toLowerCase() === "confirmée"
  );

  let total = 0;

  confirmed.forEach((r) => {
    const arrival = new Date(r.arrival);
    const departure = new Date(r.departure);
    const nights = (departure - arrival) / (1000 * 60 * 60 * 24);
    const price = Number(r.price) || 0;

    total += nights * price;
  });

  return Math.round(total);
}

// -----------------------------
// 3. Forecast avancé
// -----------------------------

export function forecastAdvanced(reservations = []) {
  const revenue = totalRevenue(reservations);

  return {
    next7: Math.round(revenue * 1.05),
    next30: Math.round(revenue * 1.12),
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

// -----------------------------
// 5. Segmentation RM
// -----------------------------

export function segmentation(reservations = []) {
  const seg = { loisir: 0, business: 0, groupes: 0 };

  reservations.forEach((r) => {
    if (seg[r.segment]) seg[r.segment]++;
  });

  return seg;
}

// -----------------------------
// 6. Revenus par type de chambre
// -----------------------------

export function revenueByRoomType(reservations = []) {
  const map = {};

  reservations.forEach((r) => {
    const arrival = new Date(r.arrival);
    const departure = new Date(r.departure);
    const nights = (departure - arrival) / (1000 * 60 * 60 * 24);
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

export async function getRMStats() {
  const rooms = await getRooms();
  const reservations = await getReservations();

  const revenue = totalRevenue(reservations);

  return {
    occupancy: occupationRate(rooms, reservations),
    adr: adr(reservations),
    revpar: revpar(rooms, reservations),
    revenue,
    forecastAdvanced: forecastAdvanced(reservations),
    pickup: pickup(reservations),
    segmentation: segmentation(reservations),
    revenueByRoomType: revenueByRoomType(reservations),
    heatmap: occupancyHeatmap(reservations),
  };
}
