// ESKALA — simulated data and business rules (MVP, no backend).

export type Condition = "normal" | "atencao" | "alta";
export type Criticality = "A" | "B"; // A = crítica, B = não crítica
export type Severity = "critico" | "alto" | "medio";
export type Component = "Motor" | "Redutor" | "Degraus" | "Corrimão" | "Freios";

export const STATIONS = ["Sé", "Luz", "Paraíso", "Consolação", "Barra Funda"] as const;
export const MANUFACTURERS = ["Atlas Schindler", "Otis", "ThyssenKrupp", "Kone"] as const;
export const COMPONENTS: Component[] = ["Motor", "Redutor", "Degraus", "Corrimão", "Freios"];
export const TOTAL_EQUIPMENT = 197;

export const LIMITS = {
  vibration: { attention: 4.5, high: 7.1 }, // mm/s
  temperature: { attention: 75, high: 85 }, // °C
  oil: { alert: 20 }, // % — abaixo de 20% gera alerta
};

export interface Reading {
  vibration: number;
  temperature: number;
  oil: number;
  current: number;
}

export interface Equipment {
  id: string;
  station: string;
  manufacturer: string;
  criticality: Criticality;
  rise: number; // desnível (m)
  online: boolean;
  base: Reading;
  reading: Reading;
  history: { vibration: number[]; temperature: number[] };
}

export interface Alert {
  id: string;
  equipmentId: string;
  variable: "Vibração do motor" | "Temperatura do redutor" | "Nível de óleo" | "Comunicação";
  component: Component;
  reading: string;
  limit: string;
  severity: Severity;
  createdAt: string;
  open: boolean;
}

export interface Intervention {
  id: string;
  equipmentId: string;
  alertId?: string;
  date: string;
  component: Component;
  rootCause: string;
  actions: string;
  parts: string;
  downtimeMin: number;
}

// Deterministic PRNG so server and client render the same seed data.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function conditionOf(r: Reading): Condition {
  if (r.vibration >= LIMITS.vibration.high || r.temperature >= LIMITS.temperature.high || r.oil < LIMITS.oil.alert)
    return "alta";
  if (r.vibration >= LIMITS.vibration.attention || r.temperature >= LIMITS.temperature.attention) return "atencao";
  return "normal";
}

const SEVERITY_WEIGHT: Record<Severity, number> = { critico: 3, alto: 2, medio: 1 };
const CRITICALITY_WEIGHT: Record<Criticality, number> = { A: 2, B: 1 };

/** Prioridade = peso da severidade × peso da criticidade do equipamento. */
export function priorityScore(severity: Severity, criticality: Criticality) {
  return SEVERITY_WEIGHT[severity] * CRITICALITY_WEIGHT[criticality];
}

/** Gera os alertas implicados por uma leitura. */
export function alertsForReading(r: Reading, online: boolean): Omit<Alert, "id" | "equipmentId" | "createdAt" | "open">[] {
  const out: Omit<Alert, "id" | "equipmentId" | "createdAt" | "open">[] = [];
  if (!online)
    out.push({ variable: "Comunicação", component: "Motor", reading: "Sem sinal", limit: "Online", severity: "medio" });
  if (r.vibration >= LIMITS.vibration.attention)
    out.push({
      variable: "Vibração do motor",
      component: "Motor",
      reading: `${r.vibration.toFixed(1)} mm/s`,
      limit: `${(r.vibration >= LIMITS.vibration.high ? LIMITS.vibration.high : LIMITS.vibration.attention).toFixed(1)} mm/s`,
      severity: r.vibration >= LIMITS.vibration.high ? "critico" : "medio",
    });
  if (r.temperature >= LIMITS.temperature.attention)
    out.push({
      variable: "Temperatura do redutor",
      component: "Redutor",
      reading: `${r.temperature.toFixed(0)} °C`,
      limit: `${r.temperature >= LIMITS.temperature.high ? LIMITS.temperature.high : LIMITS.temperature.attention} °C`,
      severity: r.temperature >= LIMITS.temperature.high ? "alto" : "medio",
    });
  if (r.oil < LIMITS.oil.alert)
    out.push({ variable: "Nível de óleo", component: "Redutor", reading: `${r.oil.toFixed(0)} %`, limit: "20 %", severity: "alto" });
  return out;
}

