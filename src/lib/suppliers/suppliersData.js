// The equipment & supplies catalogue: everything the player can buy to fit
// out the hotel, from bedroom furniture to the wine list, each priced,
// billed to a real supplier and routed to its PCMN account (see
// suppliersEngine.js's docstring for how the account's class decides where
// the money goes). Static data only -- no state, no rng.
//
// `accountClass` (derived from `accountCode`'s leading digit):
//   2  immobilisations -- durable equipment, booked to the asset ledger
//   3  stocks          -- consumables (food, drink, linens), booked to stock
//   6  charges         -- (unused here; every item below is a real purchase
//                          of goods, never a pure service charge)
export const CATEGORIES = {
  furniture: { id: "furniture", label: "Mobilier", icon: "🛋️", description: "Chambres, hall, restaurant, terrasse." },
  equipment: { id: "equipment", label: "Équipements & Fluides", icon: "🔧", description: "Chaufferie, climatisation, électricité, lumière." },
  tableware: { id: "tableware", label: "Arts de la table & Ustensiles", icon: "🍽️", description: "Vaisselle, verrerie, casseroles inox." },
  linens: { id: "linens", label: "Lingerie & Textiles", icon: "🧺", description: "Draps, serviettes, uniformes." },
  electronics: { id: "electronics", label: "Électronique & PMS", icon: "📺", description: "Téléviseurs, serrures connectées, logiciel PMS." },
  food: { id: "food", label: "Nourriture & Boissons", icon: "🍷", description: "Viandes, poissons, produits frais, vins, spiritueux, bières." },
  decor: { id: "decor", label: "Décoration & Ambiance", icon: "🖼️", description: "Œuvres d'art, tapis, végétalisation." },
};
export const CATEGORY_IDS = Object.keys(CATEGORIES);

export const TIERS = {
  entry: { id: "entry", label: "Entrée de gamme", icon: "🥉" },
  standard: { id: "standard", label: "Standard", icon: "🥈" },
  luxury: { id: "luxury", label: "Haut de gamme", icon: "🥇" },
};
export const TIER_IDS = Object.keys(TIERS);

// The PCMN class is the account code's leading digit (2xxxx/2xx =
// immobilisations, 3xxx/3xx = stocks, 6xxx = charges) -- not a division by a
// fixed power of ten, since these codes are not all the same length.
export function accountClassOf(accountCode) {
  return Number(String(accountCode).trim()[0]) || 0;
}

