import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

// Pages
import DisplayPage        from "@/pages/display";
import DisplayConfigPage  from "@/pages/display-config";
import AdminLogin         from "@/pages/admin/login";
import AdminDashboard     from "@/pages/admin/dashboard";
import AdminActivities    from "@/pages/admin/activities";
import AdminActivityForm  from "@/pages/admin/activities/form";
import AdminSettings      from "@/pages/admin/settings";
import AdminLocations     from "@/pages/admin/locations";
import AdminScreens       from "@/pages/admin/screens";
import NotFound           from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/"               component={DisplayPage} />
      <Route path="/display"        component={DisplayPage} />
      <Route path="/display/config" component={DisplayConfigPage} />

      <Route path="/admin/login"    component={AdminLogin} />
      <Route path="/admin"          component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />

      <Route path="/admin/activities"        component={AdminActivities} />
      <Route path="/admin/activities/new"    component={AdminActivityForm} />
      <Route path="/admin/activities/:id/edit" component={AdminActivityForm} />

      <Route path="/admin/locations" component={AdminLocations} />
      <Route path="/admin/screens"   component={AdminScreens} />

      <Route path="/admin/settings" component={AdminSettings} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
