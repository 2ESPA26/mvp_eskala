import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { seed, type Alert, type Equipment, type Intervention } from "./data";

interface Store {
  equipment: Equipment[];
  alerts: Alert[];
  interventions: Intervention[];
  registerIntervention: (i: Omit<Intervention, "id" | "date" | "equipmentId"> & { alertId: string }) => string | null;
}

const Ctx = createContext<Store | null>(null);

function jitter(v: number, amp: number) {
  return v + (Math.random() - 0.5) * amp;
}

export function EskalaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(seed);

  // Simulated telemetry every 5s — only for equipment with communication.
  useEffect(() => {
    const t = setInterval(() => {
      setState((s) => ({
        ...s,
        equipment: s.equipment.map((e) => {
          if (!e.online) return e;
          const reading = {
            vibration: Math.max(0.5, jitter(e.base.vibration, 0.5)),
            temperature: jitter(e.base.temperature, 1.6),
            oil: Math.min(100, Math.max(0, jitter(e.base.oil, 0.4))),
            current: jitter(e.base.current, 1.2),
          };
          return {
            ...e,
            reading,
            history: {
              vibration: [...e.history.vibration.slice(1), +reading.vibration.toFixed(2)],
              temperature: [...e.history.temperature.slice(1), +reading.temperature.toFixed(1)],
            },
          };
        }),
      }));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const registerIntervention = useCallback<Store["registerIntervention"]>((input) => {
    let error: string | null = null;
    setState((s) => {
      const alert = s.alerts.find((a) => a.id === input.alertId);
      if (!alert || !alert.open) {
        error = "Alerta inválido ou já encerrado.";
        return s;
      }
      return {
        ...s,
        // Only the linked alert closes; other open alerts and readings stay as-is.
        alerts: s.alerts.map((a) => (a.id === alert.id ? { ...a, open: false } : a)),
        interventions: [
          { ...input, id: `INT-${Date.now()}`, equipmentId: alert.equipmentId, date: new Date().toISOString() },
          ...s.interventions,
        ],
      };
    });
    return error;
  }, []);

  const value = useMemo(() => ({ ...state, registerIntervention }), [state, registerIntervention]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEskala() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useEskala must be used inside EskalaProvider");
  return c;
}
