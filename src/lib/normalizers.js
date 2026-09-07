// Normalizers repair unreliable/malformed data (nulls, JSON strings, arrays
// where objects are expected, objects where arrays are expected, etc.) into
// the shapes consumed by useRestaurantSimulator and the Restaurant* pages.
import { safeArray, safeNumber, safeObject, safeString } from "./safe";
import { normalizeFinanceMonths } from "./restaurantRepository";
import {
  restaurantStructure,
  restaurantFinancials,
  restaurantMarketing,
  restaurantEsg,
  restaurantExpansion,
  defaultRestaurantState,
} from "./restaurant";
import {
  hotelStructure,
  hotelFinancials,
  hotelMarketing,
  hotelEsg,
  hotelExpansion,
  defaultHotelState,
} from "./hotel";

function safeStringArray(value, fallback) {
  return safeArray(value, fallback).map((item) => safeString(item, ""));
}

export function normalizeStructure(input) {
  const source = safeObject(input);
  const capacity = safeNumber(source.capacity, restaurantStructure.capacity);

  return {
    concept: safeString(source.concept, restaurantStructure.concept),
    location: safeString(source.location, restaurantStructure.location),
    capacity,
    seats: safeNumber(source.seats, capacity || restaurantStructure.seats),
    materials: safeStringArray(source.materials, restaurantStructure.materials),
    equipment: safeStringArray(source.equipment, restaurantStructure.equipment),
    floors: safeNumber(source.floors, 1),
    sections: safeStringArray(source.sections, ["main"]),
    layout: safeString(source.layout, "standard"),
    openingHours: safeString(source.openingHours ?? source.opening_hours, ""),
  };
}

export function normalizeFinance(input) {
  const source = safeObject(input);
  const revenue = safeArray(source.revenue, restaurantFinancials.revenue).map((value) => safeNumber(value, 0));
  const costs = safeArray(source.costs, restaurantFinancials.costs).map((value) => safeNumber(value, 0));
  const rawTaxes = source.taxes;
  const taxes = Array.isArray(rawTaxes) || (typeof rawTaxes === "string" && rawTaxes.trim().startsWith("["))
    ? safeArray(rawTaxes, []).map((value) => safeNumber(value, 0))
    : safeNumber(rawTaxes, restaurantFinancials.taxes);

  return {
    day: source.day,
    months: normalizeFinanceMonths(source.months ?? restaurantFinancials.months),
    revenue: revenue.length ? revenue : [...restaurantFinancials.revenue],
    costs: costs.length ? costs : [...restaurantFinancials.costs],
    payroll: safeNumber(source.payroll, restaurantFinancials.payroll),
    fixedCosts: safeNumber(source.fixedCosts ?? source.fixed_costs, restaurantFinancials.fixedCosts),
    rent: safeNumber(source.rent, restaurantFinancials.rent),
    taxes,
    waste: safeArray(source.waste, []).map((value) => safeNumber(value, 0)),
    energy: safeArray(source.energy, []).map((value) => safeNumber(value, 0)),
    energyCost: safeArray(source.energyCost ?? source.energy_cost, []).map((value) => safeNumber(value, 0)),
  };
}

export function normalizeMarketing(input) {
  const source = safeObject(input);
  const channels = safeArray(source.channels, restaurantMarketing.channels).map((channel) => {
    const channelSource = safeObject(channel);
    return {
      id: channelSource.id ?? Date.now() + Math.random(),
      name: safeString(channelSource.name, "Canal"),
      enabled: Boolean(channelSource.enabled),
      budget: safeNumber(channelSource.budget, 0),
      reach: safeNumber(channelSource.reach, 0),
    };
  });
  const campaigns = safeArray(source.campaigns, restaurantMarketing.campaigns).map((campaign) => {
    const campaignSource = safeObject(campaign);
    return {
      id: campaignSource.id ?? Date.now() + Math.random(),
      name: safeString(campaignSource.name, "Campagne"),
      objective: safeString(campaignSource.objective, "Acquisition"),
      status: safeString(campaignSource.status, "draft"),
      budget: safeNumber(campaignSource.budget, 0),
      conversion: safeNumber(campaignSource.conversion, 0),
    };
  });

  return {
    budget: safeNumber(source.budget, restaurantMarketing.budget),
    positioning: safeString(source.positioning, restaurantMarketing.positioning),
    channels: channels.length ? channels : restaurantMarketing.channels,
    campaigns,
    roi: safeNumber(source.roi, 0),
    visibility: safeNumber(source.visibility, 0),
  };
}

