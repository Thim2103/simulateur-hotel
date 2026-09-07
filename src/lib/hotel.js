import { integratedHotelReputation } from "./calculs/rm";

export const hotelStructure = {
  name: "Luxury Palace",
  location: "Paris, France",
  roomCount: 120,
  starRating: 5,
  amenities: ["Spa", "Piscine", "Salle de conférence", "Voiturier", "Bar rooftop"],
};

export const hotelFinancials = {
  months: ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin"],
  revenue: [95000, 102000, 110500, 118000, 126500, 134800],
  costs: [58000, 61500, 64200, 67800, 71400, 75300],
  fixedCosts: 21000,
  payroll: 38000,
  taxes: 18,
};

export const hotelMarketing = {
  budget: 6500,
  positioning: "Hôtellerie premium & expérience client",
  channels: [
    { id: 1, name: "OTA premium", enabled: true, budget: 2200, reach: 68 },
    { id: 2, name: "Agences corporate", enabled: true, budget: 1600, reach: 54 },
    { id: 3, name: "Réseaux sociaux", enabled: true, budget: 1200, reach: 60 },
    { id: 4, name: "Programme fidélité", enabled: true, budget: 900, reach: 47 },
  ],
  campaigns: [
    { id: 1, name: "Séjour signature", objective: "Acquisition", status: "active", budget: 3000, conversion: 7, roi: 2.1, demandUplift: 6 },
  ],
};

export const hotelEsg = {
  energyConsumption: 62,
  waterUsage: 55,
  wasteReduction: 40,
  sustainabilityScore: 58,
  certifications: [],
  monthlyInvestment: 2400,
};

export const hotelExpansion = {
  establishments: [
    { id: 1, name: "Luxury Palace Paris", city: "Paris", roomCount: 120, status: "active", manager: "Isabelle Roy", sharedStaffPool: true },
  ],
  availableCapital: 450000,
};

export const defaultHotelState = {
  structure: hotelStructure,
  finance: hotelFinancials,
  marketing: hotelMarketing,
  esg: hotelEsg,
  expansion: hotelExpansion,
  progression: {
    cycles: 0,
  },
};

