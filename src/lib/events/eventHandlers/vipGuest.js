// A VIP guest checks in and leaves a generous tip / extra spend. More
// likely when the hotel is actively marketing itself (a proxy for the kind
// of clientele the property is currently attracting).
export const vipGuestEvent = {
  id: "vip_guest",
  name: "Client VIP",
  category: "guest",
  conditions: ({ hotelState }) => Number(hotelState?.structure?.roomCount || 0) > 0,
  probability: ({ hotelState }) => (Number(hotelState?.marketing?.budget || 0) > 3000 ? 0.08 : 0.04),
  apply: () => ({ message: "Un client VIP séjourne à l'hôtel et laisse un pourboire généreux.", severity: "low" }),
  impact: { revenue: 200, expenses: 0, staff: 0, reputation: 2 },
  duration: 1,
};
