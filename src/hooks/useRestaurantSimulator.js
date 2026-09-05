import {
  restaurantFinancials,
  restaurantMenu,
  restaurantStaff,
  restaurantStructure,
} from "../lib/restaurant";

export function useRestaurantSimulator() {
  const totalMonthlyRevenue = restaurantFinancials.revenue.reduce(
    (sum, value) => sum + value,
    0
  );

  const totalMonthlyCosts = restaurantFinancials.costs.reduce(
    (sum, value) => sum + value,
    0
  );

  const payroll = restaurantStaff.reduce((sum, person) => sum + person.salary, 0);

  const menuGrossRevenue = restaurantMenu.reduce(
    (sum, item) => sum + item.price * item.sales * 30,
    0
  );

  const menuGrossCost = restaurantMenu.reduce(
    (sum, item) => sum + item.cost * item.sales * 30,
    0
  );

  const grossMargin = menuGrossRevenue - menuGrossCost;
  const operatingProfit = totalMonthlyRevenue - totalMonthlyCosts - payroll;
  const avgTicket = restaurantMenu.reduce((sum, item) => sum + item.price, 0) / restaurantMenu.length;

  const staffCount = restaurantStaff.length;
  const averageSalary = payroll / staffCount;
  const menuCount = restaurantMenu.length;

  return {
    structure: restaurantStructure,
    finance: restaurantFinancials,
    staff: restaurantStaff,
    menu: restaurantMenu,
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
      utilization: 74,
      score: 86,
    },
  };
}
