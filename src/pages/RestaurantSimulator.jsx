import { NavLink, Route, Routes } from "react-router-dom";
import RestaurantOverview from "./RestaurantOverview";
import RestaurantDashboard from "./RestaurantDashboard";
import RestaurantFinance from "./RestaurantFinance";
import RestaurantHR from "./RestaurantHR";
import RestaurantMenu from "./RestaurantMenu";

const tabs = [
  { to: "overview", label: "Structure" },
  { to: "dashboard", label: "Dashboard" },
  { to: "finance", label: "Finance" },
  { to: "hr", label: "RH" },
  { to: "menu", label: "Menu" },
];

export default function RestaurantSimulator() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Restaurant Simulator</h1>
        <p className="text-gray-600">Simulation opérationnelle de restaurant</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "overview"}
            className={({ isActive }) =>
              `px-4 py-2 rounded-md text-sm font-medium transition ${
                isActive
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-200"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route path="overview" element={<RestaurantOverview />} />
        <Route path="dashboard" element={<RestaurantDashboard />} />
        <Route path="finance" element={<RestaurantFinance />} />
        <Route path="hr" element={<RestaurantHR />} />
        <Route path="menu" element={<RestaurantMenu />} />
        <Route index element={<RestaurantOverview />} />
      </Routes>
    </div>
  );
}
