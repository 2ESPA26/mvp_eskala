import { describe, expect, it } from "vitest";
import { seed, type Intervention } from "@/lib/eskala/data";
import { EMPTY_HISTORY_FILTERS, filterInterventions } from "@/lib/eskala/history";

const rows: Intervention[] = [
  { id: "old", equipmentId: "ESC-001", date: "2020-01-10T12:00:00Z", component: "Motor", actions: "Alinhamento do eixo", technician: "Ana Souza", maintenanceType: "Corretiva", rootCause: "Desalinhamento", parts: "—", downtimeMin: 60 },
  { id: "new", equipmentId: "ESC-001", date: "2026-10-20T12:00:00Z", component: "Redutor", actions: "Troca de óleo", technician: "Carlos Lima", maintenanceType: "Preventiva", rootCause: "Inspeção", parts: "Óleo", downtimeMin: 30 },
  { id: "other", equipmentId: "ESC-002", date: "2026-10-21T12:00:00Z", component: "Freios", actions: "Ajuste dos freios", technician: "Ana Souza", maintenanceType: "Corretiva", rootCause: "Desgaste", parts: "—", downtimeMin: 90 },
];
const filter = (changes: Partial<typeof EMPTY_HISTORY_FILTERS>) => filterInterventions(rows, { ...EMPTY_HISTORY_FILTERS, ...changes }).map((i) => i.id);

describe("Intervention history", () => {
  it("shows all dates by default, newest first", () => expect(filter({})).toEqual(["other", "new", "old"]));
  it("shows only the selected equipment and its complete history", () => expect(filter({ equipmentId: "ESC-001" })).toEqual(["new", "old"]));
  it("filters inclusive date boundaries", () => expect(filter({ start: "2026-10-20", end: "2026-10-20" })).toEqual(["new"]));
  it("filters components", () => expect(filter({ component: "Motor" })).toEqual(["old"]));
  it("filters technicians", () => expect(filter({ technician: "Ana Souza" })).toEqual(["other", "old"]));
  it("filters maintenance types", () => expect(filter({ maintenanceType: "Preventiva" })).toEqual(["new"]));
  it.each([["ESC-002", ["other"]], ["carlos", ["new"]], ["redutor", ["new"]], ["troca de oleo", ["new"]]])("searches equipment, technicians, components and services: %s", (query, expected) => expect(filter({ query })).toEqual(expected));
  it("combines filters and returns no results for mismatches", () => expect(filter({ component: "Motor", technician: "Carlos Lima" })).toEqual([]));
  it("uses consistent deterministic simulated records", () => { const first = seed().interventions; expect(first).toEqual(seed().interventions); expect(first.every((i) => i.technician && i.maintenanceType)).toBe(true); });
});