// Every catalogue item: { id, name, category, tier, supplierName, price
// (HT, per unit), accountCode (PCMN), deliveryFee, installationCost, impact
// ({ reputation, rse, maintenanceCost -- a fraction, e.g. -0.1 for -10 % }),
// description }.
export const CATALOGUE = [
  // ---- Mobilier ------------------------------------------------------------
  { id: "furniture-rooms-entry", name: "Mobilier chambres — Pin massif", category: "furniture", tier: "entry", supplierName: "NordicHome Pro", price: 420, accountCode: 24010, deliveryFee: 60, installationCost: 40, impact: { reputation: 0.05, rse: 1 }, description: "Lit, table de chevet et armoire en pin massif, sobres et solides." },
  { id: "furniture-rooms-standard", name: "Mobilier chambres — Chêne huilé", category: "furniture", tier: "standard", supplierName: "Atelier Confluence", price: 980, accountCode: 24010, deliveryFee: 90, installationCost: 70, impact: { reputation: 0.15, rse: 2 }, description: "Une gamme chêne massif huilé, confortable et durable." },
  { id: "furniture-rooms-luxury", name: "Mobilier chambres — Suite signature", category: "furniture", tier: "luxury", supplierName: "Maison Verdier", price: 2400, accountCode: 24010, deliveryFee: 150, installationCost: 180, impact: { reputation: 0.35, rse: 1 }, description: "Pièces sur mesure, finitions laquées, dressing intégré." },
  { id: "furniture-hall-standard", name: "Mobilier hall — Banquettes lounge", category: "furniture", tier: "standard", supplierName: "Atelier Confluence", price: 1600, accountCode: 24020, deliveryFee: 120, installationCost: 90, impact: { reputation: 0.2 }, description: "Un coin salon accueillant pour le hall d'entrée." },
  { id: "furniture-restaurant-standard", name: "Mobilier restaurant — Tables & chaises bistrot", category: "furniture", tier: "standard", supplierName: "Atelier Confluence", price: 1150, accountCode: 24030, deliveryFee: 100, installationCost: 60, impact: { reputation: 0.12 }, description: "Un jeu complet pour une salle de 20 couverts." },
  { id: "furniture-terrace-standard", name: "Mobilier terrasse — Teck traité", category: "furniture", tier: "standard", supplierName: "Jardins & Cie", price: 1350, accountCode: 24040, deliveryFee: 110, installationCost: 50, impact: { reputation: 0.15, rse: 2 }, description: "Résiste aux intempéries, entretien minimal." },

  // ---- Équipements & Fluides -------------------------------------------------
  { id: "equipment-heating-entry", name: "Chaudière gaz standard", category: "equipment", tier: "entry", supplierName: "ThermoTech Installations", price: 3200, accountCode: 2341, deliveryFee: 0, installationCost: 600, impact: { maintenanceCost: -0.03 }, description: "Chauffage central fiable, entretien classique." },
  { id: "equipment-climate-standard", name: "Climatisation réversible centralisée", category: "equipment", tier: "standard", supplierName: "ThermoTech Installations", price: 6800, accountCode: 234, deliveryFee: 0, installationCost: 1200, impact: { reputation: 0.1, maintenanceCost: -0.05 }, description: "Confort thermique toute l'année, moins de pannes liées à la chaleur." },
  { id: "equipment-climate-luxury", name: "Climatisation basse consommation", category: "equipment", tier: "luxury", supplierName: "GreenAir Systems", price: 11500, accountCode: 234, deliveryFee: 0, installationCost: 1800, impact: { reputation: 0.15, rse: 5, maintenanceCost: -0.1 }, description: "Pompe à chaleur haute efficacité, très faible impact énergétique." },
  { id: "equipment-electric-standard", name: "Mise aux normes électriques", category: "equipment", tier: "standard", supplierName: "ElecPro Solutions", price: 4200, accountCode: 2343, deliveryFee: 0, installationCost: 800, impact: { maintenanceCost: -0.08 }, description: "Tableaux et circuits aux normes, moins d'incidents électriques." },
  { id: "equipment-lighting-entry", name: "Éclairage LED — Kit basique", category: "equipment", tier: "entry", supplierName: "ElecPro Solutions", price: 900, accountCode: 2344, deliveryFee: 40, installationCost: 200, impact: { maintenanceCost: -0.02 }, description: "Remplace l'éclairage énergivore par du LED standard." },
  { id: "equipment-lighting-luxury", name: "Éclairage scénographique connecté", category: "equipment", tier: "luxury", supplierName: "GreenAir Systems", price: 3100, accountCode: 2344, deliveryFee: 60, installationCost: 450, impact: { reputation: 0.2, rse: 3, maintenanceCost: -0.03 }, description: "Ambiances pilotées, très basse consommation." },
  // A pure service, not a good: booked straight to Classe 6 (charges), not to
  // an asset or a stock -- see suppliersEngine.js's docstring.
  { id: "equipment-maintenance-contract", name: "Contrat de maintenance annuel", category: "equipment", tier: "standard", supplierName: "ThermoTech Installations", price: 1800, accountCode: 6150, deliveryFee: 0, installationCost: 0, impact: { maintenanceCost: -0.04 }, description: "Un contrat d'entretien préventif pour les équipements techniques." },

  // ---- Arts de la table & Ustensiles -----------------------------------------
  { id: "tableware-entry", name: "Vaisselle blanche — Service 50 couverts", category: "tableware", tier: "entry", supplierName: "Restauclassic", price: 650, accountCode: 2370, deliveryFee: 40, installationCost: 0, impact: {}, description: "Assiettes, verres et couverts basiques, incassables." },
  { id: "tableware-standard", name: "Vaisselle & verrerie — Collection Brasserie", category: "tableware", tier: "standard", supplierName: "Restauclassic", price: 1450, accountCode: 2370, deliveryFee: 60, installationCost: 0, impact: { reputation: 0.08 }, description: "Porcelaine fine et verrerie assortie, 80 couverts." },
  { id: "tableware-luxury", name: "Arts de la table — Porcelaine signée", category: "tableware", tier: "luxury", supplierName: "Manufacture Sévigné", price: 3800, accountCode: 2370, deliveryFee: 90, installationCost: 0, impact: { reputation: 0.25 }, description: "Pièces en porcelaine fine, service gastronomique." },
  { id: "tableware-kitchen-standard", name: "Casseroles & ustensiles inox pro", category: "tableware", tier: "standard", supplierName: "CuisinePro Équipements", price: 1100, accountCode: 2370, deliveryFee: 50, installationCost: 0, impact: { maintenanceCost: -0.02 }, description: "Batterie de cuisine inox, robuste et durable." },

  // ---- Lingerie & Textiles ---------------------------------------------------
  { id: "linens-sheets-entry", name: "Draps & housses — Coton standard", category: "linens", tier: "entry", supplierName: "Linvosges Hôtellerie", price: 25, accountCode: 3400, deliveryFee: 15, installationCost: 0, impact: {}, description: "Un jeu de draps par chambre, coton 57 fils." },
  { id: "linens-sheets-standard", name: "Draps & housses — Percale 200 fils", category: "linens", tier: "standard", supplierName: "Linvosges Hôtellerie", price: 55, accountCode: 3400, deliveryFee: 20, installationCost: 0, impact: { reputation: 0.05 }, description: "Confort supérieur, tenue dans le temps." },
  { id: "linens-sheets-luxury", name: "Draps & housses — Satin de coton égyptien", category: "linens", tier: "luxury", supplierName: "Maison Verdier", price: 140, accountCode: 3400, deliveryFee: 30, installationCost: 0, impact: { reputation: 0.15 }, description: "Une literie d'exception, digne d'un palace." },
  { id: "linens-towels-standard", name: "Serviettes éponge — Lot chambre", category: "linens", tier: "standard", supplierName: "Linvosges Hôtellerie", price: 18, accountCode: 3400, deliveryFee: 10, installationCost: 0, impact: {}, description: "Serviettes de toilette et de bain, coton peigné." },
  { id: "linens-uniforms-standard", name: "Uniformes du personnel", category: "linens", tier: "standard", supplierName: "TenuePro Textiles", price: 65, accountCode: 3400, deliveryFee: 15, installationCost: 0, impact: { reputation: 0.05 }, description: "Une tenue complète par membre du personnel." },

  // ---- Électronique & PMS -----------------------------------------------------
  { id: "electronics-tv-entry", name: "Téléviseur chambre — 32'' HD", category: "electronics", tier: "entry", supplierName: "TechHotel Distribution", price: 220, accountCode: 2410, deliveryFee: 15, installationCost: 20, impact: {}, description: "Un écran simple et fiable par chambre." },
  { id: "electronics-tv-luxury", name: "Téléviseur chambre — 55'' 4K Smart", category: "electronics", tier: "luxury", supplierName: "TechHotel Distribution", price: 650, accountCode: 2410, deliveryFee: 25, installationCost: 30, impact: { reputation: 0.1 }, description: "Grand écran connecté, streaming et chaînes internationales." },
  { id: "electronics-locks-standard", name: "Serrures connectées — Badge RFID", category: "electronics", tier: "standard", supplierName: "SecureStay Systems", price: 180, accountCode: 2410, deliveryFee: 10, installationCost: 35, impact: { reputation: 0.08, maintenanceCost: -0.02 }, description: "Sécurité renforcée, moins d'incidents de clés perdues." },
  { id: "electronics-pms-entry", name: "Logiciel PMS — Édition Essentielle", category: "electronics", tier: "entry", supplierName: "HotelSoft Solutions", price: 1200, accountCode: 2130, deliveryFee: 0, installationCost: 300, impact: { maintenanceCost: -0.02 }, description: "Réservations et facturation de base, licence perpétuelle." },
  { id: "electronics-pms-standard", name: "Logiciel PMS — Édition Pro", category: "electronics", tier: "standard", supplierName: "HotelSoft Solutions", price: 3200, accountCode: 2130, deliveryFee: 0, installationCost: 500, impact: { reputation: 0.05, maintenanceCost: -0.05 }, description: "PMS complet avec RM intégré et rapports avancés." },
  { id: "electronics-pms-luxury", name: "Logiciel PMS — Suite Entreprise", category: "electronics", tier: "luxury", supplierName: "Cloudwing PMS", price: 7500, accountCode: 2130, deliveryFee: 0, installationCost: 900, impact: { reputation: 0.1, maintenanceCost: -0.08 }, description: "Suite complète multi-établissements, support prioritaire." },

  // ---- Nourriture & Boissons ---------------------------------------------------
  { id: "food-meat-standard", name: "Viandes — Approvisionnement boucher", category: "food", tier: "standard", supplierName: "Boucherie Fermière du Nord", price: 480, accountCode: 300, deliveryFee: 25, installationCost: 0, impact: {}, description: "Un réassort de viandes fraîches pour le restaurant." },
  { id: "food-fish-standard", name: "Poissons & fruits de mer frais", category: "food", tier: "standard", supplierName: "Marée Atlantique", price: 520, accountCode: 300, deliveryFee: 30, installationCost: 0, impact: {}, description: "Arrivage frais du jour, criée locale." },
  { id: "food-produce-entry", name: "Produits frais — Fruits & légumes", category: "food", tier: "entry", supplierName: "Primeur du Marché", price: 210, accountCode: 300, deliveryFee: 15, installationCost: 0, impact: { rse: 1 }, description: "Un réassort classique de saison." },
  { id: "food-produce-luxury", name: "Produits frais — Circuit court bio", category: "food", tier: "luxury", supplierName: "Ferme des Trois Chênes", price: 380, accountCode: 300, deliveryFee: 20, installationCost: 0, impact: { reputation: 0.05, rse: 4 }, description: "Producteurs locaux certifiés bio." },
  { id: "food-wine-standard", name: "Cave à vins — Sélection régionale", category: "food", tier: "standard", supplierName: "Cave Duchêne", price: 900, accountCode: 301, deliveryFee: 30, installationCost: 0, impact: { reputation: 0.1 }, description: "Une sélection de vins régionaux pour la carte." },
  { id: "food-spirits-luxury", name: "Spiritueux & vins de prestige", category: "food", tier: "luxury", supplierName: "Cave Duchêne", price: 2600, accountCode: 301, deliveryFee: 40, installationCost: 0, impact: { reputation: 0.2 }, description: "Grands crus et spiritueux d'exception pour le bar." },
  { id: "food-beer-entry", name: "Bières — Assortiment pression & bouteille", category: "food", tier: "entry", supplierName: "Brasserie du Port", price: 320, accountCode: 301, deliveryFee: 20, installationCost: 0, impact: {}, description: "Un assortiment courant pour le bar." },

  // ---- Décoration & Ambiance -----------------------------------------------------
  { id: "decor-art-standard", name: "Œuvres d'art — Collection locale", category: "decor", tier: "standard", supplierName: "Galerie Horizon", price: 1800, accountCode: 2420, deliveryFee: 80, installationCost: 60, impact: { reputation: 0.15 }, description: "Une sélection d'artistes locaux pour les espaces communs." },
  { id: "decor-art-luxury", name: "Œuvres d'art — Pièces signées", category: "decor", tier: "luxury", supplierName: "Galerie Horizon", price: 5200, accountCode: 2420, deliveryFee: 120, installationCost: 100, impact: { reputation: 0.3 }, description: "Œuvres signées, une signature forte pour l'établissement." },
  { id: "decor-rugs-standard", name: "Tapis & moquettes — Fibres naturelles", category: "decor", tier: "standard", supplierName: "Jardins & Cie", price: 950, accountCode: 2420, deliveryFee: 60, installationCost: 40, impact: { reputation: 0.06, rse: 1 }, description: "Une gamme chaleureuse pour le hall et les couloirs." },
  { id: "decor-plants-entry", name: "Végétalisation — Plantes d'intérieur", category: "decor", tier: "entry", supplierName: "Jardins & Cie", price: 380, accountCode: 2420, deliveryFee: 30, installationCost: 20, impact: { rse: 3 }, description: "Une première touche verte dans les espaces communs." },
  { id: "decor-plants-luxury", name: "Végétalisation — Mur végétal", category: "decor", tier: "luxury", supplierName: "GreenAir Systems", price: 4200, accountCode: 2420, deliveryFee: 150, installationCost: 600, impact: { reputation: 0.2, rse: 8 }, description: "Un mur végétal spectaculaire, fort impact RSE et visuel." },
];

export function itemsByCategory(categoryId) {
  return CATALOGUE.filter((item) => item.category === categoryId);
}

export function itemById(itemId) {
  return CATALOGUE.find((item) => item.id === itemId) || null;
}
