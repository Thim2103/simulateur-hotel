// Consolidates each hotel's rmReport (see lib/rm/rmEngine.js) into a
// chain-wide forecast, a merged pick-up series, and a single recommended
// ADR (weighted by each hotel's room count, so a 200-room flagship counts
// more than a 20-room boutique property).
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function mergeDailyMaps(maps) {
  const merged = {};
  maps.forEach((map) => {
    Object.entries(map || {}).forEach(([date, value]) => {
      merged[date] = (merged[date] || 0) + Number(value || 0);
    });
  });
  return merged;
}

// results: [{ hotel, dailyReport }] -- see chainEngine.js.
export function consolidateRM(results = []) {
  const safeResults = safeArray(results);

  const consolidatedForecast = safeResults.reduce(
    (totals, { dailyReport }) => ({
      next7: totals.next7 + Number(dailyReport?.rmReport?.forecast?.next7 || 0),
      next30: totals.next30 + Number(dailyReport?.rmReport?.forecast?.next30 || 0),
      next90: totals.next90 + Number(dailyReport?.rmReport?.forecast?.next90 || 0),
    }),
    { next7: 0, next30: 0, next90: 0 }
  );

  const consolidatedPickup = mergeDailyMaps(safeResults.map(({ dailyReport }) => dailyReport?.rmReport?.pickup?.daily));

  const weightedAdr = safeResults.reduce(
    (acc, { hotel, dailyReport }) => {
      const weight = Math.max(0, Number(hotel?.hotelState?.structure?.roomCount) || 0);
      const adr = Number(dailyReport?.rmReport?.pricing?.recommendedADR || 0);
      return { weightedSum: acc.weightedSum + adr * weight, totalWeight: acc.totalWeight + weight };
    },
    { weightedSum: 0, totalWeight: 0 }
  );
  const recommendedADR = weightedAdr.totalWeight ? Math.round(weightedAdr.weightedSum / weightedAdr.totalWeight) : 0;

  return { consolidatedForecast, consolidatedPickup, recommendedADR };
}