export function normalizeESG(input) {
  const source = safeObject(input);

  return {
    wasteReduction: safeNumber(source.wasteReduction, restaurantEsg.wasteReduction),
    localSourcing: safeNumber(source.localSourcing, restaurantEsg.localSourcing),
    energyEfficiency: safeNumber(source.energyEfficiency, restaurantEsg.energyEfficiency),
    staffWellbeing: safeNumber(source.staffWellbeing, restaurantEsg.staffWellbeing),
    certifications: safeStringArray(source.certifications, restaurantEsg.certifications),
    monthlyInvestment: safeNumber(source.monthlyInvestment, restaurantEsg.monthlyInvestment),
  };
}

export function normalizeExpansion(input) {
  const source = safeObject(input);
  const establishments = safeArray(source.establishments, restaurantExpansion.establishments).map((establishment) => {
    const establishmentSource = safeObject(establishment);
    return {
      id: establishmentSource.id ?? Date.now() + Math.random(),
      name: safeString(establishmentSource.name, "Établissement"),
      city: safeString(establishmentSource.city, ""),
      capacity: safeNumber(establishmentSource.capacity, 0),
      status: safeString(establishmentSource.status, "planned"),
      manager: safeString(establishmentSource.manager, ""),
    };
  });

  return {
    establishments: establishments.length ? establishments : restaurantExpansion.establishments,
    pipeline: safeArray(source.pipeline, restaurantExpansion.pipeline),
    availableCapital: safeNumber(source.availableCapital, restaurantExpansion.availableCapital),
  };
}

export function normalizeProgression(input) {
  const source = safeObject(input);

  return {
    xp: safeNumber(source.xp, 0),
    completedTutorials: safeStringArray(source.completedTutorials, []),
    unlockedAchievements: safeStringArray(source.unlockedAchievements, []),
    difficulty: safeString(source.difficulty, "easy"),
    cycles: safeNumber(source.cycles, 0),
  };
}

function normalizeStaff(input) {
  return safeArray(input, defaultRestaurantState.staff).map((person) => {
    const source = safeObject(person);
    return {
      id: source.id ?? Date.now() + Math.random(),
      name: safeString(source.name, "Nouveau membre"),
      role: safeString(source.role, "Serveur"),
      department: safeString(source.department, "Service"),
      salary: safeNumber(source.salary, 0),
      skills: safeStringArray(source.skills, []),
    };
  });
}

function normalizeMenu(input) {
  return safeArray(input, defaultRestaurantState.menu).map((item) => {
    const source = safeObject(item);
    return {
      id: source.id ?? Date.now() + Math.random(),
      name: safeString(source.name, "Nouvel article"),
      category: safeString(source.category, "Plat"),
      cost: safeNumber(source.cost, 0),
      price: safeNumber(source.price, 0),
      sales: safeNumber(source.sales, 0),
    };
  });
}

function normalizeOperations(input) {
  return safeArray(input, defaultRestaurantState.operations).map((task) => {
    const source = safeObject(task);
    return {
      id: source.id ?? Date.now() + Math.random(),
      title: safeString(source.title, "Nouvelle tâche"),
      type: safeString(source.type, "cleaning"),
      status: safeString(source.status, "à faire"),
      owner: safeString(source.owner, "Équipe"),
      priority: safeString(source.priority, "moyenne"),
      dueIn: safeString(source.dueIn, ""),
    };
  });
}

function normalizePmsContext(input) {
  const source = safeObject(input);
  return {
    hotelOccupancy: safeNumber(source.hotelOccupancy, 0),
    activeGuests: safeNumber(source.activeGuests, 0),
    housekeepingIssues: safeNumber(source.housekeepingIssues, 0),
    scheduledEvents: safeNumber(source.scheduledEvents, 0),
    processedEventIds: safeArray(source.processedEventIds, []),
  };
}

export function normalizeHotelStructure(input) {
  const source = safeObject(input);
  const roomCount = safeNumber(source.roomCount ?? source.room_count, hotelStructure.roomCount);

  return {
    name: safeString(source.name, hotelStructure.name),
    location: safeString(source.location, hotelStructure.location),
    roomCount,
    starRating: safeNumber(source.starRating ?? source.star_rating, hotelStructure.starRating),
    amenities: safeStringArray(source.amenities, hotelStructure.amenities),
  };
}

export function normalizeHotelFinance(input) {
  const source = safeObject(input);
  const revenue = safeArray(source.revenue, hotelFinancials.revenue).map((value) => safeNumber(value, 0));
  const costs = safeArray(source.costs, hotelFinancials.costs).map((value) => safeNumber(value, 0));
  const rawTaxes = source.taxes;
  const taxes = Array.isArray(rawTaxes) || (typeof rawTaxes === "string" && rawTaxes.trim().startsWith("["))
    ? safeArray(rawTaxes, []).map((value) => safeNumber(value, 0))
    : safeNumber(rawTaxes, hotelFinancials.taxes);

  return {
    months: normalizeFinanceMonths(source.months ?? hotelFinancials.months),
    revenue: revenue.length ? revenue : [...hotelFinancials.revenue],
    costs: costs.length ? costs : [...hotelFinancials.costs],
    fixedCosts: safeNumber(source.fixedCosts ?? source.fixed_costs, hotelFinancials.fixedCosts),
    payroll: safeNumber(source.payroll, hotelFinancials.payroll),
    taxes,
  };
}

