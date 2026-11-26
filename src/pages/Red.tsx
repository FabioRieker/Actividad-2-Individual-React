import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonViewDidEnter,
  useIonViewWillLeave,
} from '@ionic/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PackageLink } from '../components/PackageLink';
import { useAnimationClock } from '../hooks/useAnimationClock';
import { useFocusHeading } from '../hooks/useFocusHeading';
import { usePageEnter } from '../hooks/usePageEnter';
import type { PackageStatus } from '../models/package.model';
import {
  CENTER_HUB,
  HUBS,
  SPAIN_OUTLINE,
  VIEWBOX,
  routeForHub,
  simulate,
  summarizeHubs,
  type HubDef,
  type Point,
} from '../services/fleetSimulation';
import { usePackages } from '../services/packageStore';
import { STATUS_LABEL } from '../utils/labels';
import './PageShell.css';
import './Red.css';

type LabelPlacement = { readonly dx: number; readonly dy: number; readonly anchor: 'start' | 'middle' | 'end' };

/** Posicion del rotulo de cada hub respecto a su marca (evita rutas y filas de paquetes aparcados). */
const LABELS: Record<string, LabelPlacement> = {
  barcelona: { dx: 0, dy: -24, anchor: 'middle' },
  valencia: { dx: 24, dy: 7, anchor: 'start' },
  sevilla: { dx: -24, dy: 7, anchor: 'end' },
  bilbao: { dx: 0, dy: -24, anchor: 'middle' },
  zaragoza: { dx: 24, dy: 7, anchor: 'start' },
  malaga: { dx: 24, dy: 7, anchor: 'start' },
  coruna: { dx: 0, dy: -24, anchor: 'middle' },
};

const STATUS_CLASS: Record<PackageStatus, string> = {
  IN_TRANSIT: 'transit',
  INSPECTED: 'inspected',
  REJECTED: 'rejected',
};

const weightFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function pointsAttr(points: readonly Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function plural(count: number): string {
  return count === 1 ? '1 paquete' : `${count} paquetes`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function cityOf(hub: HubDef): string {
  return hub.name.split(' - ')[0] ?? hub.name;
}

const SPAIN_POINTS = pointsAttr(SPAIN_OUTLINE);
const SNAPSHOT_TIME = 0;

const Red: React.FC = () => {
  const headingRef = useFocusHeading();
  const mainRef = usePageEnter<HTMLDivElement>();
  const packages = usePackages();
  const [active, setActive] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const hubButtons = useRef(new Map<string, HTMLButtonElement>());
  const markerNodes = useRef(new Map<string, SVGGElement>());
  const panelRef = useRef<HTMLElement>(null);
  const packagesRef = useRef(packages);

  useIonViewDidEnter(() => setActive(true));
  useIonViewWillLeave(() => setActive(false));

  useEffect(() => {
    packagesRef.current = packages;
  });

  const summaries = useMemo(() => summarizeHubs(packages), [packages]);
  const markers = useMemo(() => simulate(packages, SNAPSHOT_TIME), [packages]);
  const selectedHub = HUBS.find((hub) => hub.id === selectedId);
  const selectedPackages = selectedHub ? packages.filter((p) => p.destinationHub === selectedHub.name) : [];

  // Las marcas en transito se mueven directamente en el DOM (sin re-render por fotograma).
  const onFrame = useCallback((time: number): void => {
    for (const marker of simulate(packagesRef.current, time)) {
      if (!marker.moving) continue;
      const node = markerNodes.current.get(marker.id);
      if (!node) continue;
      node.style.transform = `translate(${marker.point.x}px, ${marker.point.y}px)`;
      const trail = node.querySelector('line');
      if (trail) {
        trail.setAttribute('x1', String(marker.trail.x - marker.point.x));
        trail.setAttribute('y1', String(marker.trail.y - marker.point.y));
      }
    }
  }, []);
  useAnimationClock(onFrame, active);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const close = useCallback((): void => {
    setSelectedId((current) => {
      if (current) hubButtons.current.get(current)?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedId, close]);

  useEffect(() => {
    const panel = panelRef.current;
    if (selectedId && panel && typeof panel.scrollIntoView === 'function') {
      panel.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedId]);

  const selectedRoute = selectedHub ? pointsAttr(routeForHub(selectedHub)) : '';

  return (
    <IonPage className="lt-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <h1 className="lt-page__title" ref={headingRef} tabIndex={-1}>
              Red
            </h1>
          </IonTitle>
          <div slot="end" className="lt-red__status">
            <span className="lt-tag lt-tag--plain lt-red__sim">Simulación</span>
            <span className="lt-red__clock">{clock}</span>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="lt-page__content">
        <main className="lt-page__main" ref={mainRef}>
          <div className="lt-red-wrap">
            <div className="lt-red">
              <section className="lt-red__map-block" aria-label="Mapa de la red">
                <div className="lt-red__stage" data-selected={selectedHub ? 'true' : 'false'}>
                  <svg
                    className="lt-red__svg"
                    viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
                    role="img"
                    aria-labelledby="red-title red-desc"
                  >
                    <title id="red-title">Mapa esquemático de la red logística</title>
                    <desc id="red-desc">
                      Plano simplificado de la España peninsular con el centro de clasificación de Madrid y siete hubs
                      de destino. La tabla Estado de la red recoge los mismos datos.
                    </desc>
                    <polygon className="lt-red__land" points={SPAIN_POINTS} />
                    {HUBS.filter((hub) => !hub.isCenter).map((hub) => (
                      <polyline
                        key={hub.id}
                        className={`lt-red__route${selectedId === hub.id ? ' is-selected' : ''}`}
                        points={pointsAttr(routeForHub(hub))}
                        pathLength={1}
                      />
                    ))}
                    {selectedHub && !selectedHub.isCenter ? (
                      <g key={selectedHub.id} className="lt-red__active">
                        <polyline className="lt-red__active-casing" points={selectedRoute} pathLength={1} />
                        <polyline className="lt-red__active-line" points={selectedRoute} pathLength={1} />
                      </g>
                    ) : null}
                    {HUBS.map((hub) => {
                      const label = LABELS[hub.id];
                      return (
                        <g
                          key={hub.id}
                          className={`lt-red__hub${hub.isCenter ? ' is-center' : ''}${selectedId === hub.id ? ' is-selected' : ''}`}
                        >
                          {hub.isCenter ? (
                            <>
                              <rect
                                className="lt-red__mark lt-red__mark--center"
                                x={hub.point.x - 38}
                                y={hub.point.y - 38}
                                width={76}
                                height={76}
                              />
                              <text
                                className="lt-red__center-text"
                                x={hub.point.x}
                                y={hub.point.y - 4}
                                textAnchor="middle"
                              >
                                Centro
                              </text>
                              <text
                                className="lt-red__center-no"
                                x={hub.point.x}
                                y={hub.point.y + 26}
                                textAnchor="middle"
                              >
                                02
                              </text>
                            </>
                          ) : (
                            <>
                              <rect
                                className="lt-red__mark"
                                x={hub.point.x - 11}
                                y={hub.point.y - 11}
                                width={22}
                                height={22}
                              />
                              {label ? (
                                <>
                                  <text
                                    className="lt-red__label lt-red__label--full"
                                    x={hub.point.x + label.dx}
                                    y={hub.point.y + label.dy}
                                    textAnchor={label.anchor}
                                  >
                                    {cityOf(hub)}
                                  </text>
                                  <text
                                    className="lt-red__label lt-red__label--short"
                                    x={hub.point.x + label.dx}
                                    y={hub.point.y + label.dy}
                                    textAnchor={label.anchor}
                                  >
                                    {hub.short}
                                  </text>
                                </>
                              ) : null}
                            </>
                          )}
                        </g>
                      );
                    })}
                    {markers.map((marker) => (
                      <g
                        key={marker.id}
                        ref={(node) => {
                          if (node) markerNodes.current.set(marker.id, node);
                          else markerNodes.current.delete(marker.id);
                        }}
                        className={`lt-red__pkg lt-red__pkg--${STATUS_CLASS[marker.status]}${marker.moving ? '' : ' is-parked'}`}
                        style={{ transform: `translate(${marker.point.x}px, ${marker.point.y}px)` }}
                      >
                        <line
                          className="lt-red__trail"
                          x1={marker.trail.x - marker.point.x}
                          y1={marker.trail.y - marker.point.y}
                          x2={0}
                          y2={0}
                        />
                        <rect className="lt-red__pkg-mark" x={-7} y={-5} width={14} height={10} />
                      </g>
                    ))}
                  </svg>
                  {HUBS.map((hub) => {
                    const summary = summaries.find((s) => s.hub.id === hub.id);
                    const total = summary?.total ?? 0;
                    return (
                      <button
                        key={hub.id}
                        type="button"
                        ref={(node) => {
                          if (node) hubButtons.current.set(hub.id, node);
                          else hubButtons.current.delete(hub.id);
                        }}
                        className={`lt-red__hit${hub.isCenter ? ' is-center' : ''}`}
                        style={{
                          left: `${((hub.point.x - VIEWBOX.x) / VIEWBOX.width) * 100}%`,
                          top: `${((hub.point.y - VIEWBOX.y) / VIEWBOX.height) * 100}%`,
                        }}
                        aria-label={`${hub.name}: ${plural(total)}`}
                        aria-pressed={selectedId === hub.id}
                        onClick={() => setSelectedId((current) => (current === hub.id ? null : hub.id))}
                      />
                    );
                  })}
                </div>
                <ul className="lt-red__legend" aria-label="Leyenda">
                  <li>
                    <span className="lt-red__swatch lt-red__swatch--transit" aria-hidden="true" />
                    En tránsito
                  </li>
                  <li>
                    <span className="lt-red__swatch lt-red__swatch--inspected" aria-hidden="true" />
                    Inspeccionado
                  </li>
                  <li>
                    <span className="lt-red__swatch lt-red__swatch--rejected" aria-hidden="true" />
                    Rechazado
                  </li>
                </ul>
              </section>

              {selectedHub ? (
                <section className="lt-red__panel" ref={panelRef} aria-labelledby="red-panel-title">
                  <div className="lt-red__panel-head">
                    <h2 className="lt-red__panel-title" id="red-panel-title">
                      {selectedHub.name}
                    </h2>
                    <button type="button" className="lt-btn" onClick={close}>
                      Cerrar
                    </button>
                  </div>
                  {selectedPackages.length === 0 ? (
                    <p className="lt-muted lt-red__empty">Este hub no tiene paquetes asignados.</p>
                  ) : (
                    <ul className="lt-red__list" aria-label={`Paquetes de ${selectedHub.name}`}>
                      {selectedPackages.map((pkg) => (
                        <li key={pkg.id} className="lt-red__item" data-status={pkg.status}>
                          <span className="lt-red__item-code">
                            <PackageLink id={pkg.id} trackingCode={pkg.trackingCode} />
                          </span>
                          <span className={`lt-tag lt-tag--status-${STATUS_CLASS[pkg.status]}`}>
                            {STATUS_LABEL[pkg.status]}
                          </span>
                          <span className="lt-red__item-weight">{weightFormat.format(pkg.weightKg)} kg</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : (
                <p className="lt-red__hint lt-muted">
                  Selecciona un hub del mapa para ver sus paquetes. El centro de clasificación es {CENTER_HUB.name}.
                </p>
              )}

              <section className="lt-red__table-block" aria-labelledby="red-table-title">
                <h2 className="lt-red__table-title" id="red-table-title">
                  Estado de la red
                </h2>
                <div className="lt-red__table-wrap">
                  <table className="lt-red__table">
                    <thead>
                      <tr>
                        <th scope="col">Hub</th>
                        <th scope="col">
                          <span className="lt-red__full">En tránsito</span>
                          <span className="lt-red__short" aria-hidden="true">
                            Trán.
                          </span>
                        </th>
                        <th scope="col">
                          <span className="lt-red__full">Inspeccionados</span>
                          <span className="lt-red__short" aria-hidden="true">
                            Insp.
                          </span>
                        </th>
                        <th scope="col">
                          <span className="lt-red__full">Rechazados</span>
                          <span className="lt-red__short" aria-hidden="true">
                            Rech.
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaries.map((summary) => (
                        <tr key={summary.hub.id} className={selectedId === summary.hub.id ? 'is-selected' : undefined}>
                          <th scope="row">{summary.hub.name}</th>
                          <td>{summary.transit}</td>
                          <td>{summary.inspected}</td>
                          <td>{summary.rejected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Red;
