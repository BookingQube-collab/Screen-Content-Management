import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

// Pages
import DisplayPage from "@/pages/display";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminActivities from "@/pages/admin/activities";
import AdminActivityForm from "@/pages/admin/activities/form";
import AdminSettings from "@/pages/admin/settings";
import NotFound from "@/pages/not-found";

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
      {/* Root redirects to display intuitively */}
      <Route path="/" component={DisplayPage} />
      
      {/* Public Kiosk Display */}
      <Route path="/display" component={DisplayPage} />
      
      {/* Admin Panel */}
      <Route path="/admin/login" component={AdminLogin} />
      
      {/* Note: In a real app we'd wrap these in a <ProtectedRoute> component,
          but we are using a custom hook useRequireAuth inside the layouts/pages to redirect */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      
      <Route path="/admin/activities" component={AdminActivities} />
      <Route path="/admin/activities/new" component={AdminActivityForm} />
      <Route path="/admin/activities/:id/edit" component={AdminActivityForm} />
      
      <Route path="/admin/settings" component={AdminSettings} />
      
      {/* 404 Fallback */}
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
