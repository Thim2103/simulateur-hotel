import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import { ChainProvider } from "./context/ChainContext";
import { AcademyProvider } from "./context/AcademyContext";
import { CompetitionProvider } from "./context/CompetitionContext";

import DashboardRM from "./pages/DashboardRM";
import RMDashboard from "./pages/RMDashboard";
import ProgressionDashboard from "./pages/ProgressionDashboard";
import ChainDashboard from "./pages/ChainDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AcademyDashboard from "./pages/AcademyDashboard";
import AcademyClass from "./pages/AcademyClass";
import AcademyGroup from "./pages/AcademyGroup";
import AcademyReview from "./pages/AcademyReview";
import CompetitionDashboard from "./pages/CompetitionDashboard";
import CompetitionMatch from "./pages/CompetitionMatch";
import CompetitionPlayer from "./pages/CompetitionPlayer";
import CompetitionReview from "./pages/CompetitionReview";
import ReplayViewer from "./pages/ReplayViewer";
import ReplayCompare from "./pages/ReplayCompare";
import ReplayExport from "./pages/ReplayExport";
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
        <AcademyProvider>
          <CompetitionProvider>
            <Layout>
              <Routes>
                <Route path="/dashboard-rm" element={<DashboardRM />} />
                <Route path="/rm-dashboard" element={<RMDashboard />} />
                <Route path="/progression" element={<ProgressionDashboard />} />
                <Route path="/chain" element={<ChainDashboard />} />
                <Route path="/staff" element={<StaffDashboard />} />
                <Route path="/academy" element={<AcademyDashboard />} />
                <Route path="/academy/:classId" element={<AcademyClass />} />
                <Route path="/academy/:classId/group/:groupId" element={<AcademyGroup />} />
                <Route path="/academy/:classId/review" element={<AcademyReview />} />
                <Route path="/competition" element={<CompetitionDashboard />} />
                <Route path="/competition/:matchId" element={<CompetitionMatch />} />
                <Route path="/competition/:matchId/player/:playerId" element={<CompetitionPlayer />} />
                <Route path="/competition/:matchId/review" element={<CompetitionReview />} />
                <Route path="/replay/compare/:runIdA/:runIdB" element={<ReplayCompare />} />
                <Route path="/replay/:runId/export" element={<ReplayExport />} />
                <Route path="/replay/:runId" element={<ReplayViewer />} />
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
          </CompetitionProvider>
        </AcademyProvider>
      </ChainProvider>
    </BrowserRouter>
  );
}

export default App;
