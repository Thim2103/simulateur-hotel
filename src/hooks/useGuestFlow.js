import { useEffect, useRef, useState } from "react";
import { GuestSpawner } from "../customers/guestSpawner";
import { ReputationEngine } from "../reputation/reputationEngine";
import { EconomyEngine } from "../economy/economyEngine";

// Branche le flux de clients agent-based (customers/guestSpawner.js) sur le
// Dashboard : les arrivées suivent le minuteur du GuestSpawner (rythmé par
// l'attractivité), et chaque passage à la journée suivante (`day`) fait
// avancer les séjours -- facturation, check-out, avis -> ReputationEngine.
// `roomPrice` (le prix moyen pratiqué par le joueur) alimente l'EconomyEngine :
// c'est lui que les clients comparent à leur budget pour accepter ou refuser.
// Le hook ne fait qu'exposer un instantané en lecture (spawner.getStats()),
// rafraîchi à chaque arrivée, refus ou avis.
export function useGuestFlow({ day, totalRooms = 0, roomPrice } = {}) {
  const ref = useRef(null);
  if (!ref.current) {
    const hotel = {
      reputation: 50,
      totalRooms,
      hasAvailableRooms: () => ref.current.spawner.getGuests().length < ref.current.hotel.totalRooms,
      releaseRoom: () => undefined,
    };
    const refresh = () => ref.current?.setStats?.(ref.current.spawner.getStats(ref.current.hotel));
    const spawner = new GuestSpawner({
      reputation: new ReputationEngine(),
      economy: new EconomyEngine(),
      onSpawn: refresh,
      onReject: refresh,
      onReview: refresh,
    });
    ref.current = { hotel, spawner, lastDay: day };
  }

  const [stats, setStats] = useState(() => ref.current.spawner.getStats(ref.current.hotel));
  ref.current.setStats = setStats;
  ref.current.hotel.totalRooms = totalRooms;
  if (Number.isFinite(roomPrice) && roomPrice > 0) ref.current.spawner.economy.baseRoomPrice = roomPrice;

  useEffect(() => {
    const { spawner, hotel } = ref.current;
    spawner.start(hotel, null);
    return () => spawner.stop();
  }, []);

  useEffect(() => {
    const current = ref.current;
    if (day === undefined || day === current.lastDay) return;
    current.lastDay = day;
    current.spawner.update({ hotel: current.hotel, tick: day });
    setStats(current.spawner.getStats(current.hotel));
  }, [day]);

  return stats;
}

export default useGuestFlow;