export function seed() {
  const rnd = mulberry32(42);
  const equipment: Equipment[] = [];
  const alerts: Alert[] = [];
  const interventions: Intervention[] = [];
  const now = Date.UTC(2026, 9, 21, 12, 0);
  let alertN = 1001;

  for (let i = 0; i < TOTAL_EQUIPMENT; i++) {
    const station = STATIONS[i % STATIONS.length];
    const roll = rnd();
    const base: Reading = {
      vibration: roll > 0.93 ? 7.2 + rnd() * 2 : roll > 0.82 ? 4.6 + rnd() * 2 : 1.5 + rnd() * 2.5,
      temperature: roll > 0.97 ? 86 + rnd() * 6 : roll > 0.88 ? 76 + rnd() * 7 : 52 + rnd() * 18,
      oil: roll > 0.95 ? 10 + rnd() * 9 : 35 + rnd() * 60,
      current: 18 + rnd() * 14,
    };
    const online = rnd() > 0.04;
    const e: Equipment = {
      id: `ESC-${String(i + 1).padStart(3, "0")}`,
      station,
      manufacturer: MANUFACTURERS[Math.floor(rnd() * MANUFACTURERS.length)],
      criticality: rnd() > 0.6 ? "A" : "B",
      rise: Math.round((4 + rnd() * 14) * 10) / 10,
      online,
      base,
      reading: { ...base },
      history: {
        vibration: Array.from({ length: 20 }, () => +(base.vibration + (rnd() - 0.5) * 0.6).toFixed(2)),
        temperature: Array.from({ length: 20 }, () => +(base.temperature + (rnd() - 0.5) * 2).toFixed(1)),
      },
    };
    equipment.push(e);

    for (const a of alertsForReading(base, online)) {
      alerts.push({
        ...a,
        id: `ALT-${alertN++}`,
        equipmentId: e.id,
        createdAt: new Date(now - Math.floor(rnd() * 48 * 3600e3)).toISOString(),
        open: true,
      });
    }

    const nHist = Math.floor(rnd() * 3);
    for (let h = 0; h < nHist; h++) {
      const comp = COMPONENTS[Math.floor(rnd() * COMPONENTS.length)];
      interventions.push({
        id: `INT-${e.id}-${h}`,
        equipmentId: e.id,
        date: new Date(now - (30 + Math.floor(rnd() * 300)) * 86400e3).toISOString(),
        component: comp,
        rootCause: ROOT_CAUSES[comp],
        actions: "Inspeção, ajuste e teste funcional",
        parts: rnd() > 0.5 ? PARTS[comp] : "—",
        downtimeMin: 30 + Math.floor(rnd() * 240),
      });
    }
  }
  return { equipment, alerts, interventions };
}

const ROOT_CAUSES: Record<Component, string> = {
  Motor: "Desalinhamento do eixo",
  Redutor: "Desgaste de engrenagens",
  Degraus: "Rolete danificado",
  Corrimão: "Tensão inadequada",
  Freios: "Lona desgastada",
};
const PARTS: Record<Component, string> = {
  Motor: "Rolamento 6308",
  Redutor: "Retentor de óleo",
  Degraus: "Rolete de degrau",
  Corrimão: "Polia de tração",
  Freios: "Lona de freio",
};

export const SEVERITY_LABEL: Record<Severity, string> = { critico: "Crítico", alto: "Alto", medio: "Médio" };
export const CONDITION_LABEL: Record<Condition, string> = { normal: "Normal", atencao: "Atenção", alta: "Prioridade alta" };
export const CRITICALITY_LABEL: Record<Criticality, string> = { A: "A · Crítica", B: "B · Não crítica" };
