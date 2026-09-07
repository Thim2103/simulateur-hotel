// Lets the hotel's own revenue-management signal (lib/rm/rmEngine.js) shape
// restaurant demand: a full hotel drives breakfast/room-service covers, an
// empty one means the restaurant needs to court outside customers.
import { safeNumber, safeObject } from "../safe";

export function deriveDemandFromRM({ rmReport, hotelOccupancyPercent = 0 } = {}) {
  const forecastNext7 = safeNumber(safeObject(safeObject(rmReport).forecast).next7, 0);
  const demandBoost = Math.round(hotelOccupancyPercent * 0.2 + Math.min(20, forecastNext7 / 200));

  const recommendedFocus =
    hotelOccupancyPercent >= 80
      ? "Renforcer le service petit-déjeuner et room-service : forte occupation hôtel."
      : hotelOccupancyPercent <= 30
      ? "Cibler la clientèle externe : occupation hôtel faible."
      : "Maintenir le rythme habituel de service.";

  return { demandBoost, recommendedFocus, hotelOccupancyPercent };
}
