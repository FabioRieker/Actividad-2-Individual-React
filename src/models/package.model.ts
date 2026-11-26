/** Prioridad logística de un paquete. */
export type PackagePriority = 'CRITICAL' | 'STANDARD' | 'LOW';

/** Estado de inspección de un paquete. */
export type PackageStatus = 'IN_TRANSIT' | 'INSPECTED' | 'REJECTED';

/** Paquete del almacén de LogiTrack Express. */
export interface WarehousePackage {
  /** Identificador UUID. */
  readonly id: string;
  /** Código de seguimiento con formato LTK-XXXX-ES. */
  readonly trackingCode: string;
  readonly destinationHub: string;
  readonly weightKg: number;
  readonly priority: PackagePriority;
  readonly status: PackageStatus;
  readonly timestamp: Date;
}

/** Evento de cambio de estado emitido por la UI. */
export type StatusChangeEvent = {
  readonly id: string;
  readonly newStatus: PackageStatus;
};

/** Filtro de prioridad de la lista; 'ALL' desactiva el filtro. */
export type PriorityFilter = 'ALL' | PackagePriority;
