import {
  IonButton,
  IonContent,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
} from '@ionic/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { PackageCard } from '../components/PackageCard';
import { useDebouncedSearchTerm } from '../hooks/useDebouncedSearchTerm';
import type { PackageStatus, PriorityFilter, StatusChangeEvent } from '../models/package.model';
import { updateStatus, usePackages } from '../services/packageStore';
import './Home.css';

const PRIORITY_OPTIONS: readonly { readonly value: PriorityFilter; readonly label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'CRITICAL', label: 'Alta' },
  { value: 'STANDARD', label: 'Media' },
  { value: 'LOW', label: 'Baja' },
];

function isPriorityFilter(value: unknown): value is PriorityFilter {
  return PRIORITY_OPTIONS.some((option) => option.value === value);
}

const STATUS_ANNOUNCEMENT: Record<PackageStatus, string> = {
  IN_TRANSIT: 'en tránsito',
  INSPECTED: 'inspeccionado',
  REJECTED: 'rechazado',
};

const SEARCH_LABEL = 'Buscar código o destino';

/**
 * Aplica el cambio dentro de una View Transition (fundido corto) cuando el navegador la soporta
 * y el usuario no pide movimiento reducido; si no, lo aplica directamente.
 */
function runWithViewTransition(update: () => void): void {
  const reduceMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('startViewTransition' in document)) {
    update();
    return;
  }
  document.startViewTransition(() => {
    flushSync(update);
  });
}

