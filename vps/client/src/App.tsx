import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import ReportsPage from "@/pages/reports-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import MasterDashboard from "@/pages/master-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import SiteSelectionPage from "@/pages/site-selection-page";
import VendedorDashboard from "@/pages/vendedor-dashboard";
import CashPage from "@/pages/cash-page";
import ProfilePage from "@/pages/profile-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={MasterDashboard} />
      <ProtectedRoute path="/master" component={MasterDashboard} />
      <ProtectedRoute path="/admin" component={AdminDashboard} />
      <ProtectedRoute path="/site-selection" component={SiteSelectionPage} />
      <ProtectedRoute path="/vendedor" component={VendedorDashboard} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/cash" component={CashPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
