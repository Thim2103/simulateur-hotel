import { supabase } from "../../lib/supabase";

// -----------------------------
// 1. Charger les données
// -----------------------------

export async function getRooms() {
  const { data, error } = await supabase.from("rooms").select("*");
  if (error) throw error;
  return data || [];
}

export async function getReservations() {
  const { data, error } = await supabase.from("reservations").select("*");
  if (error) throw error;
  return data || [];
}

// -----------------------------
// 2. Calculs RM (sécurisés)
// -----------------------------

export function occupationRate(rooms = [], reservations = []) {
  const totalRooms = rooms.length;
  const occupied = reservations.filter((r) => r.status === "confirmée").length;
  if (totalRooms === 0) return 0;
  return Math.round((occupied / totalRooms) * 100);
}

export function adr(reservations = []) {
  const confirmed = reservations.filter((r) => r.status === "confirmée");
  if (confirmed.length === 0) return 0;

  let totalRevenue = 0;
  let totalNights = 0;

  confirmed.forEach((r) => {
    const nights =
      (new Date(r.departure) - new Date(r.arrival)) / (1000 * 60 * 60 * 24);
    totalRevenue += nights * (Number(r.price) || 0);
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
  const confirmed = reservations.filter((r) => r.status === "confirmée");

  let total = 0;
  confirmed.forEach((r) => {
    const nights =
      (new Date(r.departure) - new Date(r.arrival)) / (1000 * 60 * 60 * 24);
    total += nights * (Number(r.price) || 0);
  });

  return Math.round(total);
}

// -----------------------------
// 3. Prévision RM
// -----------------------------

export function forecastRevenue(currentRevenue = 0, growthRate = 12) {
  return Math.round(currentRevenue * (1 + growthRate / 100));
}

// -----------------------------
// 4. Fonction globale RM
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
    forecast: forecastRevenue(revenue),
  };
}
