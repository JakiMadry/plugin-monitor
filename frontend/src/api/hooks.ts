import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  User,
  Shop,
  HazardDomain,
  HazardAlert,
  HazardStatus,
  HazardSyncEntry,
  PluginEvent,
  PaywallEvent,
  Paginated,
  ErrorStats,
  PaywallStats,
  NotificationPref,
} from "../types";

// ─── Auth ───────────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ user: User }>("/api/auth/me"),
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<{ user: User }>("/api/auth/login", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => qc.clear(),
  });
}

// ─── Shops ──────────────────────────────────────────────

export function useShops() {
  return useQuery({
    queryKey: ["shops"],
    queryFn: () => api.get<Shop[]>("/api/dashboard/shops"),
  });
}

export function useShop(id: string) {
  return useQuery({
    queryKey: ["shops", id],
    queryFn: () => api.get<Shop>(`/api/dashboard/shops/${id}`),
    enabled: !!id,
  });
}

export function useCreateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; domain: string; platform: string }) =>
      api.post<Shop>("/api/dashboard/shops", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops"] }),
  });
}

export function useUpdateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; domain?: string; isActive?: boolean }) =>
      api.put<Shop>(`/api/dashboard/shops/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops"] }),
  });
}

export function useRegenerateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ apiKey: string }>(`/api/dashboard/shops/${id}/regenerate-key`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops"] }),
  });
}

// ─── Hazard ─────────────────────────────────────────────

export function useHazardStatus() {
  return useQuery({
    queryKey: ["hazard", "status"],
    queryFn: () => api.get<HazardStatus>("/api/dashboard/hazard/status"),
    refetchInterval: 60_000,
  });
}

export function useHazardDomains(page: number, search?: string) {
  return useQuery({
    queryKey: ["hazard", "domains", page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      return api.get<Paginated<HazardDomain>>(`/api/dashboard/hazard/domains?${params}`);
    },
  });
}

export function useHazardAlerts(shopId?: string) {
  return useQuery({
    queryKey: ["hazard", "alerts", shopId],
    queryFn: () => {
      const params = shopId ? `?shopId=${shopId}` : "";
      return api.get<HazardAlert[]>(`/api/dashboard/hazard/alerts${params}`);
    },
    refetchInterval: 60_000,
  });
}

export function useHazardSyncLog() {
  return useQuery({
    queryKey: ["hazard", "sync-log"],
    queryFn: () => api.get<HazardSyncEntry[]>("/api/dashboard/hazard/sync-log"),
  });
}

export function useHazardCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/dashboard/hazard/check"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hazard"] });
    },
  });
}

// ─── Plugin Errors ──────────────────────────────────────

export function usePluginEvents(params: {
  page: number;
  shopId?: string;
  severity?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ["errors", "events", params],
    queryFn: () => {
      const sp = new URLSearchParams({ page: String(params.page), limit: "50" });
      if (params.shopId) sp.set("shopId", params.shopId);
      if (params.severity) sp.set("severity", params.severity);
      if (params.from) sp.set("from", params.from);
      if (params.to) sp.set("to", params.to);
      return api.get<Paginated<PluginEvent>>(`/api/dashboard/errors/events?${sp}`);
    },
  });
}

export function useErrorStats(shopId?: string) {
  return useQuery({
    queryKey: ["errors", "stats", shopId],
    queryFn: () => {
      const params = shopId ? `?shopId=${shopId}` : "";
      return api.get<ErrorStats[]>(`/api/dashboard/errors/stats${params}`);
    },
    refetchInterval: 30_000,
  });
}

export function useMarkEventRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/dashboard/errors/events/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["errors"] }),
  });
}

// ─── Paywall ────────────────────────────────────────────

export function usePaywallEvents(params: {
  page: number;
  shopId?: string;
  eventType?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ["paywall", "events", params],
    queryFn: () => {
      const sp = new URLSearchParams({ page: String(params.page), limit: "50" });
      if (params.shopId) sp.set("shopId", params.shopId);
      if (params.eventType) sp.set("eventType", params.eventType);
      if (params.from) sp.set("from", params.from);
      if (params.to) sp.set("to", params.to);
      return api.get<Paginated<PaywallEvent>>(`/api/dashboard/paywall/events?${sp}`);
    },
  });
}

export function usePaywallStats(shopId?: string) {
  return useQuery({
    queryKey: ["paywall", "stats", shopId],
    queryFn: () => {
      const params = shopId ? `?shopId=${shopId}` : "";
      return api.get<PaywallStats[]>(`/api/dashboard/paywall/stats${params}`);
    },
    refetchInterval: 30_000,
  });
}

// ─── Users ─────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/api/dashboard/users"),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; displayName?: string; role?: string }) =>
      api.post<User>("/api/dashboard/users", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; displayName?: string; role?: string; password?: string }) =>
      api.put<User>(`/api/dashboard/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/dashboard/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ─── Notification Preferences ──────────────────────────

export function useNotificationPrefs() {
  return useQuery({
    queryKey: ["notification-prefs"],
    queryFn: () => api.get<NotificationPref[]>("/api/dashboard/notifications/prefs"),
  });
}

export function useSetNotificationPref() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { section: string; shopId?: string; notifyEmail: boolean }) =>
      api.post<NotificationPref>("/api/dashboard/notifications/prefs", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });
}

export function useDeleteNotificationPref() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/dashboard/notifications/prefs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });
}
