import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, WifiOff, Zap } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEskala } from "@/lib/eskala/store";
import { CRITICALITY_LABEL, LIMITS, conditionOf } from "@/lib/eskala/data";
import { ConditionBadge, PageHeader, Panel, SimulatedTag } from "@/components/eskala/ui";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/telemetria")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] } : {}),
  head: () => ({
    meta: [
      { title: "Equipamentos e Telemetria — ESKALA" },
      { name: "description", content: "Leituras de vibração, temperatura, óleo e corrente por equipamento." },
      { property: "og:title", content: "Equipamentos e Telemetria — ESKALA" },
      { property: "og:description", content: "Telemetria e histórico de intervenções por escada rolante." },
    ],
  }),
  component: Telemetry,
});

function Telemetry() {
  const { equipment, interventions } = useEskala();
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/telemetria" });
  const [q, setQ] = useState("");
  const e = equipment.find((x) => x.id === id) ?? equipment[0]!;
  const cond = conditionOf(e.reading);
  const list = useMemo(() => equipment.filter((x) => x.id.toLowerCase().includes(q.toLowerCase()) || x.station.toLowerCase().includes(q.toLowerCase())), [equipment, q]);
  const history = interventions.filter((i) => i.equipmentId === e.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader title="Equipamentos e Telemetria" subtitle="Atualização a cada 5 segundos" right={<SimulatedTag />} />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Panel className="h-fit lg:sticky lg:top-6">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Buscar ID ou estação" className="h-9 pl-8" />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto p-1 lg:max-h-[70vh]">
            {list.map((x) => {
              const c = conditionOf(x.reading);
              return (
                <li key={x.id}>
                  <button
                    onClick={() => navigate({ search: { id: x.id } })}
                    className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", x.id === e.id && "bg-accent")}
                  >
                    <span className="font-mono text-xs">{x.id}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {x.station}
                      <span className={cn("size-2 rounded-full", !x.online ? "bg-muted-foreground" : c === "alta" ? "bg-status-high" : c === "atencao" ? "bg-status-warn" : "bg-status-ok")} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="min-w-0 space-y-6">
          <Panel>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
              <div>
                <div className="font-display text-2xl font-semibold">{e.id}</div>
                <div className="text-sm text-muted-foreground">{e.station} · {e.manufacturer}</div>
              </div>
              <Info label="Desnível" value={`${e.rise} m`} />
              <Info label="Criticidade" value={CRITICALITY_LABEL[e.criticality]} />
              <Info label="Condição" value={<ConditionBadge c={cond} />} />
              <Info
                label="Comunicação"
                value={e.online ? <span className="text-status-ok">● Online</span> : <span className="inline-flex items-center gap-1 text-status-high"><WifiOff className="size-4" /> Sem sinal</span>}
              />
            </div>
          </Panel>

          {!e.online && (
            <div className="flex items-center gap-2 rounded-xl border border-status-high/40 bg-status-high/10 px-4 py-3 text-sm text-status-high">
              <WifiOff className="size-4" /> Sem sinal — leituras congeladas no último valor recebido.
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <SensorChart title="Vibração do motor" unit="mm/s" data={e.history.vibration} value={e.reading.vibration} digits={1} limit={LIMITS.vibration.high} warn={LIMITS.vibration.attention} offline={!e.online} />
            <SensorChart title="Temperatura do redutor" unit="°C" data={e.history.temperature} value={e.reading.temperature} digits={0} limit={LIMITS.temperature.high} warn={LIMITS.temperature.attention} offline={!e.online} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Panel title="Nível de óleo">
              <div className="flex items-center gap-6 p-4">
                <div className="relative h-32 w-14 overflow-hidden rounded-lg border bg-muted">
                  <div className={cn("absolute inset-x-0 bottom-0 transition-all", e.reading.oil < 20 ? "bg-status-high" : "bg-primary")} style={{ height: `${e.reading.oil}%` }} />
                  <div className="absolute inset-x-0 border-t border-dashed border-status-high" style={{ bottom: "20%" }} />
                </div>
                <div>
                  <div className={cn("font-display text-4xl font-semibold tabular-nums", e.reading.oil < 20 && "text-status-high")}>{e.reading.oil.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">{e.reading.oil < 20 ? "Abaixo do mínimo de 20%" : "Mínimo: 20%"}</div>
                </div>
              </div>
            </Panel>
            <Panel title="Corrente elétrica">
              <div className="flex items-center gap-4 p-4">
                <Zap className="size-8 text-primary" />
                <div>
                  <div className="font-display text-4xl font-semibold tabular-nums">{e.reading.current.toFixed(1)} <span className="text-lg text-muted-foreground">A</span></div>
                  <div className="text-xs text-muted-foreground">Motor principal</div>
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="Histórico de intervenções">
            {history.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Sem intervenções registradas.</p>
            ) : (
              <ol className="divide-y">
                {history.map((h) => (
                  <li key={h.id} className="grid gap-1 px-4 py-3 text-sm md:grid-cols-[110px_110px_1fr_auto]">
                    <span className="text-muted-foreground">{new Date(h.date).toLocaleDateString("pt-BR")}</span>
                    <span className="font-medium">{h.component}</span>
                    <span>
                      {h.rootCause} — <span className="text-muted-foreground">{h.actions}{h.parts !== "—" && ` · Peças: ${h.parts}`}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{h.downtimeMin} min</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}

function SensorChart({ title, unit, data, value, digits, limit, warn, offline }: { title: string; unit: string; data: number[]; value: number; digits: number; limit: number; warn: number; offline: boolean }) {
  const color = value >= limit ? "text-status-high" : value >= warn ? "text-status-warn" : "text-foreground";
  const chart = data.map((v, i) => ({ t: i - data.length + 1, v }));
  return (
    <Panel title={title} right={<span className="text-xs text-muted-foreground">Limite {limit} {unit}</span>}>
      <div className="px-4 pt-3">
        <span className={cn("font-display text-3xl font-semibold tabular-nums", offline ? "text-muted-foreground" : color)}>{value.toFixed(digits)}</span>
        <span className="ml-1 text-sm text-muted-foreground">{unit}</span>
      </div>
      <div className={cn("h-52 px-2 pb-3", offline && "opacity-40")}>
        <ResponsiveContainer>
          <LineChart data={chart}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={36} domain={[(m: number) => Math.floor(Math.min(m, limit) * 0.9), (m: number) => Math.ceil(Math.max(m, limit) * 1.05)]} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} labelFormatter={() => ""} formatter={(v: number) => [`${v} ${unit}`, title]} />
            <ReferenceLine y={limit} stroke="var(--status-high)" strokeDasharray="4 4" />
            <Line dataKey="v" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
