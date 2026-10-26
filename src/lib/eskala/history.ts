import type { Intervention } from "./data";

export interface HistoryFilters {
  equipmentId: string;
  start: string;
  end: string;
  component: string;
  technician: string;
  maintenanceType: string;
  query: string;
}

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  equipmentId: "", start: "", end: "", component: "", technician: "", maintenanceType: "", query: "",
};

export const technicianOf = (i: Intervention) => i.technician || "Não informado";
export const maintenanceTypeOf = (i: Intervention) => i.maintenanceType || "Não informado";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Match date inputs against the same local calendar dates displayed in the table.
export function calendarDate(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function filterInterventions(interventions: Intervention[], filters: HistoryFilters) {
  const query = normalize(filters.query.trim());
  return interventions.filter((i) => {
    const day = calendarDate(i.date);
    return (!filters.equipmentId || i.equipmentId === filters.equipmentId)
      && (!filters.start || day >= filters.start)
      && (!filters.end || day <= filters.end)
      && (!filters.component || i.component === filters.component)
      && (!filters.technician || technicianOf(i) === filters.technician)
      && (!filters.maintenanceType || maintenanceTypeOf(i) === filters.maintenanceType)
      && (!query || normalize([i.equipmentId, technicianOf(i), i.component, i.actions, i.rootCause, i.parts].join(" ")).includes(query));
  }).sort((a, b) => b.date.localeCompare(a.date));
}