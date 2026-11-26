import {
  IonContent,
  IonHeader,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useMemo, useState } from 'react';

import type { PriorityFilter } from '../models/package.model';
import { usePackages } from '../services/packageStore';
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
  const [priority, setPriority] = useState<PriorityFilter>('ALL');

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return packages.filter(
      (p) =>
        (priority === 'ALL' || p.priority === priority) &&
        (term === '' || p.trackingCode.toLowerCase().includes(term) || p.destinationHub.toLowerCase().includes(term)),
    );
  }, [packages, query, priority]);

  return (
    <IonPage>
      <IonHeader className="lt-header">
        <IonToolbar>
          <IonTitle>LogiTrack Express</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="lt-content">
        <div className="lt-controls">
          <div className="lt-controls__inner">
            <IonSearchbar
              aria-label="Buscar paquete por código o destino"
              placeholder="Buscar código o destino"
              value={query}
              onIonInput={(e) => setQuery(e.detail.value ?? '')}
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
          <p>Recepción, inspección y clasificación de paquetes.</p>
          <p>{visible.length} paquetes registrados</p>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Home;
