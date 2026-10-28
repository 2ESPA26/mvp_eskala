import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Clock3, MapPinned, Navigation, Route as RouteIcon, Wrench } from "lucide-react";
import { useEskala } from "@/lib/eskala/store";
import { LINES, STATIONS, SEVERITY_LABEL, STATION_INFO, lineOf, type Line } from "@/lib/eskala/data";
import { CONNECTIONS, clockMinutes, formatClock, optimizeRoute, routeCandidates, type RoutePlan, type Station } from "@/lib/eskala/route-planner";
import { Kpi, PageHeader, Panel, SimulatedTag } from "@/components/eskala/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rotas")({
  head: () => ({ meta: [{ title: "Planejamento de rota — ESKALA" }, { name: "description", content: "Planejamento simulado do turno de manutenção." }] }),
  component: RoutePlanner,
});

const POINTS: Record<Station, { x: number; y: number; labelX: number; labelY: number }> = {
  "Luz": { x: 160, y: 90, labelX: 160, labelY: 132 },
  "Paulista": { x: 450, y: 90, labelX: 450, labelY: 132 },
  "Pinheiros": { x: 740, y: 90, labelX: 740, labelY: 132 },
  "Chácara Klabin": { x: 160, y: 430, labelX: 160, labelY: 472 },
  "Santa Cruz": { x: 450, y: 430, labelX: 450, labelY: 472 },
  "Santo Amaro": { x: 740, y: 430, labelX: 740, labelY: 472 },
  "Palmeiras - Barra Funda": { x: 160, y: 200, labelX: 160, labelY: 242 },
  "Osasco": { x: 450, y: 200, labelX: 450, labelY: 242 },
  "Itapevi": { x: 740, y: 200, labelX: 740, labelY: 242 },
  "Vila Olímpia": { x: 160, y: 315, labelX: 160, labelY: 357 },
  "Berrini - Casas Bahia": { x: 450, y: 315, labelX: 450, labelY: 357 },
  "Morumbi - Claro": { x: 740, y: 315, labelX: 740, labelY: 357 },
};
const LINE_COLORS: Record<Line, string> = { "4-Amarela": "#e8b931", "5-Lilás": "#8d5ba9", "8-Diamante": "#9298a2", "9-Esmeralda": "#168f69" };

function MapView({ origin, plan, focus, onFocus, onOrigin }: {
  origin: Station;
  plan: RoutePlan | null;
  focus: string | null;
  onFocus: (id: string | null) => void;
  onOrigin: (station: Station) => void;
}) {
  const count = new Map<Station, number[]>();
  plan?.stops.forEach((stop) => count.set(stop.station, [...(count.get(stop.station) ?? []), stop.order]));
  const segments = plan?.path.slice(1).map((station, index) => ({ from: plan.path[index]!, to: station })) ?? [];

  return (
    <div className="overflow-x-auto rounded-none border bg-[#f5f8fa]">
      <svg viewBox="0 0 900 520" className="h-auto min-w-[720px] w-full" role="img" aria-label="Mapa esquemático interativo das estações e da rota planejada">
        <defs>
          <pattern id="route-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#dde6ec" strokeWidth="1" /></pattern>
        </defs>
        <rect width="900" height="520" fill="url(#route-grid)" />
        <text x="22" y="27" fill="#5c7181" fontSize="12" fontWeight="600">REDE ILUSTRATIVA · TEMPOS SIMULADOS</text>
        {(["4-Amarela", "8-Diamante", "9-Esmeralda", "5-Lilás"] as const).map((line, index) => <g key={line}>
          <rect x="18" y={63 + index * 113} width="8" height="28" rx="3" fill={LINE_COLORS[line]} />
          <text x="35" y={82 + index * 113} fill="#405464" fontSize="11" fontWeight="700">{line}</text>
        </g>)}
        {CONNECTIONS.map((edge) => {
          const a = POINTS[edge.from], b = POINTS[edge.to];
          return <g key={`${edge.from}-${edge.to}`}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={lineOf(edge.from) === lineOf(edge.to) ? LINE_COLORS[lineOf(edge.from)] : "#b2c4cf"} strokeWidth="5" strokeLinecap="round" opacity="0.72" />
            <rect x={(a.x + b.x) / 2 - 18} y={(a.y + b.y) / 2 - 11} width="36" height="21" rx="10" fill="white" stroke="#d1dde4" />
            <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 3} textAnchor="middle" fill="#667b89" fontSize="10">{edge.minutes}m</text>
          </g>;
        })}
        {segments.map((leg, index) => <line key={index} x1={POINTS[leg.from].x} y1={POINTS[leg.from].y} x2={POINTS[leg.to].x} y2={POINTS[leg.to].y} stroke="#07869a" strokeWidth="7" strokeLinecap="round" opacity="0.8" />)}
        {STATIONS.map((station) => {
          const point = POINTS[station], orders = count.get(station) ?? [], isOrigin = origin === station;
          const highlighted = plan?.stops.some((stop) => stop.station === station && stop.id === focus);
          return <g key={station} role="button" tabIndex={0} aria-label={`Selecionar ${station} como ponto de partida`} className="cursor-pointer outline-none" onClick={() => { onOrigin(station); onFocus(null); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOrigin(station); onFocus(null); } }}>
            <circle cx={point.x} cy={point.y} r={highlighted ? 25 : 22} fill="white" stroke={highlighted ? "#dd6334" : isOrigin ? "#203d59" : LINE_COLORS[lineOf(station)]} strokeWidth="4" />
            {isOrigin ? <text x={point.x} y={point.y + 5} textAnchor="middle" fontSize="16" fill="#203d59">⌂</text> : <circle cx={point.x} cy={point.y} r="7" fill={orders.length ? "#07869a" : "#b5c7d1"} />}
            {orders.length > 0 && <g><circle cx={point.x + 23} cy={point.y - 20} r="14" fill="#07869a" /><text x={point.x + 23} y={point.y - 16} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{orders.length > 1 ? `${orders[0]}+` : orders[0]}</text></g>}
            <text x={point.labelX} y={point.labelY} textAnchor="middle" fill="#203d59" fontSize="14" fontWeight="600">{station}</text>
          </g>;
        })}
      </svg>
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">Clique numa estação para mudar a partida. Números indicam a ordem dos atendimentos.</p>
    </div>
  );
}

