import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex text-foreground">
      <AdminSidebar />
      <main className="flex-1 overflow-auto relative">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-full h-96 bg-gradient-to-bl from-primary/5 via-transparent to-transparent pointer-events-none -z-10" />
        <div className="p-8 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
