import { useEffect, useMemo, useState } from "react";
import {
  buildRestaurantSimulation,
  defaultRestaurantState,
  restaurantAchievements,
  restaurantDifficultyLevels,
  restaurantProgression,
  restaurantTutorialSteps,
} from "../lib/legacyRestaurantSimulator";
import { useSupabaseRestaurant } from "./useSupabaseRestaurant";
import { getPmsEvents, subscribeToPmsEvents } from "../lib/pmsRestaurantBridge";

export function useRestaurantSimulator() {
  const { data: persistedState, loading, error, persist, reload } = useSupabaseRestaurant(defaultRestaurantState);
  const [state, setState] = useState(defaultRestaurantState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!loading) {
      // persistedState is always normalized/safe (see useSupabaseRestaurant),
      // including the mock fallback used when Supabase fails, so the
      // simulator remains usable even when `error` is set.
      setState(persistedState);
      setHydrated(true);
    }
  }, [persistedState, loading]);

  useEffect(() => {
    if (!hydrated) return undefined;

    const applyPmsEvent = (event) => {
      if (!event?.id) return;
      setState((previous) => {
        const context = previous.pmsContext || defaultRestaurantState.pmsContext;
        if ((context.processedEventIds || []).includes(event.id)) return previous;

        const nextContext = {
          ...context,
          processedEventIds: [...(context.processedEventIds || []), event.id].slice(-100),
        };
        const payload = event.payload || {};
        let task = null;

        if (event.type === "reservation.synced" || event.type === "reservation.updated") {
          const reservations = payload.reservations || (payload.reservation ? [payload.reservation] : []);
          const confirmed = reservations.filter((reservation) => String(reservation.status || "").toLowerCase().includes("confirm"));
          nextContext.activeGuests = confirmed.reduce((sum, reservation) => sum + Number(reservation.guests || reservation.adults || 1), 0);
          nextContext.hotelOccupancy = Number(payload.occupancy || nextContext.hotelOccupancy || 0);
          task = { title: "Préparer le service des clients hôtel", type: "service", owner: "Équipe service", priority: "moyenne", dueIn: "Aujourd'hui" };
        } else if (event.type === "housekeeping.updated") {
          nextContext.housekeepingIssues = Math.max(0, Number(payload.dirty || 0) + Number(payload.inProgress || 0));
          task = { title: `Coordonner les chambres ${payload.status === "clean" ? "prêtes" : "à traiter"}`, type: "cleaning", owner: "Équipe service", priority: payload.status === "dirty" ? "haute" : "moyenne", dueIn: "1h" };
        } else if (event.type === "scheduling.synced") {
          nextContext.scheduledEvents = Number(payload.count || 0);
          task = { title: "Préparer les prestations séminaires", type: "service", owner: "Équipe événementiel", priority: "haute", dueIn: "À planifier" };
        }

        const operations = task
          ? [...previous.operations, { id: `pms-${event.id}`, status: "à faire", ...task }].slice(-30)
          : previous.operations;
        return { ...previous, pmsContext: nextContext, operations };
      });
    };

    getPmsEvents().forEach(applyPmsEvent);
    return subscribeToPmsEvents(applyPmsEvent);
  }, [hydrated]);

  const playerLevel = Math.max(1, Math.floor((state.progression?.xp || 0) / 100) + 1);
  const difficulty = restaurantDifficultyLevels.find((level) => level.id === state.progression?.difficulty) || restaurantDifficultyLevels[0];
  const simulation = useMemo(() => buildRestaurantSimulation(state, difficulty.multiplier), [state, difficulty.multiplier]);

  useEffect(() => {
    if (hydrated && !error) {
      persist(state).catch(() => undefined);
    }
  }, [state, hydrated, error, persist]);

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
  const taxRate = Number(state.finance.taxes[state.finance.taxes.length - 1] || 0);
  const taxAmount = totalMonthlyRevenue * (taxRate / 100);
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
    // Re-fetches the restaurant state from Supabase (e.g. after the daily
    // cycle persisted changes directly through the repository rather than
    // through this hook's own setState/persist).
    reload,
    structure: state.structure,
    finance: state.finance,
    staff: state.staff,
    menu: state.menu,
    operations: state.operations,
    pmsContext: state.pmsContext,
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
      // Set once, by the "Structure de l'établissement" form (see
      // hooks/useRestaurant.js's submitStructure() / pages/
      // RestaurantStructure.jsx) -- both hooks read/write the same
      // restaurants.progression column, so this reflects it here too.
      ready: Boolean(state.progression?.ready),
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
      restaurantRevenue: totalMonthlyRevenue,
      rushHour: simulation.rushHour,
      staffProductivity: simulation.staffProductivity,
      customerSatisfaction: simulation.customerSatisfaction,
      reputation: Math.round(simulation.customerSatisfaction * 20),
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
