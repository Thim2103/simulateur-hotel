// Turns the rest of the RM engine's output into a short list of actionable
// recommendations for the dashboard. Order matters: highest-priority
// concerns first.
function sumValues(record) {
  return Object.values(record || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function runRecommendations({ pickupTrend, pricing = {}, segmentation = {}, occupancy = 50 } = {}) {
  const recommendations = [];

  if (occupancy < 40) {
    recommendations.push({
      id: "boost_demand",
      priority: "high",
      message: "Occupation faible : envisager une promotion ciblée ou un ajustement tarifaire à la baisse.",
    });
  } else if (occupancy > 85) {
    recommendations.push({
      id: "raise_rates",
      priority: "medium",
      message: "Forte occupation : augmenter le tarif direct pour capter davantage de valeur.",
    });
  }

  if (pricing.weatherAdjustment > 0) {
    recommendations.push({
      id: "weather_upside",
      priority: "low",
      message: "Météo favorable : opportunité de vente incitative (terrasse, spa, upsells).",
    });
  } else if (pricing.weatherAdjustment < 0) {
    recommendations.push({
      id: "weather_downside",
      priority: "low",
      message: "Météo défavorable : renforcer les offres en intérieur pour compenser la baisse de demande.",
    });
  }

  if (pricing.eventAdjustment > 0) {
    recommendations.push({
      id: "event_upside",
      priority: "medium",
      message: "Événement local ou client VIP en cours : ajuster le tarif à la hausse sur les canaux directs.",
    });
  }

  const mixTotal = sumValues(segmentation.mix);
  const otaShare = mixTotal ? Number(segmentation.mix?.ota || 0) / mixTotal : 0;
  if (otaShare > 0.5) {
    recommendations.push({
      id: "reduce_ota_dependency",
      priority: "medium",
      message: "Forte dépendance aux OTA : renforcer les canaux directs pour limiter les commissions.",
    });
  }

  if (pickupTrend === "down") {
    recommendations.push({
      id: "pickup_declining",
      priority: "high",
      message: "Rythme de réservation en baisse : relancer les campagnes marketing ou les canaux directs.",
    });
  } else if (pickupTrend === "up") {
    recommendations.push({
      id: "pickup_rising",
      priority: "low",
      message: "Rythme de réservation en hausse : le momentum actuel peut justifier une hausse tarifaire mesurée.",
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "steady",
      priority: "low",
      message: "Aucune action urgente : la performance suit la tendance attendue.",
    });
  }

  return recommendations;
}
