import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";

export interface AppSettings {
  id: string;
  appName: string;
  logoUrl?: string;
  faviconUrl?: string;
  themeColor: string;
  primaryColor: string;
  hasCustomIcons: boolean;
  manifestData?: any;
  createdAt: string;
  updatedAt?: string;
}

export function useAppSettings() {
  return useQuery<AppSettings | null>({
    queryKey: ["/api/app-settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}