function RoutePlanner() {
  const { alerts, equipment } = useEskala();
  const candidates = useMemo(() => routeCandidates(alerts, equipment), [alerts, equipment]);
  const [origin, setOrigin] = useState<Station>("Luz");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("13:00");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [generated, setGenerated] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  const chosen = candidates.filter((task) => !excluded.includes(task.id)).map((task) => ({ ...task, durationMin: durations[task.id] ?? task.durationMin }));
  const shiftStart = clockMinutes(start), shiftEnd = clockMinutes(end);
  const error = !Number.isFinite(shiftStart) || !Number.isFinite(shiftEnd) || shiftEnd <= shiftStart
    ? "Defina um horário de fim posterior ao início do turno."
    : chosen.length === 0 ? "Selecione pelo menos um atendimento." : chosen.some((task) => task.durationMin < 5 || !Number.isFinite(task.durationMin))
      ? "Cada manutenção precisa de pelo menos 5 minutos." : null;
  const plan = generated && !error ? optimizeRoute(chosen, origin, shiftStart, shiftEnd) : null;

  const changeOrigin = (station: Station) => { setOrigin(station); setGenerated(false); };
  const toggle = (id: string) => {
    setExcluded((old) => old.includes(id) ? old.filter((value) => value !== id) : [...old, id]);
    setGenerated(false);
  };
  const badge = (priority: number) => priority >= 4 ? "bg-status-high/12 text-status-high" : priority >= 2 ? "bg-status-warn/12 text-status-warn" : "bg-primary/12 text-primary";

  return <>
    <PageHeader title="Otimização de rota" subtitle="Organize o turno com prioridade e deslocamento simulados" right={<SimulatedTag />} />
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-5">
        <Panel title="Configurar turno">
          <div className="space-y-4 p-4">
            <label className="block text-sm font-medium">Estação de partida
              <select value={origin} onChange={(event) => changeOrigin(event.target.value as Station)} className="mt-1.5 h-10 w-full border bg-background px-3 text-sm">
                {LINES.map((line) => <optgroup key={line} label={`Linha ${line}`}>
                  {STATION_INFO.filter((station) => station.line === line).map((station) => <option key={station.name} value={station.name}>{station.name}</option>)}
                </optgroup>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">Início do turno<Input type="time" value={start} onChange={(event) => { setStart(event.target.value); setGenerated(false); }} className="mt-1.5" /></label>
              <label className="text-sm font-medium">Fim do turno<Input type="time" value={end} onChange={(event) => { setEnd(event.target.value); setGenerated(false); }} className="mt-1.5" /></label>
            </div>
            <p className="text-xs text-muted-foreground">O local de término é calculado pela última visita. Tempos de trajeto e serviço são hipóteses ajustáveis nesta demonstração.</p>
            {error && <p role="alert" className="text-sm text-status-high">{error}</p>}
            <Button className="w-full" disabled={Boolean(error)} onClick={() => { setGenerated(true); setFocus(null); }}><Navigation className="size-4" /> Gerar melhor rota</Button>
          </div>
        </Panel>
        <Panel title="Atendimentos disponíveis" right={<span className="text-xs text-muted-foreground">{chosen.length} selecionados</span>}>
          <div className="divide-y">
            {candidates.map((task) => {
              const checked = !excluded.includes(task.id);
              return <div key={task.id} className={cn("p-3", !checked && "opacity-55")}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={checked} onChange={() => toggle(task.id)} className="mt-1 size-4 accent-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2"><strong className="font-mono text-sm">{task.equipmentId}</strong><span className={cn("px-1.5 py-0.5 text-[11px] font-semibold", badge(task.priority))}>Prioridade {task.priority}</span></span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">Linha {lineOf(task.station)} · {task.station} · {task.variable} · {SEVERITY_LABEL[task.severity]} · Classe {task.criticality}</span>
                  </span>
                </label>
                <label className="ml-7 mt-2 flex items-center gap-2 text-xs text-muted-foreground">Tempo de serviço
                  <Input type="number" min="5" max="480" step="5" value={durations[task.id] ?? task.durationMin} onChange={(event) => { setDurations((old) => ({ ...old, [task.id]: Number(event.target.value) })); setGenerated(false); }} className="h-8 w-20" aria-label={`Duração do atendimento ${task.equipmentId} em minutos`} /> min
                </label>
              </div>;
            })}
            {!candidates.length && <p className="p-4 text-sm text-muted-foreground">Nenhum alerta aberto para planejar.</p>}
          </div>
        </Panel>
      </div>

      <div className="min-w-0 space-y-5">
        <Panel title="Mapa do turno" right={<span className="text-xs text-muted-foreground">Clique nas estações</span>}>
          <div className="p-4"><MapView origin={origin} plan={plan} focus={focus} onFocus={setFocus} onOrigin={changeOrigin} /></div>
        </Panel>
        {plan ? <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Atendimentos" value={plan.stops.length} icon={Wrench} tone="brand" />
            <Kpi label="Deslocamento" value={`${plan.travelMin} min`} icon={RouteIcon} tone="brand" />
            <Kpi label="Serviços" value={`${plan.serviceMin} min`} icon={Clock3} tone="brand" />
            <Kpi label="Fim previsto" value={formatClock(plan.endMin)} icon={MapPinned} tone="brand" hint={`${lineOf(plan.station)} · ${plan.station}`} />
          </div>
          <Panel title="Sequência sugerida" right={<span className="text-xs text-muted-foreground">Partida {formatClock(shiftStart)} · {origin}</span>}>
            {plan.stops.length ? <ol className="divide-y">
              {plan.stops.map((stop) => <li key={stop.id}>
                <button onClick={() => setFocus(focus === stop.id ? null : stop.id)} className={cn("flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40", focus === stop.id && "bg-primary/5")}>
                  <span className="grid size-8 shrink-0 place-items-center bg-primary font-semibold text-primary-foreground">{stop.order}</span>
                  <span className="min-w-0 flex-1"><span className="font-medium">{stop.equipmentId} · {stop.station}</span><span className="block text-xs text-muted-foreground">Linha {lineOf(stop.station)} · {stop.variable} · prioridade {stop.priority} · {stop.durationMin} min de serviço</span></span>
                  <span className="text-right text-sm tabular-nums"><strong>{formatClock(stop.arrivalMin)} <ArrowRight className="inline size-3" /> {formatClock(stop.finishMin)}</strong><span className="block text-xs text-muted-foreground">{stop.travelMin ? `${stop.travelMin} min de trajeto` : "Sem deslocamento"}</span></span>
                </button>
              </li>)}
            </ol> : <p className="p-4 text-sm text-muted-foreground">Nenhum serviço cabe neste turno. Amplie o horário ou reduza os tempos estimados.</p>}
          </Panel>
          {plan.remaining.length > 0 && <Panel title="Ficam para outro turno"><div className="space-y-2 p-4 text-sm">{plan.remaining.map((task) => <p key={task.id}><strong>{task.equipmentId}</strong> · {lineOf(task.station)} · {task.station} · prioridade {task.priority} · {task.durationMin} min</p>)}</div></Panel>}
          <p className="text-xs text-muted-foreground">Critério: atender o máximo possível de alertas em cada nível de prioridade; entre rotas equivalentes, escolher menos tempo de deslocamento. O mapa é esquemático e não representa distâncias reais.</p>
        </> : <div className="border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">Defina o turno, escolha os atendimentos e gere a rota para ver a agenda.</div>}
        <Link to="/alertas" className="inline-block text-sm text-primary underline-offset-4 hover:underline">Ver Central de Alertas</Link>
      </div>
    </div>
  </>;
}
