import { XMLParser } from "fast-xml-parser";

export interface HazardEntry {
  lp: number;
  domain: string;
  dateAdded: string;
  dateRemoved?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (_name, jpath) => jpath === "Rejestr.PozycjaRejestru",
  parseAttributeValue: true,
});

export function parseHazardXml(xml: string): HazardEntry[] {
  const parsed = parser.parse(xml);
  const entries = parsed?.Rejestr?.PozycjaRejestru;

  if (!entries || !Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry: any) => ({
    lp: entry["@_Lp"],
    domain: entry.AdresDomeny?.toLowerCase?.() || entry.AdresDomeny,
    dateAdded: entry.DataWpisu,
    dateRemoved: entry.DataWykreslenia || undefined,
  }));
}
