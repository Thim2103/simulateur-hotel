import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import { ChainProvider } from "./context/ChainContext";

import DashboardRM from "./pages/DashboardRM";
import RMDashboard from "./pages/RMDashboard";
import ProgressionDashboard from "./pages/ProgressionDashboard";
import ChainDashboard from "./pages/ChainDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/Reservations";
import Rooms from "./pages/Rooms";
import Clients from "./pages/Clients";
import Finance from "./pages/Finance";
import Housekeeping from "./pages/Housekeeping";
import PMS from "./pages/PMS";
import Marketing from "./pages/Marketing";
import ESG from "./pages/ESG";
import Expansion from "./pages/Expansion";
import RestaurantSimulator from "./pages/RestaurantSimulator";

function App() {
  return (
    <BrowserRouter>
      <ChainProvider>
        <Layout>
          <Routes>
            <Route path="/dashboard-rm" element={<DashboardRM />} />
            <Route path="/rm-dashboard" element={<RMDashboard />} />
            <Route path="/progression" element={<ProgressionDashboard />} />
            <Route path="/chain" element={<ChainDashboard />} />
            <Route path="/staff" element={<StaffDashboard />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/housekeeping" element={<Housekeeping />} />
            <Route path="/pms" element={<PMS />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/esg" element={<ESG />} />
            <Route path="/expansion" element={<Expansion />} />
            <Route path="/restaurant/*" element={<RestaurantSimulator />} />
          </Routes>
        </Layout>
      </ChainProvider>
    </BrowserRouter>
  );
}

export default App;
