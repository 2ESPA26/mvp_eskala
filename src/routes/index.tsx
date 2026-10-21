import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, BellRing, CheckCircle2, ChevronLeft, ChevronRight, Gauge, Layers, Search, ShieldAlert } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEskala } from "@/lib/eskala/store";
import { COMPONENTS, CONDITION_LABEL, MANUFACTURERS, STATIONS, conditionOf, type Condition } from "@/lib/eskala/data";
import { ConditionBadge, Kpi, NativeSelect, PageHeader, Panel, SimulatedTag } from "@/components/eskala/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ESKALA" },
      { name: "description", content: "Visão geral da frota de escadas rolantes monitoradas." },
      { property: "og:title", content: "Dashboard — ESKALA" },
      { property: "og:description", content: "Indicadores, matriz de equipamentos e Pareto de falhas." },
    ],
  }),
  component: Dashboard,
});

type SortKey = "id" | "station" | "manufacturer" | "criticality" | "condition" | "vibration" | "temperature" | "oil";
const condRank: Record<Condition, number> = { normal: 0, atencao: 1, alta: 2 };
const PAGE = 12;

function Dashboard() {
  const { equipment, alerts, interventions } = useEskala();
  const rows = useMemo(() => equipment.map((e) => ({ ...e, condition: conditionOf(e.reading) })), [equipment]);
  const counts = { normal: 0, atencao: 0, alta: 0 };
  rows.forEach((r) => counts[r.condition]++);
  const openAlerts = alerts.filter((a) => a.open).length;
  const availability = ((rows.filter((r) => r.online && r.condition !== "alta").length / rows.length) * 100).toFixed(1);

  const [q, setQ] = useState("");
  const [station, setStation] = useState("");
  const [maker, setMaker] = useState("");
  const [cond, setCond] = useState("");
  const [crit, setCrit] = useState("");
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: "condition", d: -1 });
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const f = rows.filter(
      (r) =>
        r.id.toLowerCase().includes(q.toLowerCase()) &&
        (!station || r.station === station) &&
        (!maker || r.manufacturer === maker) &&
        (!cond || r.condition === cond) &&
        (!crit || r.criticality === crit),
    );
    const val = (r: (typeof rows)[number]) =>
      sort.k === "condition"
        ? condRank[r.condition]
        : sort.k === "vibration" || sort.k === "temperature" || sort.k === "oil"
          ? r.reading[sort.k]
          : r[sort.k];
    return [...f].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.d);
  }, [rows, q, station, maker, cond, crit, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);

  const pareto = useMemo(() => {
    const c = COMPONENTS.map((name) => ({ name, falhas: interventions.filter((i) => i.component === name).length }));
    c.sort((a, b) => b.falhas - a.falhas);
    const total = c.reduce((s, x) => s + x.falhas, 0) || 1;
    let acc = 0;
    return c.map((x) => ({ ...x, acumulado: +((acc += x.falhas) / total * 100).toFixed(1) }));
  }, [interventions]);

  const th = (k: SortKey, label: string, right = false) => (
    <th className={cn("px-3 py-2 font-medium", right && "text-right")}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => setSort((s) => ({ k, d: s.k === k ? ((s.d * -1) as 1 | -1) : 1 }))}
      >
        {label}
        <ArrowUpDown className={cn("size-3", sort.k === k ? "text-primary" : "opacity-40")} />
      </button>
    </th>
  );
  const reset = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(0);
  };

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral das condições da frota" right={<SimulatedTag />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Disponibilidade" value={`${availability}%`} icon={Gauge} tone="brand" />
        <Kpi label="Monitorados" value={rows.length} icon={Layers} tone="brand" />
        <Kpi label="Normais" value={counts.normal} icon={CheckCircle2} tone="normal" />
        <Kpi label="Em atenção" value={counts.atencao} icon={AlertTriangle} tone="atencao" />
        <Kpi label="Prioridade alta" value={counts.alta} icon={ShieldAlert} tone="alta" />
        <Kpi label="Alertas ativos" value={openAlerts} icon={BellRing} tone="alta" />
      </div>

      <Panel
        className="mt-6"
        title="Matriz de equipamentos"
        right={<span className="text-xs text-muted-foreground">{filtered.length} resultados</span>}
      >
        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Buscar ID…" className="h-9 w-44 pl-8" />
          </div>
          <NativeSelect value={station} onChange={reset(setStation)} placeholder="Estação" options={STATIONS.map((s) => ({ value: s, label: s }))} />
          <NativeSelect value={maker} onChange={reset(setMaker)} placeholder="Fabricante" options={MANUFACTURERS.map((s) => ({ value: s, label: s }))} />
          <NativeSelect
            value={cond}
            onChange={reset(setCond)}
            placeholder="Condição"
            options={(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => ({ value: c, label: CONDITION_LABEL[c] }))}
          />
          <NativeSelect value={crit} onChange={reset(setCrit)} placeholder="Criticidade" options={[{ value: "A", label: "A · Crítica" }, { value: "B", label: "B · Não crítica" }]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                {th("id", "ID")}
                {th("station", "Estação")}
                {th("manufacturer", "Fabricante")}
                {th("criticality", "Crit.")}
                {th("condition", "Condição")}
                {th("vibration", "Vibração", true)}
                {th("temperature", "Temp.", true)}
                {th("oil", "Óleo", true)}
                <th className="px-3 py-2 font-medium">Comunicação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(cur * PAGE, cur * PAGE + PAGE).map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-3 py-2">{r.station}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.manufacturer}</td>
                  <td className="px-3 py-2">{r.criticality}</td>
                  <td className="px-3 py-2"><ConditionBadge c={r.condition} /></td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.reading.vibration.toFixed(1)} <span className="text-muted-foreground">mm/s</span></td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.reading.temperature.toFixed(0)} <span className="text-muted-foreground">°C</span></td>
                  <td className={cn("px-3 py-2 text-right tabular-nums", r.reading.oil < 20 && "text-status-high")}>{r.reading.oil.toFixed(0)}%</td>
                  <td className="px-3 py-2">
                    <span className={cn("text-xs", r.online ? "text-status-ok" : "text-status-high")}>{r.online ? "● Online" : "○ Sem sinal"}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/telemetria" search={{ id: r.id }}>Detalhes</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
          Página {cur + 1} de {pages}
          <Button size="icon" variant="ghost" className="size-7" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Anterior"><ChevronLeft /></Button>
          <Button size="icon" variant="ghost" className="size-7" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Próxima"><ChevronRight /></Button>
        </div>
      </Panel>

      <Panel className="mt-6" title="Pareto de falhas por componente">
        <div className="h-80 p-4">
          <ResponsiveContainer>
            <ComposedChart data={pareto}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
              <YAxis yAxisId="l" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} cursor={{ fill: "var(--muted)" }} />
              <Bar yAxisId="l" dataKey="falhas" name="Falhas" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={72} />
              <Line yAxisId="r" dataKey="acumulado" name="% acumulado" stroke="var(--status-warn)" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </>
  );
}
