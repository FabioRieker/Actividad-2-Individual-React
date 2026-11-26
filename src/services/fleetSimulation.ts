import type { PackageStatus, WarehousePackage } from '../models/package.model';

/** Punto en las coordenadas del mapa (unidades del viewBox). */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface HubDef {
  readonly id: string;
  /** Texto exacto de destinationHub en los datos. */
  readonly name: string;
  /** Sigla para rotulos en contenedores estrechos. */
  readonly short: string;
  readonly point: Point;
  readonly isCenter: boolean;
}

export const VIEWBOX = { x: 30, y: 40, width: 650, height: 440 } as const;

/** Contorno esquematico de la Espana peninsular: solo segmentos a 0, 45 y 90 grados. */
export const SPAIN_OUTLINE: readonly Point[] = [
  { x: 60, y: 60 },
  { x: 300, y: 60 },
  { x: 340, y: 100 },
  { x: 560, y: 100 },
  { x: 600, y: 140 },
  { x: 600, y: 220 },
  { x: 550, y: 270 },
  { x: 550, y: 330 },
  { x: 500, y: 380 },
  { x: 440, y: 380 },
  { x: 400, y: 420 },
  { x: 300, y: 420 },
  { x: 260, y: 460 },
  { x: 220, y: 460 },
  { x: 180, y: 420 },
  { x: 180, y: 330 },
  { x: 140, y: 290 },
  { x: 140, y: 180 },
  { x: 100, y: 140 },
  { x: 60, y: 100 },
];

export const CENTER_HUB: HubDef = {
  id: 'madrid',
  name: 'Madrid - Coslada',
  short: 'MAD',
  point: { x: 330, y: 260 },
  isCenter: true,
};

export const HUBS: readonly HubDef[] = [
  CENTER_HUB,
  { id: 'barcelona', name: 'Barcelona - El Prat', short: 'BCN', point: { x: 555, y: 150 }, isCenter: false },
  { id: 'valencia', name: 'Valencia - Silla', short: 'VLC', point: { x: 535, y: 300 }, isCenter: false },
  { id: 'sevilla', name: 'Sevilla - La Rinconada', short: 'SVQ', point: { x: 250, y: 385 }, isCenter: false },
  { id: 'bilbao', name: 'Bilbao - Zamudio', short: 'BIO', point: { x: 395, y: 125 }, isCenter: false },
  { id: 'zaragoza', name: 'Zaragoza - Plaza', short: 'ZAZ', point: { x: 470, y: 205 }, isCenter: false },
  { id: 'malaga', name: 'Málaga - Guadalhorce', short: 'AGP', point: { x: 360, y: 395 }, isCenter: false },
  { id: 'coruna', name: 'A Coruña - Sabón', short: 'LCG', point: { x: 100, y: 100 }, isCenter: false },
];

export function hubByName(name: string): HubDef | undefined {
  return HUBS.find((hub) => hub.name === name);
}

/** Ruta tipo plano de metro: tramo a 45 grados y despues recto (0 o 90 grados) hasta el destino. */
export function routeBetween(from: Point, to: Point): readonly Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const diagonal = Math.min(Math.abs(dx), Math.abs(dy));
  const mid: Point = { x: from.x + Math.sign(dx) * diagonal, y: from.y + Math.sign(dy) * diagonal };
  return [from, mid, to];
}

export function routeForHub(hub: HubDef): readonly Point[] {
  return routeBetween(CENTER_HUB.point, hub.point);
}

function segmentLength(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Posicion a lo largo de la polilinea; t en [0, 1] se mide sobre la longitud total. */
export function pointAlong(route: readonly Point[], t: number): Point {
  const first = route[0];
  const last = route[route.length - 1];
  if (!first || !last) return { x: 0, y: 0 };
  let total = 0;
  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1];
    const b = route[i];
    if (a && b) total += segmentLength(a, b);
  }
  if (total === 0) return first;
  let remaining = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1];
    const b = route[i];
    if (!a || !b) continue;
    const length = segmentLength(a, b);
    if (remaining <= length && length > 0) {
      const f = remaining / length;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    remaining -= length;
  }
  return last;
}

