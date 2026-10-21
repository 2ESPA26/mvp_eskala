import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONDITION_LABEL, SEVERITY_LABEL, type Condition, type Severity } from "@/lib/eskala/data";

const tone = {
  normal: "bg-status-ok/12 text-status-ok ring-status-ok/25",
  atencao: "bg-status-warn/12 text-status-warn ring-status-warn/25",
  alta: "bg-status-high/12 text-status-high ring-status-high/25",
};
const dot = { normal: "bg-status-ok", atencao: "bg-status-warn", alta: "bg-status-high" };

export function ConditionBadge({ c }: { c: Condition }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1", tone[c])}>
      <span className={cn("size-1.5 rounded-full", dot[c])} />
      {CONDITION_LABEL[c]}
    </span>
  );
}

const sevMap: Record<Severity, Condition> = { critico: "alta", alto: "atencao", medio: "normal" };
export function SeverityBadge({ s }: { s: Severity }) {
  const c = s === "medio" ? "bg-primary/12 text-primary ring-primary/25" : tone[sevMap[s]];
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1", c)}>{SEVERITY_LABEL[s]}</span>;
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Kpi({
  label,
  value,
  icon: Icon,
  tone: t,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: Condition | "brand";
  hint?: string;
}) {
  const color =
    t === "normal" ? "text-status-ok" : t === "atencao" ? "text-status-warn" : t === "alta" ? "text-status-high" : "text-primary";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <Icon className={cn("size-4", color)} />
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Panel({ title, right, children, className }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function SimulatedTag() {
  return <span className="rounded-md border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground">Dados simulados</span>;
}

export function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border bg-input/40 px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
