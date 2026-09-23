// "Ma Première Auberge" (Étape 3 of the "board game numérique" redesign):
// the starting preset for a brand-new career -- 4 simple rooms, no
// pre-existing reservations, a truly blank slate a first-time player
// builds up from cycle one. Deliberately much smaller than
// guestPmsSeed.js's seedRooms() (6 rooms incl. a deluxe/suite/seminar
// mix): that richer demo data stays exactly as it was for PMS/RM/Finance/
// TFE, reached directly by a guest without starting a career, where the
// variety is the point (demoing segmentation/pricing across room types).
// Career's own onboarding wants the opposite: as few moving parts as
// possible on day one.
import { createRoom } from "../pmsModels";

export function seedStarterInnRooms() {
  return [
    createRoom({ id: 1, number: "101", type: "standard", price: 90, floor: 1, capacity: 2 }),
    createRoom({ id: 2, number: "102", type: "standard", price: 90, floor: 1, capacity: 2 }),
    createRoom({ id: 3, number: "103", type: "standard", price: 90, floor: 1, capacity: 2 }),
    createRoom({ id: 4, number: "104", type: "standard", price: 90, floor: 1, capacity: 2 }),
  ];
}

export default seedStarterInnRooms;
