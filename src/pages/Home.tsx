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
import { useCallback, useMemo, useState } from 'react';

import { PackageCard } from '../components/PackageCard';
import { useDebouncedSearchTerm } from '../hooks/useDebouncedSearchTerm';
import type { PriorityFilter, StatusChangeEvent } from '../models/package.model';
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

const Home: React.FC = () => {
  const packages = usePackages();
  const [query, setQuery] = useState('');
  const [term, setSearchInput] = useDebouncedSearchTerm();
  const [priority, setPriority] = useState<PriorityFilter>('ALL');

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

  const handleStatusChange = useCallback((e: StatusChangeEvent): void => {
    updateStatus(e.id, e.newStatus);
  }, []);

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
              debounce={0}
              aria-label="Buscar paquete por código o destino"
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
                    <IonItemOption className="lt-option-inspect" onClick={() => updateStatus(pkg.id, 'INSPECTED')}>
                      Inspeccionar
                    </IonItemOption>
                    <IonItemOption className="lt-option-reject" onClick={() => updateStatus(pkg.id, 'REJECTED')}>
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
