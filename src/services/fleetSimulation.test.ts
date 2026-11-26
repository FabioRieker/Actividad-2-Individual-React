import { describe, expect, test } from 'vitest';

import type { WarehousePackage } from '../models/package.model';

import {
  CENTER_HUB,
  HUBS,
  SPAIN_OUTLINE,
  cycleDuration,
  ease,
  hubByName,
  pointAlong,
  routeBetween,
  routeForHub,
  simulate,
  summarizeHubs,
  transitProgress,
} from './fleetSimulation';

function pkg(id: string, hub: string, status: WarehousePackage['status']): WarehousePackage {
  return {
    id,
    trackingCode: `LTK-${id}-ES`,
    destinationHub: hub,
    weightKg: 1,
    priority: 'STANDARD',
    status,
    timestamp: new Date('2026-03-02T08:00:00Z'),
  };
}

const BARCELONA = 'Barcelona - El Prat';

describe('geometria', () => {
  test('el contorno solo usa segmentos a 0, 45 y 90 grados', () => {
    SPAIN_OUTLINE.forEach((a, i) => {
      const b = SPAIN_OUTLINE[(i + 1) % SPAIN_OUTLINE.length];
      if (!b) throw new Error('contorno vacío');
      const dx = Math.abs(b.x - a.x);
      const dy = Math.abs(b.y - a.y);
      expect(dx === 0 || dy === 0 || dx === dy).toBe(true);
    });
  });

  test('las rutas van del centro al hub con tramos a 0, 45 y 90 grados', () => {
    for (const hub of HUBS) {
      const route = routeForHub(hub);
      expect(route[0]).toEqual(CENTER_HUB.point);
      expect(route[route.length - 1]).toEqual(hub.point);
      route.forEach((a, i) => {
        const b = route[i + 1];
        if (!b) return;
        const dx = Math.abs(b.x - a.x);
        const dy = Math.abs(b.y - a.y);
        expect(dx === 0 || dy === 0 || dx === dy).toBe(true);
      });
    }
  });

  test('pointAlong recorre la ruta de extremo a extremo', () => {
    const route = routeBetween({ x: 0, y: 0 }, { x: 100, y: 40 });
    expect(pointAlong(route, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAlong(route, 1)).toEqual({ x: 100, y: 40 });
    const half = pointAlong(route, 0.5);
    expect(half.y).toBeGreaterThan(0);
    expect(half.x).toBeGreaterThan(0);
    expect(pointAlong([], 0.5)).toEqual({ x: 0, y: 0 });
  });

  test('ease es monótona y sin rebote', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5);
    let previous = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const value = ease(t);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  test('todos los hubs del mock existen', () => {
    expect(hubByName(BARCELONA)?.short).toBe('BCN');
    expect(hubByName('Inexistente')).toBeUndefined();
    expect(HUBS.filter((h) => h.isCenter)).toHaveLength(1);
  });
});

describe('simulate', () => {
  test('el ciclo dura entre 12 y 20 s y es periódico', () => {
    const id = 'abc';
    const duration = cycleDuration(id);
    expect(duration).toBeGreaterThanOrEqual(12000);
    expect(duration).toBeLessThanOrEqual(20000);
    expect(transitProgress(id, 5000)).toBeCloseTo(transitProgress(id, 5000 + duration));
    const progress = transitProgress(id, 0);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThan(1);
  });

  test('en tránsito: la posición está sobre la ruta y avanza con el tiempo', () => {
    const packages = [pkg('1', BARCELONA, 'IN_TRANSIT')];
    const hub = hubByName(BARCELONA);
    if (!hub) throw new Error('hub');
    const route = routeForHub(hub);
    for (const t of [0, 4000, 9000, 15000]) {
      const [marker] = simulate(packages, t);
      expect(marker?.moving).toBe(true);
      expect(marker?.point).toEqual(pointAlong(route, ease(transitProgress('1', t))));
    }
    const a = simulate(packages, 0)[0];
    const b = simulate(packages, 3000)[0];
    expect(a?.point).not.toEqual(b?.point);
  });

  test('inspeccionados quedan detenidos junto a su hub y rechazados junto al centro', () => {
    const packages = [pkg('1', BARCELONA, 'INSPECTED'), pkg('2', BARCELONA, 'REJECTED')];
    const hub = hubByName(BARCELONA);
    if (!hub) throw new Error('hub');
    const [inspected, rejected] = simulate(packages, 0);
    expect(inspected?.moving).toBe(false);
    expect(rejected?.moving).toBe(false);
    expect(Math.abs((inspected?.point.x ?? 0) - hub.point.x)).toBeLessThan(40);
    expect(Math.abs((rejected?.point.x ?? 0) - CENTER_HUB.point.x)).toBeLessThan(60);
    expect(simulate(packages, 5000)[0]?.point).toEqual(inspected?.point);
  });

  test('los paquetes de un mismo grupo no se solapan', () => {
    const packages = [pkg('1', BARCELONA, 'INSPECTED'), pkg('2', BARCELONA, 'INSPECTED')];
    const [a, b] = simulate(packages, 0);
    expect(a?.point).not.toEqual(b?.point);
  });

  test('ignora paquetes de hubs desconocidos', () => {
    expect(simulate([pkg('1', 'Nowhere', 'IN_TRANSIT')], 0)).toHaveLength(0);
  });

  test('summarizeHubs cuenta por estado', () => {
    const packages = [
      pkg('1', BARCELONA, 'INSPECTED'),
      pkg('2', BARCELONA, 'IN_TRANSIT'),
      pkg('3', BARCELONA, 'REJECTED'),
    ];
    const summary = summarizeHubs(packages).find((s) => s.hub.name === BARCELONA);
    expect(summary).toMatchObject({ transit: 1, inspected: 1, rejected: 1, total: 3 });
  });
});
