import Sidebar from "./sidebar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div
      className="
      flex
      min-h-screen
      bg-slate-100
      "
    >

      <Sidebar />

      <main
        className="
        flex-1
        p-6
        "
      >
        {children}
      </main>

    </div>
  );
}