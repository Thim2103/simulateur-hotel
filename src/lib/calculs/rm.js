// Nombre de chambres disponibles
export function occupationRate(occupiedRooms, totalRooms) {
  if (totalRooms === 0) return 0;
  return Math.round((occupiedRooms / totalRooms) * 100);
}

// ADR = Average Daily Rate
export function adr(totalRevenueRooms, occupiedRooms) {
  if (occupiedRooms === 0) return 0;
  return Math.round(totalRevenueRooms / occupiedRooms);
}

// RevPAR = Revenue Per Available Room
export function revpar(totalRevenueRooms, totalRooms) {
  if (totalRooms === 0) return 0;
  return Math.round(totalRevenueRooms / totalRooms);
}

// GOPPAR = Gross Operating Profit Per Available Room
export function goppar(gop, totalRooms) {
  if (totalRooms === 0) return 0;
  return Math.round(gop / totalRooms);
}

// Forecast simple basé sur la tendance
export function forecastRevenue(lastMonthRevenue, growthRatePercent) {
  return Math.round(lastMonthRevenue * (1 + growthRatePercent / 100));
}

// Segmentation (calcul du % par segment)
export function segmentShare(segmentCount, totalClients) {
  if (totalClients === 0) return 0;
  return Math.round((segmentCount / totalClients) * 100);
}
