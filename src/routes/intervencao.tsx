import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useEskala } from "@/lib/eskala/store";
import { COMPONENTS, type Component } from "@/lib/eskala/data";
import { NativeSelect, PageHeader, Panel, SeverityBadge } from "@/components/eskala/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/intervencao")({
  validateSearch: (s: Record<string, unknown>): { alertId?: string } => (typeof s["alertId"] === "string" ? { alertId: s["alertId"] } : {}),
  head: () => ({
    meta: [
      { title: "Registro de Intervenção — ESKALA" },
      { name: "description", content: "Registre as ações de manutenção vinculadas a um alerta aberto." },
      { property: "og:title", content: "Registro de Intervenção — ESKALA" },
      { property: "og:description", content: "Documente intervenções de manutenção." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InterventionPage,
});

type Errors = Partial<Record<"component" | "rootCause" | "actions" | "downtime", string>>;

function InterventionPage() {
  const { alertId } = Route.useSearch();
  const { alerts, registerIntervention } = useEskala();
  const navigate = useNavigate({ from: "/intervencao" });
  const alert = alerts.find((a) => a.id === alertId);
  const openAlerts = alerts.filter((a) => a.open);

  const [component, setComponent] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [actions, setActions] = useState("");
  const [parts, setParts] = useState("");
  const [downtime, setDowntime] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const valid = alert && alert.open;

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!valid) return;
    const e: Errors = {};
    if (!component) e.component = "Selecione o componente afetado.";
    if (rootCause.trim().length < 3) e.rootCause = "Informe a causa-raiz.";
    if (actions.trim().length < 3) e.actions = "Descreva as ações executadas.";
    const mttr = Number(downtime);
    if (!downtime || !Number.isInteger(mttr) || mttr <= 0) e.downtime = "Informe o tempo de parada em minutos (inteiro maior que 0).";
    setErrors(e);
    if (Object.keys(e).length) return;
    const err = registerIntervention({ alertId: alert.id, component: component as Component, rootCause: rootCause.trim(), actions: actions.trim(), parts: parts.trim() || "—", downtimeMin: mttr });
    if (err) return void toast.error(err);
    toast.success(`Intervenção registrada e alerta ${alert.id} encerrado.`);
    navigate({ to: "/telemetria", search: { id: alert.equipmentId } });
  }

  return (
    <>
      <PageHeader title="Registro de Intervenção" subtitle="Toda intervenção deve estar vinculada a um alerta aberto" />
      <div className="max-w-3xl">
        {!valid ? (
          <Panel title={alertId ? "Alerta inválido ou já encerrado" : "Selecione um alerta aberto"}>
            <div className="space-y-3 p-4 text-sm">
              <p className="text-muted-foreground">Não é possível registrar uma intervenção sem vínculo com um alerta aberto.</p>
              <div className="flex flex-wrap items-center gap-2">
                <NativeSelect
                  value=""
                  onChange={(v) => v && navigate({ search: { alertId: v } })}
                  placeholder={`Escolher alerta (${openAlerts.length} abertos)`}
                  options={openAlerts.map((a) => ({ value: a.id, label: `${a.id} · ${a.equipmentId} · ${a.variable}` }))}
                />
                <Button asChild variant="outline" size="sm"><Link to="/alertas">Ir para a Central de Alertas</Link></Button>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel>
            <form onSubmit={submit} noValidate className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="ID do alerta associado"><Input value={`${alert.id} · ${alert.equipmentId}`} readOnly className="bg-muted" /></Field>
              <Field label="Leitura original do sensor">
                <div className="flex h-9 items-center gap-2 rounded-none border bg-muted px-3 text-sm">
                  {alert.variable}: {alert.reading} <SeverityBadge s={alert.severity} />
                </div>
              </Field>
              <Field label="Componente afetado *" error={errors.component}>
                <NativeSelect value={component} onChange={setComponent} placeholder="Selecione…" options={COMPONENTS.map((c) => ({ value: c, label: c }))} />
              </Field>
              <Field label="Tempo de parada (MTTR, min) *" error={errors.downtime}>
                <Input type="number" min={1} value={downtime} onChange={(e) => setDowntime(e.target.value)} />
              </Field>
              <Field label="Causa-raiz *" error={errors.rootCause} full>
                <Input value={rootCause} onChange={(e) => setRootCause(e.target.value)} />
              </Field>
              <Field label="Ações executadas *" error={errors.actions} full>
                <Textarea rows={3} value={actions} onChange={(e) => setActions(e.target.value)} />
              </Field>
              <Field label="Peças substituídas" full>
                <Input value={parts} onChange={(e) => setParts(e.target.value)} placeholder="Opcional" />
              </Field>
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Apoio à decisão apenas — nenhum comando é enviado ao equipamento.</p>
                <Button type="submit">Registrar e encerrar alerta</Button>
              </div>
            </form>
          </Panel>
        )}
      </div>
    </>
  );
}

function Field({ label, error, full, children }: { label: string; error?: string | undefined; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="[&>select]:w-full">{children}</div>
      {error && <p className="text-xs text-status-high">{error}</p>}
    </div>
  );
}
