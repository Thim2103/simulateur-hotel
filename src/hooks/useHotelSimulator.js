import { useEffect, useMemo, useState } from "react";
import { buildHotelSimulation, defaultHotelState, hotelDifficultyLevels } from "../lib/hotel";
import { useSupabaseHotel } from "./useSupabaseHotel";
import { useRestaurantSimulator } from "./useRestaurantSimulator";

// restaurantMetricsOverride lets a caller that already has fresher RM/restaurant
// data (e.g. DashboardRM.jsx) feed it in instead of relying on the restaurant
// hook's own numbers (e.g. to inject real PMS occupancy).
export function useHotelSimulator(restaurantMetricsOverride) {
  const { data: persistedState, loading, error, persist, reload } = useSupabaseHotel(defaultHotelState);
  const [state, setState] = useState(defaultHotelState);
  const [hydrated, setHydrated] = useState(false);
  const [difficultyId, setDifficultyId] = useState("normal");
  const { kpis: restaurantKpis } = useRestaurantSimulator();

  useEffect(() => {
    if (!loading) {
      setState(persistedState);
      setHydrated(true);
    }
  }, [persistedState, loading]);

  useEffect(() => {
    if (hydrated && !error) {
      persist(state).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hydrated, error]);

  const difficulty = hotelDifficultyLevels.find((level) => level.id === difficultyId) || hotelDifficultyLevels[1];

  const restaurantMetrics = useMemo(
    () => ({
      demand: restaurantKpis.demand,
      customerSatisfaction: restaurantKpis.customerSatisfaction,
      totalMonthlyRevenue: restaurantKpis.totalMonthlyRevenue,
      occupancy: 0,
      ...restaurantMetricsOverride,
    }),
    [restaurantKpis, restaurantMetricsOverride]
  );

  const simulation = useMemo(
    () => buildHotelSimulation(state, restaurantMetrics, difficulty.multiplier),
    [state, restaurantMetrics, difficulty.multiplier]
  );

  const setDifficulty = (difficultyIdValue) => {
    const selected = hotelDifficultyLevels.find((level) => level.id === difficultyIdValue);
    if (selected) setDifficultyId(selected.id);
  };

  const advanceSimulation = (step = 1) => {
    setState((previous) => {
      const metrics = buildHotelSimulation(previous, restaurantMetrics, difficulty.multiplier);
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
        progression: {
          ...previous.progression,
          cycles: (previous.progression?.cycles || 0) + step,
        },
      };
    });
  };

  const updateStructure = (changes) => {
    setState((previous) => ({ ...previous, structure: { ...previous.structure, ...changes } }));
  };

  const updateFinance = (changes) => {
    setState((previous) => ({ ...previous, finance: { ...previous.finance, ...changes } }));
  };

  const updateMarketing = (changes) => {
    setState((previous) => ({ ...previous, marketing: { ...previous.marketing, ...changes } }));
  };

  const updateMarketingChannel = (id, changes) => {
    setState((previous) => ({
      ...previous,
      marketing: {
        ...previous.marketing,
        channels: previous.marketing.channels.map((channel) => (channel.id === id ? { ...channel, ...changes } : channel)),
      },
    }));
  };

  const addMarketingCampaign = () => {
    setState((previous) => ({
      ...previous,
      marketing: {
        ...previous.marketing,
        campaigns: [
          ...previous.marketing.campaigns,
          { id: Date.now(), name: "Nouvelle campagne", objective: "Acquisition", status: "draft", budget: 800, conversion: 4, roi: 1, demandUplift: 2 },
        ],
      },
    }));
  };

  const updateMarketingCampaign = (id, changes) => {
    setState((previous) => ({
      ...previous,
      marketing: {
        ...previous.marketing,
        campaigns: previous.marketing.campaigns.map((campaign) => (campaign.id === id ? { ...campaign, ...changes } : campaign)),
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
      expansion: {
        ...previous.expansion,
        establishments: previous.expansion.establishments.map((establishment) =>
          establishment.id === id ? { ...establishment, ...changes } : establishment
        ),
      },
    }));
  };

  const addEstablishment = () => {
    setState((previous) => ({
      ...previous,
      expansion: {
        ...previous.expansion,
        establishments: [
          ...previous.expansion.establishments,
          { id: Date.now(), name: "Nouvel établissement", city: "Ville à définir", roomCount: 60, status: "planned", manager: "À recruter", sharedStaffPool: false },
        ],
      },
    }));
  };

  const removeEstablishment = (id) => {
    setState((previous) => ({
      ...previous,
      expansion: { ...previous.expansion, establishments: previous.expansion.establishments.filter((establishment) => establishment.id !== id) },
    }));
  };

  const totalMonthlyRevenue = state.finance.revenue.reduce((sum, value) => sum + Number(value || 0), 0);
  const totalMonthlyBaseCosts = state.finance.costs.reduce((sum, value) => sum + Number(value || 0), 0);
  const fixedCosts = Number(state.finance.fixedCosts || 0);
  const payroll = Number(state.finance.payroll || 0);
  const taxRate = Array.isArray(state.finance.taxes) ? Number(state.finance.taxes[state.finance.taxes.length - 1] || 0) : Number(state.finance.taxes || 0);
  const taxAmount = totalMonthlyRevenue * (taxRate / 100);
  const totalMonthlyCosts = totalMonthlyBaseCosts + fixedCosts + payroll + taxAmount;
  const operatingProfit = totalMonthlyRevenue - totalMonthlyCosts;

  return {
    state,
    loading,
    error,
    // Re-fetches the hotel state from Supabase (e.g. after another process,
    // such as the daily cycle, persisted changes directly through the
    // repository rather than through this hook's own setState/persist).
    reload,
    structure: state.structure,
    finance: state.finance,
    marketing: state.marketing,
    esg: state.esg,
    expansion: state.expansion,
    simulation,
    advanceSimulation,
    setDifficulty,
    updateStructure,
    updateFinance,
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
    kpis: {
      totalMonthlyRevenue,
      totalMonthlyCosts,
      operatingProfit,
      payroll,
      fixedCosts,
      taxRate,
      cycles: state.progression?.cycles || 0,
      difficulty: difficulty.id,
      difficultyLabel: difficulty.label,
      difficultyMultiplier: difficulty.multiplier,
      demand: simulation.demand,
      satisfaction: simulation.satisfaction,
      reputation: simulation.reputation,
      marketingReach: simulation.marketingReach,
      marketingRoi: simulation.marketingRoi,
      marketingDemandUplift: simulation.marketingDemandUplift,
      sustainabilityScore: simulation.sustainabilityScore,
      activeEstablishments: simulation.activeEstablishments,
      roomCount: simulation.roomCount,
      aggregateRoomCount: simulation.aggregateRoomCount,
      aggregateRevenue: simulation.aggregateRevenue,
      sharedStaffPoolUtilization: simulation.sharedStaffPoolUtilization,
      simulationRevenue: simulation.revenue,
      simulationCost: simulation.cost,
      simulationProfit: simulation.profit,
    },
  };
}
