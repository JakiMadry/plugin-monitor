import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "../../config.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtp.host || !config.smtp.user) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  return transporter;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn("[email] SMTP not configured, skipping email send");
    return false;
  }

  try {
    await transport.sendMail({
      from: config.smtp.user,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    return true;
  } catch (error) {
    console.error("[email] Failed to send:", error);
    return false;
  }
}

// ─── Email Templates ──────────────────────────────────

export function hazardAlertEmail(shopName: string, domain: string, matchedDomain: string): EmailPayload {
  return {
    to: "", // filled by notification router
    subject: `[Plugin Monitor] Alert hazardowy — ${shopName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c0392b;">Alert hazardowy</h2>
        <p>Domena sklepu <strong>${shopName}</strong> (<code>${domain}</code>) zostala znaleziona w rejestrze domen hazardowych Ministerstwa Finansow.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Sklep</td><td style="padding: 8px; border: 1px solid #ddd;">${shopName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Domena sklepu</td><td style="padding: 8px; border: 1px solid #ddd;">${domain}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Dopasowana domena MF</td><td style="padding: 8px; border: 1px solid #ddd;">${matchedDomain}</td></tr>
        </table>
        <p style="color: #666; font-size: 12px;">Plugin Monitor — automatyczne powiadomienie</p>
      </div>
    `,
  };
}

export function errorAlertEmail(shopName: string, severity: string, message: string, source: string | null): EmailPayload {
  const severityColor = severity === "critical" ? "#c0392b" : severity === "error" ? "#e74c3c" : "#f39c12";
  return {
    to: "",
    subject: `[Plugin Monitor] ${severity.toUpperCase()} — ${shopName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${severityColor};">${severity.toUpperCase()}: ${shopName}</h2>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Sklep</td><td style="padding: 8px; border: 1px solid #ddd;">${shopName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Severity</td><td style="padding: 8px; border: 1px solid #ddd;"><span style="color: ${severityColor}; font-weight: bold;">${severity}</span></td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Zrodlo</td><td style="padding: 8px; border: 1px solid #ddd;">${source || "—"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Wiadomosc</td><td style="padding: 8px; border: 1px solid #ddd;">${message}</td></tr>
        </table>
        <p style="color: #666; font-size: 12px;">Plugin Monitor — automatyczne powiadomienie</p>
      </div>
    `,
  };
}

export function paywallAlertEmail(shopName: string, eventType: string, summary: string): EmailPayload {
  return {
    to: "",
    subject: `[Plugin Monitor] Paywall ${eventType} — ${shopName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2980b9;">Paywall: ${eventType}</h2>
        <p><strong>Sklep:</strong> ${shopName}</p>
        <p>${summary}</p>
        <p style="color: #666; font-size: 12px;">Plugin Monitor — automatyczne powiadomienie</p>
      </div>
    `,
  };
}
