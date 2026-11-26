import { useSyncExternalStore } from 'react';

import type { PackageStatus, WarehousePackage } from '../models/package.model';

function createMock(): readonly WarehousePackage[] {
  const packages: readonly WarehousePackage[] = [
    {
      id: '3f8a1c52-7b3e-4d19-9a6c-0e5d2b7f1a01',
      trackingCode: 'LTK-0001-ES',
      destinationHub: 'Madrid - Coslada',
      weightKg: 4.2,
      priority: 'CRITICAL',
      status: 'IN_TRANSIT',
      timestamp: new Date('2026-03-02T08:15:00Z'),
    },
    {
      id: '9b2e4d70-1c6a-4f83-8d52-6a1f3c9e2b02',
      trackingCode: 'LTK-0002-ES',
      destinationHub: 'Barcelona - El Prat',
      weightKg: 12.75,
      priority: 'STANDARD',
      status: 'INSPECTED',
      timestamp: new Date('2026-03-02T09:40:00Z'),
    },
    {
      id: 'c41d7e96-5a28-4b0f-a3e1-2d8c6f4b7a03',
      trackingCode: 'LTK-0003-ES',
      destinationHub: 'Valencia - Silla',
      weightKg: 0.8,
      priority: 'LOW',
      status: 'REJECTED',
      timestamp: new Date('2026-03-02T10:05:00Z'),
    },
    {
      id: '7d5f0a38-e2b4-4c61-b9a7-8f3e1d6c5b04',
      trackingCode: 'LTK-0004-ES',
      destinationHub: 'Sevilla - La Rinconada',
      weightKg: 23.4,
      priority: 'CRITICAL',
      status: 'INSPECTED',
      timestamp: new Date('2026-03-03T07:30:00Z'),
    },
    {
      id: 'a86c3b14-9d07-4e52-8c1a-5b2f7e0d9c05',
      trackingCode: 'LTK-0005-ES',
      destinationHub: 'Bilbao - Zamudio',
      weightKg: 7.1,
      priority: 'STANDARD',
      status: 'IN_TRANSIT',
      timestamp: new Date('2026-03-03T11:20:00Z'),
    },
    {
      id: '2e9b6f81-4a3d-4c75-b0e8-1c7a5d3f8b06',
      trackingCode: 'LTK-0006-ES',
      destinationHub: 'Zaragoza - Plaza',
      weightKg: 15.0,
      priority: 'LOW',
      status: 'IN_TRANSIT',
      timestamp: new Date('2026-03-03T13:50:00Z'),
    },
    {
      id: 'f07a4d25-b81c-4e93-9d60-3a9e2c5b1f07',
      trackingCode: 'LTK-0007-ES',
      destinationHub: 'Málaga - Guadalhorce',
      weightKg: 2.35,
      priority: 'CRITICAL',
      status: 'REJECTED',
      timestamp: new Date('2026-03-04T08:00:00Z'),
    },
    {
      id: '5c1e8a97-3f64-4b28-a7d5-9e0b4f6a2d08',
      trackingCode: 'LTK-0008-ES',
      destinationHub: 'A Coruña - Sabón',
      weightKg: 9.9,
      priority: 'STANDARD',
      status: 'INSPECTED',
      timestamp: new Date('2026-03-04T12:25:00Z'),
    },
  ];
  return Object.freeze(packages.map((p) => Object.freeze(p)));
}

/**
 * Estado privado del módulo; el array nunca se muta, solo se reemplaza por una
 * copia nueva en `updateStatus`.
 */
let state: readonly WarehousePackage[] = createMock();
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): readonly WarehousePackage[] {
  return state;
}

/** Cambia el estado de un paquete sin mutar; un id inexistente no hace nada. */
export function updateStatus(id: string, newStatus: PackageStatus): void {
  if (!state.some((p) => p.id === id)) {
    return;
  }
  state = Object.freeze(state.map((p) => (p.id === id ? Object.freeze({ ...p, status: newStatus }) : p)));
  listeners.forEach((listener) => listener());
}

/** Restablece el mock inicial (uso en tests). */
export function resetStore(): void {
  state = createMock();
  listeners.forEach((listener) => listener());
}

/** Hook de lectura reactiva de los paquetes. */
export function usePackages(): readonly WarehousePackage[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
