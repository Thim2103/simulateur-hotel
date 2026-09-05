import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 bg-slate-50 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {children}
      </main>
    </div>
  );
}
