import type { PackagePriority, PackageStatus } from '../models/package.model';

export const STATUS_LABEL: Record<PackageStatus, string> = {
  IN_TRANSIT: 'En tránsito',
  INSPECTED: 'Inspeccionado',
  REJECTED: 'Rechazado',
};

export const PRIORITY_LABEL: Record<PackagePriority, string> = {
  CRITICAL: 'Prioridad alta',
  STANDARD: 'Prioridad media',
  LOW: 'Prioridad baja',
};

const dateTimeFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'medium' });
const timeFormat = new Intl.DateTimeFormat('es-ES', { timeStyle: 'medium' });
const percentFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

export function formatTime(date: Date): string {
  return timeFormat.format(date);
}

/** «3 de 8 (37,5 %)»; con total 0 devuelve «0 de 0 (0 %)». */
export function formatShare(count: number, total: number): string {
  const pct = total === 0 ? 0 : (count / total) * 100;
  return `${count} de ${total} (${percentFormat.format(pct)} %)`;
}

export function percentOf(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100;
}
