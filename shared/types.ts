// Shared types between backend and frontend
// These match the ingest batch payload sent by plugins

export interface IngestEvent {
  type: string;
  source?: string;
  message: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface IngestBatchPayload {
  shopDomain: string;
  pluginVersion?: string;
  platform: string;
  phpVersion?: string;
  events: IngestEvent[];
}

export type Platform = "woocommerce" | "magento" | "sylius" | "prestashop";

export type Severity = "info" | "warning" | "error" | "critical";

export type EventType =
  | "payment_initiated"
  | "payment_completed"
  | "payment_failed"
  | "refund_initiated"
  | "refund_completed"
  | "error"
  | "warning"
  | "info"
  | "heartbeat"
  | "domain_changed";
