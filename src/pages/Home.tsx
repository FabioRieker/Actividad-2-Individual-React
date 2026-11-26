import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
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
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { checkmarkCircleOutline, closeCircleOutline, cubeOutline, fileTrayOutline, timeOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PackageCard } from '../components/PackageCard';
import { useDebouncedSearchTerm } from '../hooks/useDebouncedSearchTerm';
import { useFocusHeading } from '../hooks/useFocusHeading';
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

const Home: React.FC = () => {
  const searchbarRef = useRef<HTMLIonSearchbarElement>(null);
  const headingRef = useFocusHeading();
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
      updateStatus(e.id, e.newStatus);
      if (target && target.status !== e.newStatus) {
        setAnnouncement(`${target.trackingCode} marcado como ${STATUS_ANNOUNCEMENT[e.newStatus]}`);
      }
    },
    [packages],
  );

  return (
    <IonPage>
      <IonHeader className="lt-header">
        <IonToolbar>
          <IonTitle>LogiTrack Express</IonTitle>
        </IonToolbar>
        <p className="lt-brand__tag">Recepción, inspección y clasificación de paquetes.</p>
        <ul className="lt-kpis" aria-label="Resumen por estado">
          <li className="lt-kpi lt-kpi--total">
            <span className="lt-kpi__value">{packages.length}</span>
            <span className="lt-kpi__label">
              <IonIcon icon={cubeOutline} aria-hidden="true" />
              Total
            </span>
          </li>
          <li className="lt-kpi lt-kpi--transit">
            <span className="lt-kpi__value">{kpis.transit}</span>
            <span className="lt-kpi__label">
              <IonIcon icon={timeOutline} aria-hidden="true" />
              En tránsito
            </span>
          </li>
          <li className="lt-kpi lt-kpi--inspected">
            <span className="lt-kpi__value">{kpis.inspected}</span>
            <span className="lt-kpi__label">
              <IonIcon icon={checkmarkCircleOutline} aria-hidden="true" />
              Inspeccionados
            </span>
          </li>
          <li className="lt-kpi lt-kpi--rejected">
            <span className="lt-kpi__value">{kpis.rejected}</span>
            <span className="lt-kpi__label">
              <IonIcon icon={closeCircleOutline} aria-hidden="true" />
              Rechazados
            </span>
          </li>
        </ul>
      </IonHeader>
      <IonContent fullscreen className="lt-content">
        <div className="lt-controls">
          <div className="lt-controls__inner" role="search">
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
          <h1 className="lt-sr-only" ref={headingRef} tabIndex={-1}>
            Listado de paquetes
          </h1>
          <div role="status" className="lt-sr-only">
            {announcement}
          </div>
          <p className="lt-result-count" role="status" aria-live="polite">
            {visible.length === 1 ? '1 paquete mostrado' : `${visible.length} paquetes mostrados`}
          </p>
          {visible.length === 0 ? (
            <div className="lt-empty">
              <IonIcon icon={fileTrayOutline} aria-hidden="true" />
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
