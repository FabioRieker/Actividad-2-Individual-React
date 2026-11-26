import { IonButton, IonIcon } from '@ionic/react';
import {
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  locationOutline,
  removeCircleOutline,
  scaleOutline,
  timeOutline,
} from 'ionicons/icons';
import { memo } from 'react';

import type { PackagePriority, PackageStatus, StatusChangeEvent, WarehousePackage } from '../models/package.model';
import './PackageCard.css';

interface PackageCardProps {
  readonly pkg: WarehousePackage;
  readonly onStatusChange: (event: StatusChangeEvent) => void;
}

interface BadgeInfo {
  readonly label: string;
  readonly icon: string;
  readonly modifier: string;
}

const STATUS_INFO: Record<PackageStatus, BadgeInfo & { readonly dataStatus: string }> = {
  IN_TRANSIT: { label: 'En tránsito', icon: timeOutline, modifier: 'transit', dataStatus: 'transit' },
  INSPECTED: { label: 'Inspeccionado', icon: checkmarkCircleOutline, modifier: 'inspected', dataStatus: 'inspected' },
  REJECTED: { label: 'Rechazado', icon: closeCircleOutline, modifier: 'rejected', dataStatus: 'rejected' },
};

const PRIORITY_INFO: Record<PackagePriority, BadgeInfo> = {
  CRITICAL: { label: 'Prioridad alta', icon: arrowUpCircleOutline, modifier: 'high' },
  STANDARD: { label: 'Prioridad media', icon: removeCircleOutline, modifier: 'medium' },
  LOW: { label: 'Prioridad baja', icon: arrowDownCircleOutline, modifier: 'low' },
};

const weightFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' });

function PackageCardComponent({ pkg, onStatusChange }: PackageCardProps) {
  const status = STATUS_INFO[pkg.status];
  const priority = PRIORITY_INFO[pkg.priority];
  const emit = (newStatus: PackageStatus): void => {
    if (pkg.status !== newStatus) onStatusChange({ id: pkg.id, newStatus });
  };
  const titleId = `code-${pkg.id}`;

  return (
    <article
      className={`lt-card lt-card--${status.modifier}`}
      data-status={status.dataStatus}
      aria-labelledby={titleId}
    >
      <header className="lt-card__head">
        <h2 className="lt-card__code" id={titleId}>
          {pkg.trackingCode}
        </h2>
        <span className={`lt-chip lt-chip--status-${status.modifier}`}>
          <IonIcon icon={status.icon} aria-hidden="true" />
          {status.label}
        </span>
      </header>
      <ul className="lt-card__meta">
        <li>
          <IonIcon icon={locationOutline} aria-hidden="true" />
          <span>
            Destino: <strong>{pkg.destinationHub}</strong>
          </span>
        </li>
        <li>
          <IonIcon icon={scaleOutline} aria-hidden="true" />
          <span>
            Peso: <strong>{weightFormat.format(pkg.weightKg)} kg</strong>
          </span>
        </li>
        <li>
          <IonIcon icon={timeOutline} aria-hidden="true" />
          <span>
            Registrado: <time dateTime={pkg.timestamp.toISOString()}>{dateFormat.format(pkg.timestamp)}</time>
          </span>
        </li>
      </ul>
      <div className="lt-chips">
        <span className={`lt-chip lt-chip--priority-${priority.modifier}`}>
          <IonIcon icon={priority.icon} aria-hidden="true" />
          {priority.label}
        </span>
      </div>
      <div className="lt-card__actions">
        <IonButton
          className="lt-btn-inspect"
          aria-label={`Marcar ${pkg.trackingCode} como inspeccionado`}
          disabled={pkg.status === 'INSPECTED'}
          onClick={() => emit('INSPECTED')}
        >
          <IonIcon slot="icon-only" icon={checkmarkCircleOutline} aria-hidden="true" />
        </IonButton>
        <IonButton
          className="lt-btn-reject"
          fill="outline"
          aria-label={`Marcar ${pkg.trackingCode} como rechazado`}
          disabled={pkg.status === 'REJECTED'}
          onClick={() => emit('REJECTED')}
        >
          <IonIcon slot="icon-only" icon={closeCircleOutline} aria-hidden="true" />
        </IonButton>
      </div>
    </article>
  );
}

export const PackageCard = memo(PackageCardComponent);