function percentage(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

const Home: React.FC = () => {
  const searchbarRef = useRef<HTMLIonSearchbarElement>(null);
  const packages = usePackages();
  const [query, setQuery] = useState('');
  const [term, setSearchInput] = useDebouncedSearchTerm();
  const [priority, setPriority] = useState<PriorityFilter>('ALL');
  const [announcement, setAnnouncement] = useState('');

  const visible = useMemo(() => {
    return packages.filter(
      (p) =>
        (priority === 'ALL' || p.priority === priority) &&
        (term === '' || p.trackingCode.toLowerCase().includes(term) || p.destinationHub.toLowerCase().includes(term)),
    );
  }, [packages, term, priority]);

  const kpis = useMemo(
    () => ({
      transit: packages.filter((p) => p.status === 'IN_TRANSIT').length,
      inspected: packages.filter((p) => p.status === 'INSPECTED').length,
      rejected: packages.filter((p) => p.status === 'REJECTED').length,
    }),
    [packages],
  );

  const clearFilters = useCallback((): void => {
    setQuery('');
    setSearchInput('');
    setPriority('ALL');
  }, [setSearchInput]);

  // Ionic fija aria-label="search text" en el input interno y no lo reenvía desde el host:
  // se sustituye por el mismo texto que describe el campo para que el nombre accesible esté en español.
  useEffect(() => {
    let active = true;
    void customElements
      .whenDefined('ion-searchbar')
      .then(() => searchbarRef.current?.getInputElement())
      .then((input) => {
        if (active) input?.setAttribute('aria-label', SEARCH_LABEL);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleStatusChange = useCallback(
    (e: StatusChangeEvent): void => {
      const target = packages.find((p) => p.id === e.id);
      runWithViewTransition(() => {
        updateStatus(e.id, e.newStatus);
        if (target && target.status !== e.newStatus) {
          setAnnouncement(`${target.trackingCode} marcado como ${STATUS_ANNOUNCEMENT[e.newStatus]}`);
        }
      });
    },
    [packages],
  );

  const total = packages.length;
  const kpiCells: readonly {
    readonly key: string;
    readonly label: string;
    readonly value: number;
    readonly bar: 'total' | PackageStatus;
  }[] = [
    { key: 'total', label: 'Total', value: total, bar: 'total' },
    { key: 'transit', label: 'En tránsito', value: kpis.transit, bar: 'IN_TRANSIT' },
    { key: 'inspected', label: 'Inspeccionados', value: kpis.inspected, bar: 'INSPECTED' },
    { key: 'rejected', label: 'Rechazados', value: kpis.rejected, bar: 'REJECTED' },
  ];

  return (
    <IonPage>
      <IonContent fullscreen className="lt-content">
        <div className="lt-dock lt-glass lt-glass--strong">
          <header className="lt-brand">
            <svg className="lt-brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
              <rect width="32" height="32" rx="9" />
              <path d="M16 6.8 24.6 11.4v9.2L16 25.2 7.4 20.6v-9.2z" />
              <path d="M7.8 11.6 16 16l8.2-4.4M16 16v9" />
            </svg>
            <div className="lt-brand__text">
              <p className="lt-brand__name">LogiTrack Express</p>
              <p className="lt-brand__tag">Recepción, inspección y clasificación de paquetes.</p>
            </div>
          </header>
          <div className="lt-controls" role="search">
            <IonSearchbar
              ref={searchbarRef}
              debounce={0}
              aria-label={SEARCH_LABEL}
              placeholder="Buscar código o destino"
              value={query}
              onIonInput={(e) => {
                const value = e.detail.value ?? '';
                setQuery(value);
                setSearchInput(value);
              }}
            />
            <IonSegment
              aria-label="Filtrar por prioridad"
              value={priority}
              onIonChange={(e) => {
                const value = e.detail.value;
                if (isPriorityFilter(value)) setPriority(value);
              }}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <IonSegmentButton key={option.value} value={option.value}>
                  <IonLabel>{option.label}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
          </div>
        </div>
        <main className="lt-main">
          <h1 className="lt-sr-only">Listado de paquetes</h1>
          <div className="lt-overview">
            <ul className="lt-kpis" aria-label="Resumen por estado">
              {kpiCells.map((cell) => (
                <li key={cell.key} className={`lt-kpi lt-kpi--${cell.key} lt-glass`}>
                  <span className="lt-kpi__label">
                    <span className="lt-kpi__dot" aria-hidden="true" />
                    {cell.label}
                  </span>
                  <span className="lt-kpi__value">{cell.value}</span>
                  {cell.bar === 'total' ? (
                    <span className="lt-meter lt-meter--stack" aria-hidden="true">
                      {kpis.transit > 0 && (
                        <span className="lt-meter__seg lt-meter__seg--transit" style={{ flexGrow: kpis.transit }} />
                      )}
                      {kpis.inspected > 0 && (
                        <span className="lt-meter__seg lt-meter__seg--inspected" style={{ flexGrow: kpis.inspected }} />
                      )}
                      {kpis.rejected > 0 && (
                        <span className="lt-meter__seg lt-meter__seg--rejected" style={{ flexGrow: kpis.rejected }} />
                      )}
                    </span>
                  ) : (
                    <span className="lt-meter" aria-hidden="true">
                      <span
                        className="lt-meter__fill"
                        style={{ transform: `scaleX(${total === 0 ? 0 : cell.value / total})` }}
                      />
                    </span>
                  )}
                  <span className="lt-kpi__meta">
                    {cell.bar === 'total'
                      ? `${percentage(kpis.inspected, total)} % inspeccionado`
                      : `${percentage(cell.value, total)} % del total`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div role="status" className="lt-sr-only">
            {announcement}
          </div>
          <p className="lt-result-count" role="status" aria-live="polite">
            {visible.length === 1 ? '1 paquete mostrado' : `${visible.length} paquetes mostrados`}
          </p>
          {visible.length === 0 ? (
            <div className="lt-empty lt-glass">
              <h2 className="lt-empty__title">Sin paquetes</h2>
              <p className="lt-empty__text">
                Ningún paquete coincide con la búsqueda o el filtro. Prueba con otro código o selecciona Todas.
              </p>
              <IonButton fill="outline" onClick={clearFilters}>
                Limpiar filtros
              </IonButton>
            </div>
          ) : (
            <IonList className="lt-grid" lines="none" role="list" aria-label="Paquetes">
              {visible.map((pkg) => (
                <IonItemSliding key={pkg.id}>
                  <IonItem lines="none" className="lt-item">
                    <PackageCard pkg={pkg} onStatusChange={handleStatusChange} />
                  </IonItem>
                  <IonItemOptions side="end">
                    <IonItemOption
                      className="lt-option-inspect"
                      onClick={() => handleStatusChange({ id: pkg.id, newStatus: 'INSPECTED' })}
                    >
                      Inspeccionar
                    </IonItemOption>
                    <IonItemOption
                      className="lt-option-reject"
                      onClick={() => handleStatusChange({ id: pkg.id, newStatus: 'REJECTED' })}
                    >
                      Rechazar
                    </IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              ))}
            </IonList>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Home;
