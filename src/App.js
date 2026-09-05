import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";

import DashboardRM from "./pages/DashboardRM";
import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/Reservations";
import Rooms from "./pages/Rooms";
import Clients from "./pages/Clients";
import Finance from "./pages/Finance";
import Housekeeping from "./pages/Housekeeping";
import RestaurantSimulator from "./pages/RestaurantSimulator";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/dashboard-rm" element={<DashboardRM />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/housekeeping" element={<Housekeeping />} />
          <Route path="/restaurant/*" element={<RestaurantSimulator />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
