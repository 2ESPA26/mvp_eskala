import { LINES, STATIONS, lineOf, type Alert, type Equipment, type Station } from "./data";
export type { Station } from "./data";

// Rede e tempos fictícios para a demonstração. Não representam trajetos reais.
export const CONNECTIONS: { from: Station; to: Station; minutes: number }[] = [
  { from: "Luz", to: "Paulista", minutes: 11 },
  { from: "Paulista", to: "Pinheiros", minutes: 12 },
  { from: "Chácara Klabin", to: "Santa Cruz", minutes: 8 },
  { from: "Santa Cruz", to: "Santo Amaro", minutes: 18 },
  { from: "Palmeiras - Barra Funda", to: "Osasco", minutes: 16 },
  { from: "Osasco", to: "Itapevi", minutes: 22 },
  { from: "Vila Olímpia", to: "Berrini - Casas Bahia", minutes: 7 },
  { from: "Berrini - Casas Bahia", to: "Morumbi - Claro", minutes: 6 },
  { from: "Pinheiros", to: "Vila Olímpia", minutes: 10 },
  { from: "Morumbi - Claro", to: "Santo Amaro", minutes: 12 },
  { from: "Osasco", to: "Pinheiros", minutes: 17 },
];

export interface RouteTask {
  id: string;
  equipmentId: string;
  station: Station;
  variable: Alert["variable"];
  severity: Alert["severity"];
  criticality: Equipment["criticality"];
  priority: number;
  durationMin: number;
}

export interface RouteStop extends RouteTask {
  order: number;
  arrivalMin: number;
  finishMin: number;
  travelMin: number;
  via: Station[];
}

export interface RoutePlan {
  stops: RouteStop[];
  remaining: RouteTask[];
  travelMin: number;
  serviceMin: number;
  endMin: number;
  station: Station;
  path: Station[];
}

export function clockMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : NaN;
}

export function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function shortestPath(from: Station, to: Station): { minutes: number; path: Station[] } {
  if (from === to) return { minutes: 0, path: [from] };
  const distance = new Map<Station, number>(STATIONS.map((s) => [s, Infinity]));
  const previous = new Map<Station, Station>();
  const unused = new Set<Station>(STATIONS);
  distance.set(from, 0);

  while (unused.size) {
    const current = [...unused].reduce((best, station) =>
      distance.get(station)! < distance.get(best)! ? station : best,
    );
    if (current === to || distance.get(current) === Infinity) break;
    unused.delete(current);
    for (const edge of CONNECTIONS) {
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (!next || !unused.has(next)) continue;
      const candidate = distance.get(current)! + edge.minutes;
      if (candidate < distance.get(next)!) {
        distance.set(next, candidate);
        previous.set(next, current);
      }
    }
  }

  const path: Station[] = [to];
  while (path[0] !== from) {
    const prior = previous.get(path[0]!);
    if (!prior) throw new Error(`Sem caminho entre ${from} e ${to}`);
    path.unshift(prior);
  }
  return { minutes: distance.get(to)!, path };
}

export function defaultDuration(variable: Alert["variable"]): number {
  switch (variable) {
    case "Vibração do motor": return 75;
    case "Temperatura do redutor": return 60;
    case "Nível de óleo": return 45;
    case "Comunicação": return 30;
  }
}

export function routeCandidates(alerts: Alert[], equipment: Equipment[], limit = 6): RouteTask[] {
  const byId = new Map(equipment.map((item) => [item.id, item]));
  const rank = { critico: 3, alto: 2, medio: 1 } as const;
  const all = alerts.filter((alert) => alert.open).flatMap((alert) => {
    const item = byId.get(alert.equipmentId);
    if (!item) return [];
    return [{
      id: alert.id,
      equipmentId: item.id,
      station: item.station,
      variable: alert.variable,
      severity: alert.severity,
      criticality: item.criticality,
      priority: rank[alert.severity] * (item.criticality === "A" ? 2 : 1),
      durationMin: defaultDuration(alert.variable),
    }];
  }).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  const seen = new Set<string>();
  const unique = all.filter((item) => {
    if (seen.has(item.equipmentId)) return false;
    seen.add(item.equipmentId);
    return true;
  });
  // Pelo menos uma opção de cada linha na demonstração; depois, estações distintas.
  const picked = LINES.flatMap((line) => unique.find((item) => lineOf(item.station) === line) ?? []);
  const stations = new Set(picked.map((item) => item.station));
  for (const item of unique) {
    if (picked.length >= limit) break;
    if (stations.has(item.station)) continue;
    picked.push(item);
    stations.add(item.station);
  }
  return picked.slice(0, limit).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

// Maximiza a quantidade atendida em cada faixa de prioridade (6 até 1).
// Dentro do mesmo resultado, escolhe menos deslocamento e término mais cedo.
export function optimizeRoute(tasks: RouteTask[], origin: Station, startMin: number, endMin: number): RoutePlan {
  if (tasks.length > 8) throw new Error("Máximo de oito atendimentos por simulação.");
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) {
    throw new Error("O fim do turno precisa ser depois do início.");
  }
  if (tasks.some((task) => !Number.isFinite(task.durationMin) || task.durationMin < 5)) {
    throw new Error("A duração de cada atendimento deve ser de pelo menos 5 minutos.");
  }

  let best: RouteStop[] = [];
  let bestTravel = 0;
  let bestEnd = startMin;
  let bestCounts = Array<number>(6).fill(0);

  const better = (counts: number[], travel: number, finish: number) => {
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] !== bestCounts[i]) return counts[i]! > bestCounts[i]!;
    }
    return travel < bestTravel || (travel === bestTravel && finish < bestEnd);
  };

  const visit = (used: Set<string>, at: Station, time: number, travel: number, stops: RouteStop[], counts: number[]) => {
    if (better(counts, travel, time)) {
      best = [...stops];
      bestTravel = travel;
      bestEnd = time;
      bestCounts = [...counts];
    }
    for (const task of tasks) {
      if (used.has(task.id) || (stops.length && task.priority > stops.at(-1)!.priority)) continue;
      const leg = shortestPath(at, task.station);
      const finish = time + leg.minutes + task.durationMin;
      if (finish > endMin) continue;
      used.add(task.id);
      counts[6 - task.priority]!++;
      stops.push({ ...task, order: stops.length + 1, arrivalMin: time + leg.minutes, finishMin: finish, travelMin: leg.minutes, via: leg.path });
      visit(used, task.station, finish, travel + leg.minutes, stops, counts);
      stops.pop();
      counts[6 - task.priority]!--;
      used.delete(task.id);
    }
  };
  visit(new Set(), origin, startMin, 0, [], Array<number>(6).fill(0));

  const selected = new Set(best.map((stop) => stop.id));
  return {
    stops: best,
    remaining: tasks.filter((task) => !selected.has(task.id)).sort((a, b) => b.priority - a.priority),
    travelMin: bestTravel,
    serviceMin: best.reduce((sum, stop) => sum + stop.durationMin, 0),
    endMin: bestEnd,
    station: best.at(-1)?.station ?? origin,
    path: best.flatMap((stop, index) => index === 0 ? stop.via : stop.via.slice(1)).length
      ? [origin, ...best.flatMap((stop) => stop.via.slice(1))]
      : [origin],
  };
}
