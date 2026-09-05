export const restaurantStructure = {
  concept: "Bistro moderne & cuisine locale",
  location: "Lyon, France",
  capacity: 92,
  seats: 92,
  materials: ["Bois clair", "Acier corten", "Carrelage anthracite", "Verre trempé"],
  equipment: [
    "Four professionnel",
    "Plancha",
    "Frigo à marche",
    "Machine à café",
    "Système de caisse",
    "Équipements de cuisine",
  ],
};

export const restaurantFinancials = {
  months: ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin"],
  revenue: [28000, 31500, 33250, 35400, 38900, 41800],
  costs: [17800, 19150, 19850, 20500, 22350, 23950],
  payroll: 9800,
  fixedCosts: 6200,
  rent: 4600,
  taxes: 20,
};

export const restaurantStaff = [
  { id: 1, name: "Emma Lenoir", role: "Directrice", department: "Management", salary: 4200, skills: ["Leadership", "Service premium", "Gestion"] },
  { id: 2, name: "Lucas Martin", role: "Chef de cuisine", department: "Cuisine", salary: 3600, skills: ["Cuisine", "Platégie", "Qualité"] },
  { id: 3, name: "Sofia Petit", role: "Sous-chef", department: "Cuisine", salary: 2900, skills: ["Préparation", "Équipe", "Cuisine rapide"] },
  { id: 4, name: "Noah Bernard", role: "Serveur", department: "Service", salary: 2300, skills: ["Service", "Accueil", "Suggestion menu"] },
  { id: 5, name: "Claire Dubois", role: "Serveuse", department: "Service", salary: 2250, skills: ["Relation client", "Wine pairing", "Service"] },
  { id: 6, name: "Ibrahim Saleh", role: "Bar manager", department: "Bar", salary: 2700, skills: ["Bar", "Cocktails", "Gestion stock"] },
];

export const restaurantMenu = [
  { id: 1, name: "Burger Signature", category: "Plat", cost: 11.5, price: 19.5, sales: 26 },
  { id: 2, name: "Salade du Chef", category: "Entrée", cost: 6.2, price: 12.5, sales: 18 },
  { id: 3, name: "Pasta Carbonara", category: "Plat", cost: 9.8, price: 17.5, sales: 22 },
  { id: 4, name: "Tartare de Boeuf", category: "Plat", cost: 14.2, price: 24.0, sales: 15 },
  { id: 5, name: "Moelleux au chocolat", category: "Dessert", cost: 4.8, price: 9.0, sales: 21 },
  { id: 6, name: "Limonade maison", category: "Boisson", cost: 1.8, price: 5.5, sales: 31 },
  { id: 7, name: "Café spécial", category: "Boisson", cost: 1.4, price: 4.8, sales: 28 },
  { id: 8, name: "Cocktail saison", category: "Bar", cost: 5.7, price: 12.5, sales: 19 },
];

export const restaurantOperations = [
  {
    id: 1,
    title: "Nettoyage du service",
    type: "cleaning",
    status: "à faire",
    owner: "Équipe service",
    priority: "moyenne",
    dueIn: "2h",
  },
  {
    id: 2,
    title: "Maintenance du four",
    type: "maintenance",
    status: "planifiée",
    owner: "Cuisine",
    priority: "haute",
    dueIn: "1j",
  },
  {
    id: 3,
    title: "Réclamation client - bruit",
    type: "complaint",
    status: "ouverte",
    owner: "Manager",
    priority: "haute",
    dueIn: "30 min",
  },
];

export const restaurantMarketing = {
  budget: 1800,
  positioning: "Cuisine locale, service chaleureux",
  channels: [
    { id: 1, name: "Réseaux sociaux", enabled: true, budget: 700, reach: 72 },
    { id: 2, name: "Partenariats locaux", enabled: true, budget: 500, reach: 58 },
    { id: 3, name: "Email fidélité", enabled: true, budget: 300, reach: 64 },
  ],
  campaigns: [
    { id: 1, name: "Menu de saison", objective: "Acquisition", status: "active", budget: 900, conversion: 6 },
  ],
};

export const restaurantEsg = {
  wasteReduction: 35,
  localSourcing: 60,
  energyEfficiency: 40,
  staffWellbeing: 70,
  certifications: [],
  monthlyInvestment: 900,
};

