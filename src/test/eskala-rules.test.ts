import { describe, expect, it } from "vitest";
import { alertsForReading, conditionOf, priorityScore, seed } from "@/lib/eskala/data";

const ok = { vibration: 2, temperature: 60, oil: 50, current: 20 };

describe("ESKALA rules", () => {
  it("oil below 20% raises an alert and high priority", () => {
    expect(alertsForReading({ ...ok, oil: 19 }, true).some((a) => a.variable === "Nível de óleo")).toBe(true);
    expect(alertsForReading({ ...ok, oil: 20 }, true).some((a) => a.variable === "Nível de óleo")).toBe(false);
    expect(conditionOf({ ...ok, oil: 19 })).toBe("alta");
  });
  it("critical equipment raises priority", () => {
    expect(priorityScore("alto", "A")).toBeGreaterThan(priorityScore("alto", "B"));
  });
  it("seeds 197 escalators across 5 stations", () => {
    const { equipment } = seed();
    expect(equipment).toHaveLength(197);
    expect(new Set(equipment.map((e) => e.station)).size).toBe(5);
  });
});
