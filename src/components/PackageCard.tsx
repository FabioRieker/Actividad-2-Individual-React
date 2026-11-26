import { IonButton } from '@ionic/react';
import { memo, useEffect, useRef, useState } from 'react';

import type { PackagePriority, PackageStatus, StatusChangeEvent, WarehousePackage } from '../models/package.model';

import { PackageLink } from './PackageLink';
import './PackageCard.css';

interface PackageCardProps {
  readonly pkg: WarehousePackage;
  readonly onStatusChange: (event: StatusChangeEvent) => void;
}

interface BadgeInfo {
  readonly label: string;
  readonly modifier: string;
}

const STATUS_INFO: Record<PackageStatus, BadgeInfo & { readonly dataStatus: string }> = {
  IN_TRANSIT: { label: 'En tránsito', modifier: 'transit', dataStatus: 'transit' },
  INSPECTED: { label: 'Inspeccionado', modifier: 'inspected', dataStatus: 'inspected' },
  REJECTED: { label: 'Rechazado', modifier: 'rejected', dataStatus: 'rejected' },
};

const PRIORITY_INFO: Record<PackagePriority, BadgeInfo> = {
  CRITICAL: { label: 'Alta', modifier: 'high' },
  STANDARD: { label: 'Media', modifier: 'medium' },
  LOW: { label: 'Baja', modifier: 'low' },
};

const weightFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * ion-button copia los atributos aria-* al botón nativo solo al cargar y su render los restablece al cambiar
 * el estado. Se mantiene aria-disabled del botón nativo sincronizado para que lo anuncien los lectores de pantalla.
 */
function syncAriaDisabled(host: HTMLIonButtonElement | null, disabled: boolean): () => void {
  const expected = String(disabled);
  let observer: MutationObserver | undefined;
  let frame = 0;
  let attempts = 0;
  const attach = (): void => {
    const native = host?.shadowRoot?.querySelector('button');
    if (!native) {
      // El componente se hidrata de forma asíncrona: se reintenta unos fotogramas.
      if (attempts++ < 120) frame = requestAnimationFrame(attach);
      return;
    }
    const apply = (): void => {
      if (native.getAttribute('aria-disabled') !== expected) native.setAttribute('aria-disabled', expected);
    };
    apply();
    observer = new MutationObserver(apply);
    observer.observe(native, { attributes: true, attributeFilter: ['aria-disabled'] });
  };
  attach();
  return () => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
  };
}

function PackageCardComponent({ pkg, onStatusChange }: PackageCardProps) {
  const inspectRef = useRef<HTMLIonButtonElement>(null);
  const rejectRef = useRef<HTMLIonButtonElement>(null);
  const inspected = pkg.status === 'INSPECTED';
  const rejected = pkg.status === 'REJECTED';
  useEffect(() => syncAriaDisabled(inspectRef.current, inspected), [inspected]);
  useEffect(() => syncAriaDisabled(rejectRef.current, rejected), [rejected]);
  // Al cambiar el estado se «estampa» la etiqueta (barrido) y, si es un rechazo, entran las franjas.
  const [shownStatus, setShownStatus] = useState(pkg.status);
  const [stamping, setStamping] = useState(false);
  if (shownStatus !== pkg.status) {
    setShownStatus(pkg.status);
    setStamping(true);
  }
  const status = STATUS_INFO[pkg.status];
  const priority = PRIORITY_INFO[pkg.priority];
  const emit = (newStatus: PackageStatus): void => {
    if (pkg.status !== newStatus) onStatusChange({ id: pkg.id, newStatus });
  };
  const titleId = `code-${pkg.id}`;

  return (
    <div className="lt-card-host">
      <article
        className={`lt-card lt-card--${status.modifier}${stamping ? ' is-stamping' : ''}`}
        onAnimationEnd={() => setStamping(false)}
        data-status={status.dataStatus}
        aria-labelledby={titleId}
      >
        <header className="lt-card__head">
          <h2 className="lt-card__code" id={titleId}>
            <PackageLink id={pkg.id} trackingCode={pkg.trackingCode} />
          </h2>
          <span className={`lt-tag lt-tag--status-${status.modifier}`}>{status.label}</span>
        </header>
        <dl className="lt-card__meta">
          <div>
            <dt>Destino</dt>
            <dd>{pkg.destinationHub}</dd>
          </div>
          <div>
            <dt>Peso</dt>
            <dd>{weightFormat.format(pkg.weightKg)} kg</dd>
          </div>
          <div>
            <dt>Registrado</dt>
            <dd>
              <time dateTime={pkg.timestamp.toISOString()}>{dateFormat.format(pkg.timestamp)}</time>
            </dd>
          </div>
          <div>
            <dt>Prioridad</dt>
            <dd className={`lt-priority lt-priority--${priority.modifier}`}>{priority.label}</dd>
          </div>
        </dl>
        <div className="lt-card__actions">
          <IonButton
            ref={inspectRef}
            className={`lt-btn-inspect${inspected ? ' is-inactive' : ''}`}
            aria-label={`Inspeccionar ${pkg.trackingCode}`}
            aria-disabled={inspected ? 'true' : 'false'}
            onClick={() => emit('INSPECTED')}
          >
            Inspeccionar
          </IonButton>
          <IonButton
            ref={rejectRef}
            className={`lt-btn-reject${rejected ? ' is-inactive' : ''}`}
            fill="outline"
            aria-label={`Rechazar ${pkg.trackingCode}`}
            aria-disabled={rejected ? 'true' : 'false'}
            onClick={() => emit('REJECTED')}
          >
            Rechazar
          </IonButton>
        </div>
      </article>
    </div>
  );
}

export const PackageCard = memo(PackageCardComponent);
