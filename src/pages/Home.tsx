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
import { useFocusHeading } from '../hooks/useFocusHeading';
import { usePageEnter } from '../hooks/usePageEnter';
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

/** Cifra de un indicador: al cambiar, el digito se «teclea» con un breve desplazamiento vertical. */
function KpiValue({ value }: { readonly value: number }) {
  const [shown, setShown] = useState(value);
  const [changed, setChanged] = useState(false);
  if (shown !== value) {
    setShown(value);
    setChanged(true);
  }
  return (
    <span key={value} className={`lt-kpi__value${changed ? ' is-tick' : ''}`}>
      {value}
    </span>
  );
}

const Home: React.FC = () => {
  const searchbarRef = useRef<HTMLIonSearchbarElement>(null);
  const headingRef = useFocusHeading();
  const mainRef = usePageEnter<HTMLElement>();
  const [intro, setIntro] = useState(true);
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

  // La entrada escalonada de la lista solo se reproduce en la primera carga.
  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

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
  const kpiCells: readonly { readonly key: string; readonly label: string; readonly value: number }[] = [
    { key: 'total', label: 'Total', value: total },
    { key: 'transit', label: 'En tránsito', value: kpis.transit },
    { key: 'inspected', label: 'Inspeccionados', value: kpis.inspected },
    { key: 'rejected', label: 'Rechazados', value: kpis.rejected },
  ];
  const countLabel =
    visible.length === total
      ? total === 1
        ? '1 paquete'
        : `${total} paquetes`
      : `${visible.length} de ${total} ${total === 1 ? 'paquete' : 'paquetes'}`;

  return (
    <IonPage>
      <IonContent fullscreen className="lt-content">
        <header className="lt-topbar">
          <p className="lt-brand__name">LogiTrack Express</p>
          <p className="lt-topbar__dock">
            <span>Muelle</span>
            <span className="lt-topbar__dock-no">02</span>
          </p>
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
        <main className="lt-main" ref={mainRef}>
          <h1 className="lt-sr-only" ref={headingRef} tabIndex={-1}>
            Listado de paquetes
          </h1>
          <div className="lt-overview">
            <ul className="lt-kpis" aria-label="Resumen por estado">
              {kpiCells.map((cell) => (
                <li key={cell.key} className={`lt-kpi lt-kpi--${cell.key}`}>
                  <KpiValue value={cell.value} />
                  <span className="lt-kpi__label">{cell.label}</span>
                </li>
              ))}
            </ul>
            <span className="lt-meter" aria-hidden="true">
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
          </div>
          <div role="status" className="lt-sr-only">
            {announcement}
          </div>
          <p className="lt-result-count" role="status" aria-live="polite">
            {countLabel}
          </p>
          {visible.length === 0 ? (
            <div className="lt-empty">
              <h2 className="lt-empty__title">Sin paquetes</h2>
              <p className="lt-empty__text">
                Ningún paquete coincide con la búsqueda o el filtro. Prueba con otro código o selecciona Todas.
              </p>
              <IonButton fill="outline" className="lt-btn-outline" onClick={clearFilters}>
                Limpiar filtros
              </IonButton>
            </div>
          ) : (
            <IonList
              className={`lt-grid${intro ? ' lt-grid--intro' : ''}`}
              lines="none"
              role="list"
              aria-label="Paquetes"
            >
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
