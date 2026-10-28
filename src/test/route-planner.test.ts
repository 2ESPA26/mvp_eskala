import { describe, expect, it } from "vitest";
import { optimizeRoute, routeCandidates, shortestPath, type RouteTask } from "@/lib/eskala/route-planner";
import { LINES, lineOf, seed } from "@/lib/eskala/data";

const task = (id: string, station: RouteTask["station"], priority: number, durationMin: number): RouteTask => ({
  id,
  equipmentId: id,
  station,
  variable: "Vibração do motor",
  severity: "alto",
  criticality: "A",
  priority,
  durationMin,
});

describe("planejamento do turno", () => {
  it("oferece poucas opções de alerta, espalhadas pelas estações simuladas", () => {
    const { alerts, equipment } = seed();
    const options = routeCandidates(alerts, equipment);
    expect(options).toHaveLength(6);
    expect(new Set(options.map((option) => option.station)).size).toBe(6);
    expect(new Set(options.map((option) => lineOf(option.station)))).toEqual(new Set(LINES));
    expect(new Set(options.map((option) => option.equipmentId)).size).toBe(6);
  });

  it("usa o caminho mais curto da rede simulada", () => {
    expect(shortestPath("Luz", "Itapevi")).toEqual({ minutes: 62, path: ["Luz", "Paulista", "Pinheiros", "Osasco", "Itapevi"] });
  });

  it("prioriza o alerta urgente e respeita o fim do turno", () => {
    const result = optimizeRoute([
      task("urgente", "Pinheiros", 6, 60),
      task("proximo", "Luz", 2, 30),
    ], "Luz", 8 * 60, 9 * 60 + 30);
    expect(result.stops.map((stop) => stop.id)).toEqual(["urgente"]);
    expect(result.stops[0]?.arrivalMin).toBe(8 * 60 + 23);
    expect(result.endMin).toBe(9 * 60 + 23);
    expect(result.remaining.map((item) => item.id)).toEqual(["proximo"]);
  });

  it("entre prioridades iguais escolhe menos deslocamento", () => {
    const result = optimizeRoute([
      task("luz", "Luz", 2, 30),
      task("pinheiros", "Pinheiros", 2, 30),
    ], "Luz", 8 * 60, 11 * 60);
    expect(result.stops.map((stop) => stop.id)).toEqual(["luz", "pinheiros"]);
    expect(result.travelMin).toBe(23);
    expect(result.path).toEqual(["Luz", "Paulista", "Pinheiros"]);
  });

  it("não agenda tarefas fora do período disponível", () => {
    const result = optimizeRoute([task("longo", "Itapevi", 6, 90)], "Luz", 8 * 60, 9 * 60);
    expect(result.stops).toHaveLength(0);
    expect(result.remaining).toHaveLength(1);
    expect(result.endMin).toBe(8 * 60);
  });
});
