import { useEffect, useMemo, useState } from "react";
import {
  buildRestaurantSimulation,
  defaultRestaurantState,
  restaurantAchievements,
  restaurantDifficultyLevels,
  restaurantProgression,
  restaurantTutorialSteps,
} from "../lib/restaurant";
import { useSupabaseRestaurant } from "./useSupabaseRestaurant";

const LOCAL_STORAGE_KEY = "restaurant-simulator-state";

function readLocalState() {
  if (typeof window === "undefined") return null;

  try {
    const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    return {
      ...defaultRestaurantState,
      ...parsed,
      structure: { ...defaultRestaurantState.structure, ...(parsed.structure || {}) },
      finance: { ...defaultRestaurantState.finance, ...(parsed.finance || {}) },
      staff: Array.isArray(parsed.staff) ? parsed.staff : defaultRestaurantState.staff,
      menu: Array.isArray(parsed.menu) ? parsed.menu : defaultRestaurantState.menu,
      operations: Array.isArray(parsed.operations) ? parsed.operations : defaultRestaurantState.operations,
      marketing: { ...defaultRestaurantState.marketing, ...(parsed.marketing || {}) },
      esg: { ...defaultRestaurantState.esg, ...(parsed.esg || {}) },
      expansion: { ...defaultRestaurantState.expansion, ...(parsed.expansion || {}) },
      progression: { ...defaultRestaurantState.progression, ...(parsed.progression || {}) },
    };
  } catch (loadError) {
    return null;
  }
}

