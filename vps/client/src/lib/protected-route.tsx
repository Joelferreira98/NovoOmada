import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { Site } from "@shared/schema";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // Get user sites for role-based routing
  const { data: userSites, isLoading: sitesLoading, error: sitesError } = useQuery<Site[]>({
    queryKey: ["/api/users", user?.id, "sites"],
    enabled: !!user?.id && user?.role === "admin",
    retry: 2,
    retryDelay: 1000,
  });

  if (isLoading || (user?.role === "admin" && sitesLoading)) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Role-based redirects
  if (user.role === "master" && !path.startsWith("/master") && path !== "/") {
    return (
      <Route path={path}>
        <Redirect to="/master" />
      </Route>
    );
  }

  if (user.role === "admin") {
    const selectedSiteId = localStorage.getItem("selectedSiteId");
    
    // If admin is trying to access admin dashboard
    if (path === "/admin") {
      if (!userSites || userSites.length === 0) {
        // No sites assigned - redirect to auth with error
        return (
          <Route path={path}>
            <Redirect to="/auth" />
          </Route>
        );
      } else if (userSites.length > 1 && !selectedSiteId) {
        // Multiple sites but none selected - redirect to site selection
        return (
          <Route path={path}>
            <Redirect to="/site-selection" />
          </Route>
        );
      } else if (userSites.length === 1 && !selectedSiteId) {
        // Only one site - auto-select it and continue
        localStorage.setItem("selectedSiteId", userSites[0].id);
      }
    }
    
    // If admin is trying to access non-admin routes, redirect to admin
    if (!path.startsWith("/admin") && path !== "/site-selection" && path !== "/reports" && path !== "/") {
      return (
        <Route path={path}>
          <Redirect to="/admin" />
        </Route>
      );
    }
  }

  if (user.role === "vendedor" && !path.startsWith("/vendedor") && path !== "/reports" && path !== "/") {
    return (
      <Route path={path}>
        <Redirect to="/vendedor" />
      </Route>
    );
  }

  // Root path redirection based on role
  if (path === "/") {
    if (user.role === "master") {
      return (
        <Route path={path}>
          <Redirect to="/master" />
        </Route>
      );
    } else if (user.role === "admin") {
      return (
        <Route path={path}>
          <Redirect to="/admin" />
        </Route>
      );
    } else if (user.role === "vendedor") {
      return (
        <Route path={path}>
          <Redirect to="/vendedor" />
        </Route>
      );
    }
  }

  return <Component />
}
