import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useMemo } from 'react';

import { useFocusHeading } from '../hooks/useFocusHeading';
import { usePageEnter } from '../hooks/usePageEnter';
import type { PackagePriority, WarehousePackage } from '../models/package.model';
import { usePackages } from '../services/packageStore';
import { formatShare, percentOf, PRIORITY_LABEL } from '../utils/labels';
import './PageShell.css';
import './Summary.css';

interface Bucket {
  readonly label: string;
  readonly count: number;
}

const PRIORITY_ORDER: readonly PackagePriority[] = ['CRITICAL', 'STANDARD', 'LOW'];

function countBy(packages: readonly WarehousePackage[], key: (p: WarehousePackage) => string): readonly Bucket[] {
  const counts = new Map<string, number>();
  packages.forEach((p) => {
    const k = key(p);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

const weightFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

interface BarListProps {
  readonly label: string;
  readonly buckets: readonly Bucket[];
  readonly total: number;
  readonly tone: 'signal' | 'concrete';
}

function BarList({ label, buckets, total, tone }: BarListProps) {
  return (
    <ul className={`lt-bars lt-bars--${tone}`} aria-label={label}>
      {buckets.map((b) => (
        <li key={b.label}>
          <span className="lt-bars__name">{b.label}</span>
          <span className="lt-bars__track" aria-hidden="true">
            <span className="lt-bars__fill" style={{ width: `${percentOf(b.count, total)}%` }} />
          </span>
          <span className="lt-bars__value">{formatShare(b.count, total)}</span>
        </li>
      ))}
    </ul>
  );
}

const Summary: React.FC = () => {
  const headingRef = useFocusHeading();
  const mainRef = usePageEnter<HTMLElement>();
  const packages = usePackages();
  const total = packages.length;

  const stats = useMemo(() => {
    const count = (status: WarehousePackage['status']): number => packages.filter((p) => p.status === status).length;
    const byHub = countBy(packages, (p) => p.destinationHub);
    const byPriority = PRIORITY_ORDER.map((priority) => ({
      label: PRIORITY_LABEL[priority],
      count: packages.filter((p) => p.priority === priority).length,
    }));
    return {
      transit: count('IN_TRANSIT'),
      inspected: count('INSPECTED'),
      rejected: count('REJECTED'),
      weight: packages.reduce((sum, p) => sum + p.weightKg, 0),
      byHub,
      byPriority,
    };
  }, [packages]);

  return (
    <IonPage className="lt-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <h1 className="lt-page__title" ref={headingRef} tabIndex={-1}>
              Resumen
            </h1>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="lt-page__content">
        <main className="lt-page__main" ref={mainRef}>
          <ul className="lt-sum-kpis" aria-label="Indicadores">
            <li className="lt-sum-kpi">
              <span className="lt-sum-kpi__value">{total}</span>
              <span className="lt-sum-kpi__label">Paquetes totales</span>
            </li>
            <li className="lt-sum-kpi">
              <span className="lt-sum-kpi__value">{stats.transit}</span>
              <span className="lt-sum-kpi__label">En tránsito</span>
            </li>
            <li className="lt-sum-kpi">
              <span className="lt-sum-kpi__value">{stats.inspected}</span>
              <span className="lt-sum-kpi__label">Inspeccionados</span>
            </li>
            <li className="lt-sum-kpi">
              <span className="lt-sum-kpi__value">{stats.rejected}</span>
              <span className="lt-sum-kpi__label">Rechazados</span>
            </li>
            <li className="lt-sum-kpi">
              <span className="lt-sum-kpi__value">{percentFormat.format(percentOf(stats.inspected, total))} %</span>
              <span className="lt-sum-kpi__label">Inspeccionado</span>
            </li>
            <li className="lt-sum-kpi">
              <span className="lt-sum-kpi__value">{weightFormat.format(stats.weight)} kg</span>
              <span className="lt-sum-kpi__label">Peso total</span>
            </li>
          </ul>
          <section className="lt-panel" aria-labelledby="sum-hub">
            <h2 className="lt-panel__title" id="sum-hub">
              Paquetes por destino
            </h2>
            <BarList label="Paquetes por destino" buckets={stats.byHub} total={total} tone="signal" />
          </section>
          <section className="lt-panel" aria-labelledby="sum-prio">
            <h2 className="lt-panel__title" id="sum-prio">
              Paquetes por prioridad
            </h2>
            <BarList label="Paquetes por prioridad" buckets={stats.byPriority} total={total} tone="concrete" />
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Summary;