/** Aceleracion y frenado suaves, sin rebote. */
export function ease(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
}

function hash(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h;
}

/** Duracion del ciclo centro -> hub, entre 12 y 20 s segun el paquete. */
export function cycleDuration(id: string): number {
  return 12000 + (hash(id) % 9) * 1000;
}

/** Fraccion del ciclo [0, 1) en el instante dado; cada paquete tiene su propia fase. */
export function transitProgress(id: string, timeMs: number): number {
  const duration = cycleDuration(id);
  const phase = hash(`${id}#fase`) % duration;
  return ((timeMs + phase) % duration) / duration;
}

export interface PackageMarker {
  readonly id: string;
  readonly trackingCode: string;
  readonly hubId: string;
  readonly status: PackageStatus;
  readonly point: Point;
  /** Posicion unos instantes antes: origen de la estela. */
  readonly trail: Point;
  /** true si la posicion cambia con el tiempo (paquete en transito). */
  readonly moving: boolean;
}

/** Calcula la posicion de cada paquete en el instante dado. Funcion pura. */
export function simulate(packages: readonly WarehousePackage[], timeMs: number): readonly PackageMarker[] {
  const slots = new Map<string, number>();
  const markers: PackageMarker[] = [];
  for (const pkg of packages) {
    const hub = hubByName(pkg.destinationHub);
    if (!hub) continue;
    const key = `${pkg.status === 'REJECTED' ? CENTER_HUB.id : hub.id}:${pkg.status}`;
    const slot = slots.get(key) ?? 0;
    slots.set(key, slot + 1);
    if (pkg.status === 'IN_TRANSIT' && hub.isCenter) {
      // Destino = centro de clasificacion: el paquete espera en cola bajo el cuadrado.
      const point: Point = { x: hub.point.x - 20 + slot * 14, y: hub.point.y + 62 };
      markers.push({
        id: pkg.id,
        trackingCode: pkg.trackingCode,
        hubId: hub.id,
        status: pkg.status,
        point,
        trail: point,
        moving: false,
      });
      continue;
    }
    if (pkg.status === 'IN_TRANSIT') {
      const route = routeForHub(hub);
      const progress = transitProgress(pkg.id, timeMs);
      markers.push({
        id: pkg.id,
        trackingCode: pkg.trackingCode,
        hubId: hub.id,
        status: pkg.status,
        point: pointAlong(route, ease(progress)),
        trail: pointAlong(route, ease(Math.max(0, progress - 0.04))),
        moving: true,
      });
      continue;
    }
    const base = pkg.status === 'REJECTED' ? CENTER_HUB : hub;
    const drop = base.isCenter ? 48 : 26;
    const point: Point = { x: base.point.x - 20 + slot * 14, y: base.point.y + drop };
    markers.push({
      id: pkg.id,
      trackingCode: pkg.trackingCode,
      hubId: hub.id,
      status: pkg.status,
      point,
      trail: point,
      moving: false,
    });
  }
  return markers;
}

export interface HubSummary {
  readonly hub: HubDef;
  readonly transit: number;
  readonly inspected: number;
  readonly rejected: number;
  readonly total: number;
}

export function summarizeHubs(packages: readonly WarehousePackage[]): readonly HubSummary[] {
  return HUBS.map((hub) => {
    const own = packages.filter((p) => p.destinationHub === hub.name);
    const count = (status: PackageStatus): number => own.filter((p) => p.status === status).length;
    return {
      hub,
      transit: count('IN_TRANSIT'),
      inspected: count('INSPECTED'),
      rejected: count('REJECTED'),
      total: own.length,
    };
  });
}
