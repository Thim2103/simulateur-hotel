import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layout/Layout";
import { ChainProvider } from "./context/ChainContext";
import { AcademyProvider } from "./context/AcademyContext";
import { CompetitionProvider } from "./context/CompetitionContext";
import { CareerProvider } from "./context/CareerContext";

import DashboardRM from "./pages/DashboardRM";
import RMDashboard from "./pages/RMDashboard";
import ProgressionDashboard from "./pages/ProgressionDashboard";
import ChainDashboard from "./pages/ChainDashboard";
import ChainStaffDashboard from "./pages/ChainStaffDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import StaffReport from "./pages/StaffReport";
import StaffForecast from "./pages/StaffForecast";
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
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import AnalyticsRun from "./pages/AnalyticsRun";
import AnalyticsCompare from "./pages/AnalyticsCompare";
import AnalyticsReport from "./pages/AnalyticsReport";
import CareerDashboard from "./pages/CareerDashboard";
import CareerMissions from "./pages/CareerMissions";
import CareerStory from "./pages/CareerStory";
import CareerSkills from "./pages/CareerSkills";
import CareerRewards from "./pages/CareerRewards";
import CareerNextDay from "./pages/CareerNextDay";
import GuestMode from "./pages/GuestMode";
import MainMenu from "./pages/MainMenu";
import PlayMenu from "./pages/PlayMenu";
import SelectMode from "./pages/SelectMode";
import Options from "./pages/Options";
import Credits from "./pages/Credits";
import Solo from "./pages/Solo";
import Sandbox from "./pages/Sandbox";
import Scenarios from "./pages/Scenarios";
import Challenges from "./pages/Challenges";
import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/Reservations";
import Rooms from "./pages/Rooms";
import Clients from "./pages/Clients";
import FinanceDashboard from "./pages/FinanceDashboard";
import FinanceReport from "./pages/FinanceReport";
import FinanceForecast from "./pages/FinanceForecast";
import Housekeeping from "./pages/Housekeeping";
import PMS from "./pages/PMS";
import MarketingDashboard from "./pages/MarketingDashboard";
import MarketingCampaigns from "./pages/MarketingCampaigns";
import MarketingChannels from "./pages/MarketingChannels";
import MarketingForecast from "./pages/MarketingForecast";
import MarketingReport from "./pages/MarketingReport";
import EsgDashboard from "./pages/EsgDashboard";
import EsgCertifications from "./pages/EsgCertifications";
import EsgForecast from "./pages/EsgForecast";
import EsgReport from "./pages/EsgReport";
import Expansion from "./pages/Expansion";
import RestaurantSimulator from "./pages/RestaurantSimulator";

function App() {
  return (
    <BrowserRouter>
      <ChainProvider>
        <AcademyProvider>
          <CompetitionProvider>
            <CareerProvider>
              <Layout>
                <Routes>
                  <Route path="/menu" element={<MainMenu />} />
                  <Route path="/play" element={<PlayMenu />} />
                  <Route path="/select-mode" element={<SelectMode />} />
                  <Route path="/options" element={<Options />} />
                  <Route path="/credits" element={<Credits />} />
                  <Route path="/solo" element={<Solo />} />
                  <Route path="/sandbox" element={<Sandbox />} />
                  <Route path="/scenarios" element={<Scenarios />} />
                  <Route path="/challenges" element={<Challenges />} />
                  <Route path="/guest" element={<GuestMode />} />
                  <Route path="/career" element={<CareerDashboard />} />
                  <Route path="/career/missions" element={<CareerMissions />} />
                  <Route path="/career/story" element={<CareerStory />} />
                  <Route path="/career/skills" element={<CareerSkills />} />
                  <Route path="/career/rewards" element={<CareerRewards />} />
                  <Route path="/career/next-day" element={<CareerNextDay />} />
                  <Route path="/dashboard-rm" element={<DashboardRM />} />
                  <Route path="/rm-dashboard" element={<RMDashboard />} />
                  <Route path="/progression" element={<ProgressionDashboard />} />
                  <Route path="/chain" element={<ChainDashboard />} />
                  <Route path="/chain/staff" element={<ChainStaffDashboard />} />
                  <Route path="/staff" element={<StaffDashboard />} />
                  <Route path="/staff/report" element={<StaffReport />} />
                  <Route path="/staff/forecast" element={<StaffForecast />} />
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
                  <Route path="/analytics" element={<AnalyticsDashboard />} />
                  <Route path="/analytics/compare/:runIdA/:runIdB" element={<AnalyticsCompare />} />
                  <Route path="/analytics/:runId/report" element={<AnalyticsReport />} />
                  <Route path="/analytics/:runId" element={<AnalyticsRun />} />
                  {/* The app's true landing page is the Menu Principal (/menu)
                      -- "/" only ever redirects there. The in-game "Mon
                      Hôtel" home (formerly at "/") now lives at
                      /dashboard, and the top-bar's own "Dashboard" entry
                      points there (see TopBar.jsx). */}
                  <Route path="/" element={<Navigate to="/menu" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/reservations" element={<Reservations />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/finance" element={<FinanceDashboard />} />
                  <Route path="/finance/report" element={<FinanceReport />} />
                  <Route path="/finance/forecast" element={<FinanceForecast />} />
                  <Route path="/housekeeping" element={<Housekeeping />} />
                  <Route path="/pms" element={<PMS />} />
                  <Route path="/marketing" element={<MarketingDashboard />} />
                  <Route path="/marketing/campaigns" element={<MarketingCampaigns />} />
                  <Route path="/marketing/channels" element={<MarketingChannels />} />
                  <Route path="/marketing/forecast" element={<MarketingForecast />} />
                  <Route path="/marketing/report" element={<MarketingReport />} />
                  <Route path="/esg" element={<EsgDashboard />} />
                  <Route path="/esg/certifications" element={<EsgCertifications />} />
                  <Route path="/esg/forecast" element={<EsgForecast />} />
                  <Route path="/esg/report" element={<EsgReport />} />
                  <Route path="/expansion" element={<Expansion />} />
                  <Route path="/restaurant/*" element={<RestaurantSimulator />} />
                </Routes>
              </Layout>
            </CareerProvider>
          </CompetitionProvider>
        </AcademyProvider>
      </ChainProvider>
    </BrowserRouter>
  );
}

export default App;
