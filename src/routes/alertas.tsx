import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Search, ShieldAlert, AlertTriangle, Info } from "lucide-react";
import { useEskala } from "@/lib/eskala/store";
import { SEVERITY_LABEL, STATIONS, priorityScore, type Severity } from "@/lib/eskala/data";
import { Kpi, NativeSelect, PageHeader, Panel, SeverityBadge, SimulatedTag } from "@/components/eskala/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Central de Alertas — ESKALA" },
      { name: "description", content: "Alertas ativos priorizados por severidade e criticidade." },
      { property: "og:title", content: "Central de Alertas — ESKALA" },
      { property: "og:description", content: "Priorize as ocorrências que exigem atendimento." },
    ],
  }),
  component: Alerts,
});

const PLAN: Record<string, { steps: string[]; time: string; team: string }> = {
  "Vibração do motor": { steps: ["Inspecionar fixação e alinhamento do motor", "Verificar rolamentos", "Medir vibração após ajuste"], time: "~2 h", team: "1 técnico mecânico" },
  "Temperatura do redutor": { steps: ["Verificar nível e qualidade do óleo", "Inspecionar ventilação", "Checar carga e engrenagens"], time: "~1,5 h", team: "1 técnico mecânico" },
  "Nível de óleo": { steps: ["Localizar possível vazamento", "Completar óleo conforme especificação", "Inspecionar retentores"], time: "~1 h", team: "1 técnico" },
  Comunicação: { steps: ["Verificar alimentação do gateway", "Checar cabeamento do sensor", "Reiniciar módulo de comunicação"], time: "~45 min", team: "1 técnico de automação" },
};

function Alerts() {
  const { alerts, equipment } = useEskala();
  const eqMap = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);
  const open = useMemo(
    () =>
      alerts
        .filter((a) => a.open)
        .map((a) => {
          const e = eqMap.get(a.equipmentId)!;
          return { ...a, station: e.station, criticality: e.criticality, score: priorityScore(a.severity, e.criticality) };
        }),
    [alerts, eqMap],
  );

  const [q, setQ] = useState("");
  const [station, setStation] = useState("");
  const [sev, setSev] = useState("");
  const [crit, setCrit] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = open
    .filter(
      (a) =>
        a.equipmentId.toLowerCase().includes(q.toLowerCase()) &&
        (!station || a.station === station) &&
        (!sev || a.severity === sev) &&
        (!crit || a.criticality === crit),
    )
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));

  const count = (s: Severity) => open.filter((a) => a.severity === s).length;

  return (
    <>
      <PageHeader title="Central de Alertas" subtitle="Ordenados por prioridade (severidade × criticidade)" right={<SimulatedTag />} />
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Críticos" value={count("critico")} icon={ShieldAlert} tone="alta" />
        <Kpi label="Altos" value={count("alto")} icon={AlertTriangle} tone="atencao" />
        <Kpi label="Médios" value={count("medio")} icon={Info} tone="brand" />
      </div>

      <Panel className="mt-6" title="Alertas ativos" right={<span className="text-xs text-muted-foreground">{rows.length} resultados</span>}>
        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Equipamento…" className="h-9 w-44 pl-8" />
          </div>
          <NativeSelect value={station} onChange={setStation} placeholder="Estação" options={STATIONS.map((s) => ({ value: s, label: s }))} />
          <NativeSelect value={sev} onChange={setSev} placeholder="Severidade" options={(Object.keys(SEVERITY_LABEL) as Severity[]).map((s) => ({ value: s, label: SEVERITY_LABEL[s] }))} />
          <NativeSelect value={crit} onChange={setCrit} placeholder="Criticidade" options={[{ value: "A", label: "A · Crítica" }, { value: "B", label: "B · Não crítica" }]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="w-8" />
                <th className="px-3 py-2 font-medium">Alerta</th>
                <th className="px-3 py-2 font-medium">Equipamento</th>
                <th className="px-3 py-2 font-medium">Estação</th>
                <th className="px-3 py-2 font-medium">Variável</th>
                <th className="px-3 py-2 text-right font-medium">Leitura</th>
                <th className="px-3 py-2 text-right font-medium">Limite</th>
                <th className="px-3 py-2 font-medium">Severidade</th>
                <th className="px-3 py-2 font-medium">Data/hora</th>
                <th className="px-3 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const plan = PLAN[a.variable]!;
                const isOpen = expanded === a.id;
                return (
                  <Fragment key={a.id}>
                    <tr className="border-b hover:bg-muted/40">
                      <td className="pl-3">
                        <span className={cn("block h-6 w-1 rounded-full", a.score >= 4 ? "bg-status-high" : a.score >= 2 ? "bg-status-warn" : "bg-primary")} title={`Prioridade ${a.score}`} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{a.id}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.equipmentId} <span className="text-muted-foreground">· {a.criticality}</span></td>
                      <td className="px-3 py-2">{a.station}</td>
                      <td className="px-3 py-2">{a.variable}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.reading}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{a.limit}</td>
                      <td className="px-3 py-2"><SeverityBadge s={a.severity} /></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setExpanded(isOpen ? null : a.id)}>
                          Detalhes <ChevronDown className={cn("transition-transform", isOpen && "rotate-180")} />
                        </Button>
                        <Button asChild size="sm" className="ml-1">
                          <Link to="/intervencao" search={{ alertId: a.id }}>Tratar</Link>
                        </Button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b bg-muted/30">
                        <td />
                        <td colSpan={9} className="px-3 py-3">
                          <div className="flex flex-wrap gap-8 text-sm">
                            <div>
                              <div className="mb-1 text-xs text-muted-foreground">Plano de atendimento sugerido</div>
                              <ol className="list-decimal space-y-0.5 pl-4">{plan.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                            </div>
                            <div>
                              <div className="mb-1 text-xs text-muted-foreground">Estimativas (simuladas)</div>
                              <div>Duração: {plan.time}</div>
                              <div>Equipe: {plan.team}</div>
                              <div>Prioridade: {a.score}/6</div>
                            </div>
                            <div className="self-end">
                              <Button asChild size="sm" variant="outline">
                                <Link to="/telemetria" search={{ id: a.equipmentId }}>Ver telemetria</Link>
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">Nenhum alerta ativo com esses filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
