import { useState } from "react";
import Card from "../ui/Card";
import GameModal from "../../ui/components/GameModal";
import { arrivalsDeparturesToday, guestInRoom, breakfastCoversForecast } from "../../lib/hotel/hotelSchematicEngine";

// The room's visual state (Étape 3's spec): 🟢 prête, 🔴 occupée,
// 🟠 à nettoyer/en cours de nettoyage -- read straight off the same
// `status`/`housekeeping_status` fields every other hotel view already
// reads (pmsModels.js), never a new field of its own.
const ROOM_BADGE = {
  clean: { icon: "🟢", label: "Prête" },
  occupied: { icon: "🔴", label: "Occupée" },
  dirty: { icon: "🟠", label: "À nettoyer" },
  cleaning: { icon: "🟠", label: "Nettoyage en cours" },
};

function roomVisualState(room, cleaningRoomIds) {
  if (cleaningRoomIds?.has(room.id)) return "cleaning";
  if (room.status === "occupée") return "occupied";
  if (room.housekeeping_status === "dirty") return "dirty";
  return "clean";
}

// The board-game-style, warm reading of a small hotel -- Étape 3 of the
// "board game numérique" redesign, the visual heart of Mode Normal's
// "🏨 Mon Hôtel" space. Deliberately built for "Ma Première Auberge" 's
// scale (a handful of rooms + reception + breakfast), not the dense,
// architectural SchematicHotelView.jsx (ui/hotelView/schematic/) a
// larger/Expert-mode hotel still uses -- see Dashboard.jsx for how the
// two are chosen between.
//
// Réception and the breakfast area are presentational-only zones (no
// room entities, no new engine state): their figures are derived live
// from `reservations`/`rooms` by lib/hotel/hotelSchematicEngine.js. Only
// one room action is wired to something real -- "Lancer le nettoyage"
// (the exact same `cleaningRoomIds` transient highlight every other
// hotel view's housekeeping quick action already uses) -- because that
// is the only room-level action with a real engine behind it today; a
// per-room price or a welcome gesture would need one built first, so
// this view doesn't fake either.
export default function HotelSchematicView({ rooms = [], reservations = [], date, cleaningRoomIds = new Set(), onPriorityClean, onOpenYield }) {
  const [openRoomId, setOpenRoomId] = useState(null);
  const openRoom = rooms.find((room) => room.id === openRoomId) || null;
  const { arrivals, departures } = arrivalsDeparturesToday(reservations, date);
  const covers = breakfastCoversForecast(rooms);
  const openState = openRoom ? roomVisualState(openRoom, cleaningRoomIds) : null;
  const openGuest = openRoom ? guestInRoom(openRoom, reservations, date) : null;

  return (
    <div data-testid="hotel-schematic-view" className="flex flex-col gap-4 rounded-3xl border border-amber-100 bg-amber-50/40 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div data-testid="schematic-reception">
          <Card className="!bg-white">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="text-2xl">🔑</span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Réception</h3>
                <p className="text-sm text-slate-600">{arrivals} arrivée{arrivals > 1 ? "s" : ""}, {departures} départ{departures > 1 ? "s" : ""} aujourd'hui</p>
              </div>
            </div>
          </Card>
        </div>
        <div data-testid="schematic-breakfast">
          <Card className="!bg-white">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="text-2xl">🥐</span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Espace Petit-Déjeuner</h3>
                <p className="text-sm text-slate-600">{covers} couvert{covers > 1 ? "s" : ""} prévu{covers > 1 ? "s" : ""} · Formule Basique</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rooms.map((room) => {
          const state = roomVisualState(room, cleaningRoomIds);
          const badge = ROOM_BADGE[state];
          return (
            <button
              key={room.id}
              type="button"
              data-testid={`schematic-starter-room-${room.number}`}
              onClick={() => setOpenRoomId(room.id)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-amber-100 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span aria-hidden="true" className="text-2xl transition-transform duration-300">{badge.icon}</span>
              <span className="text-sm font-semibold text-slate-900">Chambre {room.number}</span>
              <span className="text-xs text-slate-500">{badge.label}</span>
            </button>
          );
        })}
      </div>

      <GameModal open={Boolean(openRoom)} onClose={() => setOpenRoomId(null)} title={openRoom ? `Chambre ${openRoom.number}` : ""} className="flex flex-col gap-4">
        {openRoom && (
          <>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span aria-hidden="true">{ROOM_BADGE[openState].icon}</span>
              <span>Statut : <strong>{ROOM_BADGE[openState].label}</strong></span>
            </div>
            {openGuest && <p className="text-sm text-slate-600">Client actuel : <strong>{openGuest}</strong></p>}

            <div className="flex flex-col gap-2">
              {(openState === "dirty" || openState === "cleaning") && (
                <button
                  type="button"
                  disabled={openState === "cleaning"}
                  onClick={() => onPriorityClean?.(openRoom.id)}
                  className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {openState === "cleaning" ? "Nettoyage en cours…" : "Lancer le nettoyage"}
                </button>
              )}
              {onOpenYield && (
                <button
                  type="button"
                  onClick={() => {
                    setOpenRoomId(null);
                    onOpenYield();
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ajuster les tarifs (Yield)
                </button>
              )}
            </div>
          </>
        )}
      </GameModal>
    </div>
  );
}
