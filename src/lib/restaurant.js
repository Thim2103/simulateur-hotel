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
};

export const restaurantStaff = [
  { id: 1, name: "Emma Lenoir", role: "Directrice", department: "Management", salary: 4200, skills: ["Leadership", "Service premium", "Gestion"] },
  { id: 2, name: "Lucas Martin", role: "Chef de cuisine", department: "Cuisine", salary: 3600, skills: ["Cuisine", "Platégie", "Qualité" ] },
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

export const restaurantMetrics = {
  utilizationGoal: 72,
  avgTicket: 22.4,
  seats: 92,
};
