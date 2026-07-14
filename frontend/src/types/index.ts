export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: "admin" | "manager" | "viewer";
  createdAt?: string;
}

export interface Shop {
  id: string;
  name: string;
  domain: string;
  platform: "woocommerce" | "magento" | "sylius" | "prestashop";
  apiKey?: string;
  isActive: boolean;
  lastSeenAt: string | null;
  lastDomainReported: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface HazardDomain {
  id: number;
  lp: number;
  domain: string;
  dateAdded: string;
  dateRemoved: string | null;
  isActive: boolean;
  firstSeenAt: string;
}

export interface HazardAlert {
  id: string;
  shopId: string;
  shopName: string;
  shopDomain: string;
  matchedDomain: string;
  status: "active" | "acknowledged" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
}

export interface HazardSyncEntry {
  id: number;
  syncType: "pull" | "push";
  startedAt: string;
  finishedAt: string | null;
  domainsTotal: number | null;
  domainsAdded: number;
  domainsRemoved: number;
  status: string;
  errorMessage: string | null;
}

export interface HazardStatus {
  totalDomains: number;
  activeDomains: number;
  activeAlerts: number;
  lastSync: HazardSyncEntry | null;
}

export interface PluginEvent {
  id: string;
  shopId: string;
  shopName: string;
  severity: "info" | "warning" | "error" | "critical";
  source: string | null;
  message: string;
  stackTrace: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  receivedAt: string;
  isRead: boolean;
}

export interface PaywallEvent {
  id: string;
  shopId: string;
  shopName: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  receivedAt: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorStats {
  severity: string;
  count: number;
  unread: number;
}

export interface PaywallStats {
  eventType: string;
  count: number;
  lastOccurred: string;
}

export interface NotificationPref {
  id: string;
  userId: string;
  section: "hazard" | "paywall" | "errors" | "all";
  shopId: string | null;
  notifyEmail: boolean;
}
