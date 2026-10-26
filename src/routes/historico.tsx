import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Eye, Search, RotateCcw, History } from "lucide-react";
import { useEskala } from "@/lib/eskala/store";
import { COMPONENTS, type Intervention } from "@/lib/eskala/data";
import { EMPTY_HISTORY_FILTERS, filterInterventions, technicianOf, maintenanceTypeOf } from "@/lib/eskala/history";
import { PageHeader, SimulatedTag } from "@/components/eskala/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export const Route = createFileRoute("/historico")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => typeof s["id"] === "string" ? { id: s["id"] } : {},
  head: () => ({ meta: [
    { title: "Histórico de Intervenções — ESKALA" },
    { name: "description", content: "Consulte o histórico completo de manutenção da frota ou de uma escada rolante." },
    { property: "og:title", content: "Histórico de Intervenções — ESKALA" },
    { property: "og:description", content: "Intervenções, serviços e responsáveis pela manutenção das escadas rolantes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: InterventionHistory,
});

function InterventionHistory() {
  const { equipment, interventions } = useEskala();
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/historico" });
  const [filters, setFilters] = useState(EMPTY_HISTORY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = useMemo(() => filterInterventions(interventions, { ...filters, equipmentId: id ?? "" }), [interventions, filters, id]);
  const selected = interventions.find((i) => i.id === selectedId);
  const technicians = [...new Set(interventions.map(technicianOf))].sort();
  const types = [...new Set(interventions.map(maintenanceTypeOf))].sort();
  const update = (key: keyof typeof filters, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));
  const invalidPeriod = Boolean(filters.start && filters.end && filters.start > filters.end);
  const clear = () => { setFilters(EMPTY_HISTORY_FILTERS); navigate({ search: {} }); };

  return <>
    <PageHeader title="Histórico de Intervenções" subtitle="Registro de manutenção da frota e de cada escada rolante" right={<SimulatedTag />} />
    <div className="mb-6 space-y-4 border-y py-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.4fr]">
        <FilterSelect label="Equipamento" value={id ?? ""} onChange={(value) => navigate({ search: value ? { id: value } : {} })} placeholder="Toda a frota" options={equipment.map((e) => ({ value: e.id, label: `${e.id} · ${e.station}` }))} />
        <div className="space-y-1.5">
          <Label htmlFor="history-query" className="text-xs text-muted-foreground">Pesquisa</Label>
          <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input id="history-query" placeholder="Equipamento, técnico, componente ou serviço" value={filters.query} onChange={(e) => update("query", e.target.value)} className="pl-9" /></div>
        </div>
      </div>
      <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
        <div className="space-y-1.5"><Label htmlFor="history-start" className="text-xs text-muted-foreground">Data inicial</Label><Input id="history-start" type="date" value={filters.start} onChange={(e) => update("start", e.target.value)} aria-invalid={invalidPeriod} /></div>
        <div className="space-y-1.5"><Label htmlFor="history-end" className="text-xs text-muted-foreground">Data final</Label><Input id="history-end" type="date" value={filters.end} onChange={(e) => update("end", e.target.value)} aria-invalid={invalidPeriod} /></div>
        <FilterSelect label="Componente" value={filters.component} onChange={(v) => update("component", v)} placeholder="Todos" options={COMPONENTS.map((c) => ({ value: c, label: c }))} />
        <FilterSelect label="Técnico" value={filters.technician} onChange={(v) => update("technician", v)} placeholder="Todos" options={technicians.map((t) => ({ value: t, label: t }))} />
        <FilterSelect label="Tipo de manutenção" value={filters.maintenanceType} onChange={(v) => update("maintenanceType", v)} placeholder="Todos" options={types.map((t) => ({ value: t, label: t }))} />
        <Button variant="outline" onClick={clear}><RotateCcw className="size-4" />Limpar filtros</Button>
      </div>
      {invalidPeriod && <p role="alert" className="text-sm text-destructive">A data final deve ser igual ou posterior à data inicial.</p>}
    </div>

    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
      <h2 className="font-semibold">{id ? `Intervenções · ${id}` : "Intervenções da frota"}</h2>
      <span className="text-muted-foreground">{rows.length} {rows.length === 1 ? "registro" : "registros"}{!filters.start && !filters.end ? " · Todo o período" : ""}</span>
    </div>
    <div className="overflow-x-auto border bg-card">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr>{["Data da intervenção", "Escada rolante", "Componente", "Serviço realizado", "Técnico responsável", "Detalhes"].map((title) => <th key={title} scope="col" className="px-4 py-3 font-medium">{title}</th>)}</tr></thead>
        <tbody className="divide-y">{rows.map((i) => <tr key={i.id} onClick={() => setSelectedId(i.id)} className="cursor-pointer hover:bg-muted/50">
          <td className="whitespace-nowrap px-4 py-4 tabular-nums">{new Date(i.date).toLocaleDateString("pt-BR")}</td>
          <td className="px-4 py-4 font-mono text-xs font-medium text-primary">{i.equipmentId}</td>
          <td className="px-4 py-4">{i.component}</td>
          <td className="min-w-56 max-w-96 px-4 py-4"><div className="line-clamp-2">{i.actions}</div></td>
          <td className="px-4 py-4">{technicianOf(i)}</td>
          <td className="px-4 py-2"><Button variant="ghost" size="icon" title={`Ver detalhes de ${i.id}`} aria-label={`Ver detalhes de ${i.id}`} onClick={(event) => { event.stopPropagation(); setSelectedId(i.id); }}><Eye className="size-4" /></Button></td>
        </tr>)}</tbody>
      </table>
      {rows.length === 0 && <div className="flex flex-col items-center gap-3 px-4 py-16 text-center"><History className="size-8 text-muted-foreground" /><p className="font-medium">Nenhuma intervenção encontrada.</p><p className="text-sm text-muted-foreground">Não há registros para os filtros selecionados.</p><Button variant="outline" onClick={clear}><RotateCcw className="size-4" />Limpar filtros</Button></div>}
    </div>

    <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
      <SheetContent className="w-full overflow-y-auto bg-card sm:max-w-lg">
        <SheetHeader className="border-b pb-5 text-left"><SheetTitle className="pr-6 font-display">Detalhes da intervenção</SheetTitle><SheetDescription>{selected?.id}</SheetDescription></SheetHeader>
        {selected && <InterventionDetails intervention={selected} station={equipment.find((e) => e.id === selected.equipmentId)?.station} />}
      </SheetContent>
    </Sheet>
  </>;
}

function FilterSelect({ label, value, onChange, placeholder, options }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[] }) {
  const fieldId = `history-${label.replaceAll(" ", "-")}`;
  return <div className="min-w-0 space-y-1.5"><Label htmlFor={fieldId} className="text-xs text-muted-foreground">{label}</Label><select id={fieldId} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full min-w-0 border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring"><option value="">{placeholder}</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
}

function InterventionDetails({ intervention: i, station }: { intervention: Intervention; station: string | undefined }) {
  return <div className="space-y-6 py-6">
    <div><div className="font-display text-2xl font-semibold text-primary">{i.equipmentId}</div><p className="mt-1 text-sm text-muted-foreground">{station}</p></div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
      <Detail label="Data e horário">{new Date(i.date).toLocaleString("pt-BR")}</Detail>
      <Detail label="Técnico responsável">{technicianOf(i)}</Detail>
      <Detail label="Componente afetado">{i.component}</Detail>
      <Detail label="Tipo de manutenção">{maintenanceTypeOf(i)}</Detail>
      <Detail label="Duração / tempo de parada">{i.downtimeMin} min</Detail>
    </dl>
    <dl className="space-y-5 border-t pt-5"><Detail label="Serviço realizado">{i.actions}</Detail><Detail label="Causa-raiz">{i.rootCause}</Detail><Detail label="Peças substituídas">{i.parts === "—" ? "Nenhuma informada" : i.parts}</Detail>{i.notes && <Detail label="Observações adicionais">{i.notes}</Detail>}</dl>
  </div>;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{children}</dd></div>;
}