export function normalizeHotelMarketing(input) {
  const source = safeObject(input);
  const channels = safeArray(source.channels, hotelMarketing.channels).map((channel) => {
    const channelSource = safeObject(channel);
    return {
      id: channelSource.id ?? Date.now() + Math.random(),
      name: safeString(channelSource.name, "Canal"),
      enabled: Boolean(channelSource.enabled),
      budget: safeNumber(channelSource.budget, 0),
      reach: safeNumber(channelSource.reach, 0),
    };
  });
  const campaigns = safeArray(source.campaigns, hotelMarketing.campaigns).map((campaign) => {
    const campaignSource = safeObject(campaign);
    return {
      id: campaignSource.id ?? Date.now() + Math.random(),
      name: safeString(campaignSource.name, "Campagne"),
      objective: safeString(campaignSource.objective, "Acquisition"),
      status: safeString(campaignSource.status, "draft"),
      budget: safeNumber(campaignSource.budget, 0),
      conversion: safeNumber(campaignSource.conversion, 0),
      roi: safeNumber(campaignSource.roi, 0),
      demandUplift: safeNumber(campaignSource.demandUplift ?? campaignSource.demand_uplift, 0),
    };
  });

  return {
    budget: safeNumber(source.budget, hotelMarketing.budget),
    positioning: safeString(source.positioning, hotelMarketing.positioning),
    channels: channels.length ? channels : hotelMarketing.channels,
    campaigns,
  };
}

export function normalizeHotelESG(input) {
  const source = safeObject(input);

  return {
    energyConsumption: safeNumber(source.energyConsumption ?? source.energy_consumption, hotelEsg.energyConsumption),
    waterUsage: safeNumber(source.waterUsage ?? source.water_usage, hotelEsg.waterUsage),
    wasteReduction: safeNumber(source.wasteReduction, hotelEsg.wasteReduction),
    sustainabilityScore: safeNumber(source.sustainabilityScore, hotelEsg.sustainabilityScore),
    certifications: safeStringArray(source.certifications, hotelEsg.certifications),
    monthlyInvestment: safeNumber(source.monthlyInvestment, hotelEsg.monthlyInvestment),
  };
}

export function normalizeHotelExpansion(input) {
  const source = safeObject(input);
  const establishments = safeArray(source.establishments, hotelExpansion.establishments).map((establishment) => {
    const establishmentSource = safeObject(establishment);
    return {
      id: establishmentSource.id ?? Date.now() + Math.random(),
      name: safeString(establishmentSource.name, "Établissement"),
      city: safeString(establishmentSource.city, ""),
      roomCount: safeNumber(establishmentSource.roomCount ?? establishmentSource.room_count, 0),
      status: safeString(establishmentSource.status, "planned"),
      manager: safeString(establishmentSource.manager, ""),
      sharedStaffPool: Boolean(establishmentSource.sharedStaffPool ?? establishmentSource.shared_staff_pool),
    };
  });

  return {
    establishments: establishments.length ? establishments : hotelExpansion.establishments,
    availableCapital: safeNumber(source.availableCapital ?? source.available_capital, hotelExpansion.availableCapital),
  };
}

function normalizeHotelProgression(input) {
  const source = safeObject(input);
  return {
    cycles: safeNumber(source.cycles, 0),
  };
}

export function normalizeHotel(input) {
  const source = safeObject(input);

  return {
    structure: normalizeHotelStructure(source.structure),
    finance: normalizeHotelFinance(source.finance),
    marketing: normalizeHotelMarketing(source.marketing),
    esg: normalizeHotelESG(source.esg),
    expansion: normalizeHotelExpansion(source.expansion),
    progression: normalizeHotelProgression(source.progression ?? defaultHotelState.progression),
  };
}

export function normalizeRestaurant(input) {
  const source = safeObject(input);

  return {
    structure: normalizeStructure(source.structure),
    finance: normalizeFinance(source.finance),
    staff: normalizeStaff(source.staff),
    menu: normalizeMenu(source.menu),
    operations: normalizeOperations(source.operations),
    marketing: normalizeMarketing(source.marketing),
    esg: normalizeESG(source.esg),
    expansion: normalizeExpansion(source.expansion),
    pmsContext: normalizePmsContext(source.pmsContext),
    progression: normalizeProgression(source.progression),
  };
}