export const restaurantExpansion = {
  establishments: [
    { id: 1, name: "Bistro Lyon", city: "Lyon", capacity: 92, status: "active", manager: "Emma Lenoir" },
  ],
  pipeline: [],
  availableCapital: 120000,
};

export const restaurantMetrics = {
  utilizationGoal: 72,
  avgTicket: 22.4,
  seats: 92,
};

export const restaurantProgression = {
  modules: [
    { id: "overview", label: "Structure", requiredScore: 0 },
    { id: "dashboard", label: "Dashboard", requiredScore: 25 },
    { id: "finance", label: "Finance", requiredScore: 40 },
    { id: "hr", label: "RH", requiredScore: 55 },
    { id: "menu", label: "Menu", requiredScore: 70 },
    { id: "operations", label: "Opérations", requiredScore: 80 },
    { id: "marketing", label: "Marketing", requiredScore: 88 },
    { id: "esg", label: "ESG", requiredScore: 94 },
    { id: "expansion", label: "Expansion", requiredScore: 100 },
  ],
};

export const restaurantTutorialSteps = [
  { id: "setup", title: "Préparer l'établissement", description: "Validez le concept, la capacité et les équipements.", module: "overview" },
  { id: "finance", title: "Piloter les finances", description: "Analysez les revenus, les coûts et la rentabilité.", module: "finance" },
  { id: "team", title: "Constituer l'équipe", description: "Ajustez les effectifs, les rôles et les compétences.", module: "hr" },
  { id: "menu", title: "Optimiser la carte", description: "Travaillez les prix, les coûts et la popularité des produits.", module: "menu" },
  { id: "operations", title: "Stabiliser l'exploitation", description: "Traitez les tâches, les réclamations et la maintenance.", module: "operations" },
  { id: "growth", title: "Développer l'activité", description: "Débloquez le marketing, l'ESG et l'expansion.", module: "expansion" },
];

export const restaurantAchievements = [
  { id: "first-cycle", title: "Premier service", description: "Exécuter votre premier cycle de simulation.", xp: 25 },
  { id: "profitable-month", title: "Mois rentable", description: "Atteindre un profit simulé positif.", xp: 50 },
  { id: "full-team", title: "Équipe complète", description: "Gérer au moins six collaborateurs.", xp: 40 },
  { id: "popular-menu", title: "Carte populaire", description: "Atteindre 90% de popularité menu.", xp: 60 },
  { id: "sustainable", title: "Entreprise responsable", description: "Atteindre 90% d'impact ESG.", xp: 75 },
  { id: "expansion", title: "Changement d'échelle", description: "Débloquer le module Expansion.", xp: 100 },
];

export const restaurantDifficultyLevels = [
  { id: "easy", label: "Découverte", multiplier: 0.85, requiredLevel: 1 },
  { id: "normal", label: "Gestionnaire", multiplier: 1, requiredLevel: 2 },
  { id: "hard", label: "Compétition", multiplier: 1.2, requiredLevel: 4 },
  { id: "expert", label: "Restauration exigeante", multiplier: 1.45, requiredLevel: 7 },
];

export const defaultRestaurantState = {
  structure: restaurantStructure,
  finance: restaurantFinancials,
  staff: restaurantStaff,
  menu: restaurantMenu,
  operations: restaurantOperations,
  marketing: restaurantMarketing,
  esg: restaurantEsg,
  expansion: restaurantExpansion,
  pmsContext: {
    hotelOccupancy: 0,
    activeGuests: 0,
    housekeepingIssues: 0,
    scheduledEvents: 0,
    processedEventIds: [],
  },
  progression: {
    xp: 0,
    completedTutorials: [],
    unlockedAchievements: [],
    difficulty: "easy",
    cycles: 0,
  },
};