export function useRestaurantSimulator() {
  const { data: persistedState, loading, error, persist } = useSupabaseRestaurant(defaultRestaurantState);
  const [state, setState] = useState(() => readLocalState() || defaultRestaurantState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!loading && !error) {
      setState(persistedState);
      setHydrated(true);
    }
    if (!loading && error) {
      setState(readLocalState() || defaultRestaurantState);
      setHydrated(true);
    }
  }, [persistedState, loading, error]);

  const playerLevel = Math.max(1, Math.floor((state.progression?.xp || 0) / 100) + 1);
  const difficulty = restaurantDifficultyLevels.find((level) => level.id === state.progression?.difficulty) || restaurantDifficultyLevels[0];
  const simulation = useMemo(() => buildRestaurantSimulation(state, difficulty.multiplier), [state, difficulty.multiplier]);

  useEffect(() => {
    if (hydrated) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      }
      persist(state).catch(() => undefined);
    }
  }, [state, hydrated, persist]);

  const advanceSimulation = (step = 1) => {
    setState((previous) => {
      const currentDifficulty = restaurantDifficultyLevels.find((level) => level.id === previous.progression?.difficulty) || restaurantDifficultyLevels[0];
      const metrics = buildRestaurantSimulation(previous, currentDifficulty.multiplier);
      const earnedXp = Math.max(10, Math.round(metrics.profit > 0 ? 35 + metrics.demand / 4 : 15));
      const nextXp = (previous.progression?.xp || 0) + earnedXp * step;
      const nextLevel = Math.max(1, Math.floor(nextXp / 100) + 1);
      const achievementChecks = {
        "first-cycle": (previous.progression?.cycles || 0) + step >= 1,
        "profitable-month": metrics.profit > 0,
        "full-team": previous.staff.length >= 6,
        "popular-menu": metrics.menuPopularity >= 90,
        sustainable: metrics.esgImpact >= 90,
        expansion: metrics.demand >= 95 && nextLevel >= 9,
      };
      const newAchievements = restaurantAchievements
        .filter((achievement) => achievementChecks[achievement.id] && !(previous.progression?.unlockedAchievements || []).includes(achievement.id))
        .map((achievement) => achievement.id);
      const nextRevenue = [...previous.finance.revenue];
      const nextCosts = [...previous.finance.costs];

      nextRevenue[nextRevenue.length - 1] = Number(
        (nextRevenue[nextRevenue.length - 1] + metrics.revenue * step).toFixed(0)
      );
      nextCosts[nextCosts.length - 1] = Number(
        (nextCosts[nextCosts.length - 1] + metrics.cost * step).toFixed(0)
      );

      return {
        ...previous,
        finance: {
          ...previous.finance,
          revenue: nextRevenue,
          costs: nextCosts,
        },
        operations: previous.operations.map((task) => {
          if (task.type === "complaint" && metrics.complaints > 3) {
            return { ...task, status: "ouverte" };
          }
          if (task.type === "maintenance" && metrics.maintenanceRisk > 40) {
            return { ...task, status: "planifiée" };
          }
          return task;
        }),
        progression: {
          ...previous.progression,
          xp: nextXp,
          cycles: (previous.progression?.cycles || 0) + step,
          unlockedAchievements: [...(previous.progression?.unlockedAchievements || []), ...newAchievements],
          completedTutorials: restaurantTutorialSteps
            .filter((tutorial, index) => nextLevel >= index + 2)
            .map((tutorial) => tutorial.id),
        },
      };
    });
  };

  const setDifficulty = (difficultyId) => {
    const selected = restaurantDifficultyLevels.find((level) => level.id === difficultyId);
    if (selected && playerLevel >= selected.requiredLevel) {
      setState((previous) => ({
        ...previous,
        progression: { ...previous.progression, difficulty: selected.id },
      }));
    }
  };

  const updateStructure = (changes) => {
    setState((previous) => ({
      ...previous,
      structure: { ...previous.structure, ...changes },
    }));
  };

  const updateFinance = (changes) => {
    setState((previous) => ({
      ...previous,
      finance: { ...previous.finance, ...changes },
    }));
  };

  const updateStaff = (id, changes) => {
    setState((previous) => ({
      ...previous,
      staff: previous.staff.map((person) =>
        person.id === id ? { ...person, ...changes } : person
      ),
    }));
  };

  const addStaff = () => {
    setState((previous) => ({
      ...previous,
      staff: [
        ...previous.staff,
        {
          id: Date.now(),
          name: "Nouveau membre",
          role: "Serveur",
          department: "Service",
          salary: 2300,
          skills: ["Service"],
        },
      ],
    }));
  };

  const removeStaff = (id) => {
    setState((previous) => ({
      ...previous,
      staff: previous.staff.filter((person) => person.id !== id),
    }));
  };

  const updateMenu = (id, changes) => {
    setState((previous) => ({
      ...previous,
      menu: previous.menu.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      ),
    }));
  };

  const addMenuItem = () => {
    setState((previous) => ({
      ...previous,
      menu: [
        ...previous.menu,
        {
          id: Date.now(),
          name: "Nouvel article",
          category: "Plat",
          cost: 8,
          price: 15,
          sales: 10,
        },
      ],
    }));
  };

  const removeMenuItem = (id) => {
    setState((previous) => ({
      ...previous,
      menu: previous.menu.filter((item) => item.id !== id),
    }));
  };

  const updateOperation = (id, changes) => {
    setState((previous) => ({
      ...previous,
      operations: previous.operations.map((task) =>
        task.id === id ? { ...task, ...changes } : task
      ),
    }));
  };

  const updateMarketing = (changes) => {
    setState((previous) => ({
      ...previous,
      marketing: { ...previous.marketing, ...changes },
    }));
  };

  const updateMarketingChannel = (id, changes) => {
    setState((previous) => ({
      ...previous,
      marketing: {
        ...previous.marketing,
        channels: previous.marketing.channels.map((channel) => channel.id === id ? { ...channel, ...changes } : channel),
      },
    }));
  };

  const addMarketingCampaign = () => {
    setState((previous) => ({
      ...previous,
      marketing: {
        ...previous.marketing,
        campaigns: [...previous.marketing.campaigns, { id: Date.now(), name: "Nouvelle campagne", objective: "Fidélisation", status: "draft", budget: 500, conversion: 3 }],
      },
    }));
  };

  const updateMarketingCampaign = (id, changes) => {
    setState((previous) => ({
      ...previous,
      marketing: {
        ...previous.marketing,
        campaigns: previous.marketing.campaigns.map((campaign) => campaign.id === id ? { ...campaign, ...changes } : campaign),
      },
    }));
  };

  const removeMarketingCampaign = (id) => {
    setState((previous) => ({
      ...previous,
      marketing: { ...previous.marketing, campaigns: previous.marketing.campaigns.filter((campaign) => campaign.id !== id) },
    }));
  };

  const updateEsg = (changes) => {
    setState((previous) => ({ ...previous, esg: { ...previous.esg, ...changes } }));
  };

  const updateExpansion = (changes) => {
    setState((previous) => ({ ...previous, expansion: { ...previous.expansion, ...changes } }));
  };

  const updateEstablishment = (id, changes) => {
    setState((previous) => ({
      ...previous,
      expansion: { ...previous.expansion, establishments: previous.expansion.establishments.map((establishment) => establishment.id === id ? { ...establishment, ...changes } : establishment) },
    }));
  };

  const addEstablishment = () => {
    setState((previous) => ({
      ...previous,
      expansion: {
        ...previous.expansion,
        establishments: [...previous.expansion.establishments, { id: Date.now(), name: "Nouvel établissement", city: "Ville à définir", capacity: 60, status: "planned", manager: "À recruter" }],
      },
    }));
  };

  const removeEstablishment = (id) => {
    setState((previous) => ({
      ...previous,
      expansion: { ...previous.expansion, establishments: previous.expansion.establishments.filter((establishment) => establishment.id !== id) },
    }));
  };

  const addOperation = () => {
    setState((previous) => ({
      ...previous,
      operations: [
        ...previous.operations,
        {
          id: Date.now(),
          title: "Nouvelle tâche",
          type: "cleaning",
          status: "à faire",
          owner: "Équipe",
          priority: "moyenne",
          dueIn: "2h",
        },
      ],
    }));
  };

  const removeOperation = (id) => {
    setState((previous) => ({
      ...previous,
      operations: previous.operations.filter((task) => task.id !== id),
    }));
  };

  const totalMonthlyRevenue = state.finance.revenue.reduce((sum, value) => sum + value, 0);
  const monthlyCosts = state.finance.costs.reduce((sum, value) => sum + value, 0);
  const payroll = state.staff.reduce((sum, person) => sum + Number(person.salary || 0), 0);
  const taxAmount = totalMonthlyRevenue * ((Number(state.finance.taxes) || 0) / 100);
  const totalMonthlyCosts = monthlyCosts + Number(state.finance.fixedCosts || 0) + Number(state.finance.rent || 0) + taxAmount;

  const menuGrossRevenue = state.menu.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.sales || 0) * 30,
    0
  );

  const menuGrossCost = state.menu.reduce(
    (sum, item) => sum + Number(item.cost || 0) * Number(item.sales || 0) * 30,
    0
  );

  const grossMargin = menuGrossRevenue - menuGrossCost;
  const operatingProfit = totalMonthlyRevenue - totalMonthlyCosts - payroll;
  const avgTicket =
    state.menu.length > 0
      ? state.menu.reduce((sum, item) => sum + Number(item.price || 0), 0) / state.menu.length
      : 0;

  const staffCount = state.staff.length;
  const averageSalary = staffCount > 0 ? payroll / staffCount : 0;
  const menuCount = state.menu.length;
  const utilization = Math.min(
    100,
    Math.max(30, Math.round((state.structure.capacity / state.structure.seats) * 100))
  );
  const score = Math.max(30, Math.min(100, Math.round(utilization * 0.5 + (operatingProfit / 1500) + 30)));

  const progression = restaurantProgression.modules.reduce((acc, module, moduleIndex) => {
    const previousModule = restaurantProgression.modules[restaurantProgression.modules.indexOf(module) - 1];
    const unlocked = score >= module.requiredScore && playerLevel >= moduleIndex + 1 && (!previousModule || acc.modules[acc.modules.length - 1].unlocked);
    acc.modules.push({ ...module, unlocked });
    if (unlocked) acc.currentLevel += 1;
    return acc;
  }, { currentLevel: 0, modules: [] });

  const nextUnlock = progression.modules.find((module) => !module.unlocked);

  return {
    state,
    loading,
    error,
    structure: state.structure,
    finance: state.finance,
    staff: state.staff,
    menu: state.menu,
    operations: state.operations,
    marketing: state.marketing,
    esg: state.esg,
    expansion: state.expansion,
    simulation,
    advanceSimulation,
    setDifficulty,
    progression: {
      ...progression,
      score,
      utilization,
      nextUnlock: nextUnlock ? nextUnlock.label : "Tous les modules sont débloqués",
      activeModules: progression.modules.filter((module) => module.unlocked).map((module) => module.id),
      playerLevel,
      xp: state.progression?.xp || 0,
      cycles: state.progression?.cycles || 0,
      difficulty: difficulty.id,
      difficultyLabel: difficulty.label,
      difficultyMultiplier: difficulty.multiplier,
      tutorials: restaurantTutorialSteps.map((tutorial) => ({
        ...tutorial,
        completed: (state.progression?.completedTutorials || []).includes(tutorial.id),
        unlocked: progression.modules.some((module) => module.id === tutorial.module && module.unlocked),
      })),
      achievements: restaurantAchievements.map((achievement) => ({
        ...achievement,
        unlocked: (state.progression?.unlockedAchievements || []).includes(achievement.id),
      })),
    },
    kpis: {
      totalMonthlyRevenue,
      totalMonthlyCosts,
      operatingProfit,
      grossMargin,
      payroll,
      avgTicket,
      staffCount,
      averageSalary,
      menuCount,
      utilization,
      score,
      demand: simulation.demand,
      rushHour: simulation.rushHour,
      staffProductivity: simulation.staffProductivity,
      customerSatisfaction: simulation.customerSatisfaction,
      menuPopularity: simulation.menuPopularity,
      complaints: simulation.complaints,
      maintenanceRisk: simulation.maintenanceRisk,
      esgImpact: simulation.esgImpact,
      marketingReach: simulation.marketingReach,
      esgReadiness: simulation.esgReadiness,
      activeEstablishments: simulation.activeEstablishments,
      simulationRevenue: simulation.revenue,
      simulationCost: simulation.cost,
      simulationProfit: simulation.profit,
    },
    updateStructure,
    updateFinance,
    updateStaff,
    addStaff,
    removeStaff,
    updateMenu,
    addMenuItem,
    removeMenuItem,
    updateOperation,
    addOperation,
    removeOperation,
    updateMarketing,
    updateMarketingChannel,
    addMarketingCampaign,
    updateMarketingCampaign,
    removeMarketingCampaign,
    updateEsg,
    updateExpansion,
    updateEstablishment,
    addEstablishment,
    removeEstablishment,
    isModuleUnlocked(moduleId) {
      return progression.modules.some(
        (module) => module.id === moduleId && module.unlocked
      );
    },
  };
}
