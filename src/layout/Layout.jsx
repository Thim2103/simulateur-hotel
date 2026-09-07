import Sidebar from "./Sidebar";
import ErrorBoundary from "../components/ErrorBoundary";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 bg-slate-50 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