export const hotelDifficultyLevels = [
  { id: "easy", label: "Découverte", multiplier: 0.85 },
  { id: "normal", label: "Gestionnaire", multiplier: 1 },
  { id: "hard", label: "Compétition", multiplier: 1.2 },
  { id: "expert", label: "Palace exigeant", multiplier: 1.45 },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const safe = (arr) => (Array.isArray(arr) ? arr : []);

export function buildHotelSimulation(state, restaurantMetrics = {}, difficultyMultiplier = 1) {
  const data = state || {};
  const structure = data.structure || hotelStructure;
  const finance = data.finance || hotelFinancials;
  const marketing = data.marketing || hotelMarketing;
  const esg = data.esg || hotelEsg;
  const expansion = data.expansion || hotelExpansion;
  const channels = safe(marketing.channels);
  const campaigns = safe(marketing.campaigns);
  const establishments = safe(expansion.establishments).filter(Boolean);
  const activeEstablishments = establishments.filter((establishment) => establishment.status === "active");

  const roomCount = activeEstablishments.reduce((sum, establishment) => sum + Number(establishment.roomCount || 0), 0) || Number(structure.roomCount || 0);

  const marketingReach = clamp(
    40 +
      Number(marketing.budget || 0) / 150 +
      channels.filter((channel) => channel.enabled).reduce((sum, channel) => sum + Number(channel.reach || 0), 0) / 15 +
      campaigns.filter((campaign) => campaign.status === "active").reduce((sum, campaign) => sum + Number(campaign.conversion || 0), 0) / 8,
    30,
    100
  );

  const marketingRoi = campaigns.length
    ? Number(
        (
          campaigns.reduce((sum, campaign) => sum + Number(campaign.roi || 0), 0) / campaigns.length
        ).toFixed(2)
      )
    : 0;

  const marketingDemandUplift = campaigns
    .filter((campaign) => campaign.status === "active")
    .reduce((sum, campaign) => sum + Number(campaign.demandUplift || 0), 0);

  const sustainabilityScore = clamp(
    Number(esg.sustainabilityScore || 0) * 0.4 +
      Number(esg.wasteReduction || 0) * 0.2 +
      (100 - Number(esg.energyConsumption || 0)) * 0.2 +
      (100 - Number(esg.waterUsage || 0)) * 0.2 +
      safe(esg.certifications).length * 2,
    10,
    100
  );

  const restaurantDemand = Number(restaurantMetrics.demand || 0);
  const restaurantSatisfaction = Number(restaurantMetrics.customerSatisfaction || restaurantMetrics.satisfaction || 0);
  const reputation = clamp(
    integratedHotelReputation(restaurantMetrics) * 0.55 +
      marketingReach * 0.25 +
      sustainabilityScore * 0.2,
    0,
    100
  );

  const occupancyInfluence = Number(restaurantMetrics.occupancy || restaurantMetrics.integratedOccupancy || 0);

  const demand = clamp(
    48 +
      occupancyInfluence * 0.25 +
      marketingReach * 0.2 +
      marketingDemandUplift +
      restaurantDemand * 0.12 +
      (restaurantSatisfaction - 3) * 4 -
      (difficultyMultiplier - 1) * 18,
    30,
    100
  );

  const satisfaction = clamp(
    3.4 +
      reputation / 40 +
      sustainabilityScore / 120 -
      (difficultyMultiplier - 1) * 0.3,
    2.0,
    5.0
  );

  const revenueBase = safe(finance.revenue).reduce((sum, value) => sum + Number(value || 0), 0) || 0;
  const costsBase = safe(finance.costs).reduce((sum, value) => sum + Number(value || 0), 0) || 0;

  const revenue = clamp(
    roomCount * 210 * (demand / 100) +
      revenueBase / Math.max(1, safe(finance.months).length || 6),
    10000,
    2000000
  );

  const cost = clamp(
    Number(finance.fixedCosts || 0) +
      Number(finance.payroll || 0) +
      Number(marketing.budget || 0) +
      Number(esg.monthlyInvestment || 0) +
      revenue * (Number(finance.taxes || 0) / 100) +
      costsBase / Math.max(1, safe(finance.months).length || 6) * difficultyMultiplier,
    8000,
    1800000
  );

  const profit = revenue - cost;

  const aggregateRoomCount = establishments.reduce((sum, establishment) => sum + Number(establishment.roomCount || 0), 0);
  const aggregateRevenue = activeEstablishments.length
    ? Number((revenue * activeEstablishments.length).toFixed(0))
    : Number(revenue.toFixed(0));
  const sharedStaffCount = establishments.filter((establishment) => establishment.sharedStaffPool).length;
  const sharedStaffPoolUtilization = establishments.length
    ? clamp(Math.round((sharedStaffCount / establishments.length) * 100), 0, 100)
    : 0;

  return {
    day: (data.progression?.cycles || 0) + 1,
    demand: Number(demand.toFixed(1)),
    satisfaction: Number(satisfaction.toFixed(2)),
    reputation: Number(reputation.toFixed(1)),
    marketingReach: Number(marketingReach.toFixed(1)),
    marketingRoi,
    marketingDemandUplift: Number(marketingDemandUplift.toFixed(1)),
    sustainabilityScore: Number(sustainabilityScore.toFixed(1)),
    activeEstablishments: activeEstablishments.length,
    roomCount,
    revenue: Number(revenue.toFixed(0)),
    cost: Number(cost.toFixed(0)),
    profit: Number(profit.toFixed(0)),
    aggregateRoomCount,
    aggregateRevenue,
    sharedStaffPoolUtilization,
  };
}