export const restaurantSimulationDefaults = {
  day: 1,
  demand: 74,
  rushHour: "18:00-21:00",
  staffProductivity: 82,
  customerSatisfaction: 4.6,
  menuPopularity: 79,
  complaints: 2,
  maintenanceRisk: 18,
  esgImpact: 84,
  revenue: 41800,
  cost: 23950,
  profit: 34100,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function buildRestaurantSimulation(state, difficultyMultiplier = 1) {
  const marketing = state.marketing || restaurantMarketing;
  const esg = state.esg || restaurantEsg;
  const expansion = state.expansion || restaurantExpansion;
  const pmsContext = state.pmsContext || {};
  const activeEstablishments = expansion.establishments.filter((establishment) => establishment.status === "active");
  const marketingReach = clamp(
    42 + Number(marketing.budget || 0) / 100 + marketing.channels.filter((channel) => channel.enabled).reduce((sum, channel) => sum + Number(channel.reach || 0), 0) / 12,
    35,
    100
  );
  const esgReadiness = (Number(esg.wasteReduction || 0) + Number(esg.localSourcing || 0) + Number(esg.energyEfficiency || 0) + Number(esg.staffWellbeing || 0)) / 4;
  const capacity = activeEstablishments.reduce((sum, establishment) => sum + Number(establishment.capacity || 0), 0) || Number(state.structure.capacity || 0);
  const staffProductivity = clamp(
    68 +
      state.staff.reduce((sum, person) => sum + Number(person.salary || 0), 0) / 2200 -
      state.operations.filter((task) => task.type === "complaint").length * 6,
    45,
    98
  );

  const menuPopularity = clamp(
    60 +
      state.menu.reduce((sum, item) => sum + Number(item.sales || 0), 0) / 3 -
      state.menu.filter((item) => Number(item.cost || 0) > Number(item.price || 0)).length * 10,
    40,
    99
  );

  const demand = clamp(
    45 +
      (state.structure.capacity / state.structure.seats) * 24 +
      menuPopularity / 3 -
      state.operations.filter((task) => task.type === "complaint").length * 8 -
      (100 - marketingReach) / 8 -
      (difficultyMultiplier - 1) * 20 +
      Number(pmsContext.hotelOccupancy || 0) * 0.08 +
      Number(pmsContext.scheduledEvents || 0) * 1.5 -
      Number(pmsContext.housekeepingIssues || 0) * 2,
    35,
    100
  );

  const customerSatisfaction = clamp(
    3.4 +
      staffProductivity / 30 +
      menuPopularity / 35 -
      state.operations.filter((task) => task.type === "complaint").length * 0.4 -
      Number(pmsContext.housekeepingIssues || 0) * 0.08,
    2.0,
    5.0
  );

  const rushHour = demand > 80 ? "19:00-22:00" : demand > 65 ? "18:00-21:00" : "17:00-20:00";

  const complaints = clamp(
    1 +
      Math.max(0, 85 - customerSatisfaction * 18) / 18 +
      state.operations.filter((task) => task.type === "complaint").length,
    0,
    10
  );

  const maintenanceRisk = clamp(
    12 +
      state.operations.filter((task) => task.type === "maintenance").length * 10 -
      state.staff.length * 0.8,
    5,
    95
  );

  const esgImpact = clamp(
    30 + esgReadiness * 0.65 + state.menu.length * 0.8 -
      state.operations.filter((task) => task.type === "complaint").length * 4 +
      state.staff.length * 0.3,
    20,
    100
  );

  const revenue = clamp(
    (capacity * 18 * demand) / 10 +
      state.menu.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.sales || 0), 0) * 30,
    5000,
    150000
  );

  const cost = clamp(
    state.finance.fixedCosts +
      state.finance.rent +
      state.staff.reduce((sum, person) => sum + Number(person.salary || 0), 0) / 3 +
      maintenanceRisk * 70 +
      Number(marketing.budget || 0) +
      Number(esg.monthlyInvestment || 0) +
      complaints * 60 * difficultyMultiplier,
    5000,
    200000
  );

  const profit = revenue - cost;

  return {
    day: (state.progression?.cycles || 0) + 1,
    demand: Number(demand.toFixed(1)),
    rushHour,
    staffProductivity: Number(staffProductivity.toFixed(1)),
    customerSatisfaction: Number(customerSatisfaction.toFixed(2)),
    menuPopularity: Number(menuPopularity.toFixed(1)),
    complaints: Number(complaints.toFixed(1)),
    maintenanceRisk: Number(maintenanceRisk.toFixed(1)),
    esgImpact: Number(esgImpact.toFixed(1)),
    marketingReach: Number(marketingReach.toFixed(1)),
    esgReadiness: Number(esgReadiness.toFixed(1)),
    activeEstablishments: activeEstablishments.length,
    revenue: Number(revenue.toFixed(0)),
    cost: Number(cost.toFixed(0)),
    profit: Number(profit.toFixed(0)),
  };
}
