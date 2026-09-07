// Consolidates each hotel's DailyReport finance figures into chain-wide
// totals, plus a per-hotel breakdown for the dashboard's hotel list.
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

// results: [{ hotel, dailyReport }] -- see chainEngine.js.
export function consolidateFinance(results = []) {
  const byHotel = safeArray(results).map(({ hotel, dailyReport }) => {
    const revenue = Number(dailyReport?.hotelRevenue?.netRevenue || 0) + Number(dailyReport?.restaurantRevenue?.netRevenue || 0);
    const expenses = Number(dailyReport?.expenses?.total || 0);
    return {
      hotelId: hotel.id,
      name: hotel.name,
      revenue: Math.round(revenue),
      expenses: Math.round(expenses),
      profit: Math.round(Number(dailyReport?.profit || 0)),
    };
  });

  const totals = byHotel.reduce(
    (acc, hotel) => ({
      totalRevenue: acc.totalRevenue + hotel.revenue,
      totalExpenses: acc.totalExpenses + hotel.expenses,
      totalProfit: acc.totalProfit + hotel.profit,
    }),
    { totalRevenue: 0, totalExpenses: 0, totalProfit: 0 }
  );

  return { ...totals, byHotel };
}
