import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useFocusHeading } from '../hooks/useFocusHeading';
import type { PackageStatus } from '../models/package.model';
import { updateStatus, useActivity, usePackages } from '../services/packageStore';
import { formatDateTime, PRIORITY_LABEL, STATUS_LABEL } from '../utils/labels';
import './PageShell.css';
import './PackageDetail.css';

const STATUS_CLASS: Record<PackageStatus, string> = {
  IN_TRANSIT: 'transit',
  INSPECTED: 'inspected',
  REJECTED: 'rejected',
};

const weightFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

const PackageDetail: React.FC = () => {
  const headingRef = useFocusHeading();
  const { id } = useParams<{ id: string }>();
  const packages = usePackages();
  const activity = useActivity();
  const [announcement, setAnnouncement] = useState('');
  const pkg = packages.find((p) => p.id === id);
  const history = activity.filter((entry) => entry.packageId === id);

  const change = (newStatus: PackageStatus): void => {
    if (!pkg || pkg.status === newStatus) return;
    updateStatus(pkg.id, newStatus);
    setAnnouncement(`${pkg.trackingCode} marcado como ${STATUS_LABEL[newStatus].toLowerCase()}`);
  };

  return (
    <IonPage className="lt-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/paquetes" text="Paquetes" />
          </IonButtons>
          <IonTitle>
            <h1 className={`lt-page__title${pkg ? ' lt-page__title--code' : ''}`} ref={headingRef} tabIndex={-1}>
              {pkg ? pkg.trackingCode : 'Paquete no encontrado'}
            </h1>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="lt-page__content">
        <main className="lt-page__main">
          {pkg ? (
            <>
              <div className="lt-det-badges">
                <span className={`lt-badge lt-badge--status-${STATUS_CLASS[pkg.status]}`}>
                  <span className="lt-badge__dot" aria-hidden="true" />
                  {STATUS_LABEL[pkg.status]}
                </span>
                <span className="lt-badge">{PRIORITY_LABEL[pkg.priority]}</span>
              </div>
              <section className="lt-panel" aria-labelledby="det-data">
                <h2 className="lt-panel__title" id="det-data">
                  Datos del paquete
                </h2>
                <dl className="lt-det-fields">
                  <dt>Identificador</dt>
                  <dd className="lt-det-fields__mono">{pkg.id}</dd>
                  <dt>Código</dt>
                  <dd>{pkg.trackingCode}</dd>
                  <dt>Destino</dt>
                  <dd>{pkg.destinationHub}</dd>
                  <dt>Peso</dt>
                  <dd>{weightFormat.format(pkg.weightKg)} kg</dd>
                  <dt>Prioridad</dt>
                  <dd>{PRIORITY_LABEL[pkg.priority]}</dd>
                  <dt>Estado</dt>
                  <dd>{STATUS_LABEL[pkg.status]}</dd>
                  <dt>Registrado</dt>
                  <dd>
                    <time dateTime={pkg.timestamp.toISOString()}>{formatDateTime(pkg.timestamp)}</time>
                  </dd>
                </dl>
              </section>
              <section className="lt-panel" aria-labelledby="det-actions">
                <h2 className="lt-panel__title" id="det-actions">
                  Acciones
                </h2>
                <div className="lt-det-actions">
                  <button
                    type="button"
                    className="lt-btn lt-btn--ok"
                    aria-disabled={pkg.status === 'INSPECTED'}
                    onClick={() => change('INSPECTED')}
                  >
                    <IonIcon icon={checkmarkCircleOutline} aria-hidden="true" />
                    Inspeccionar
                  </button>
                  <button
                    type="button"
                    className="lt-btn lt-btn--ko"
                    aria-disabled={pkg.status === 'REJECTED'}
                    onClick={() => change('REJECTED')}
                  >
                    <IonIcon icon={closeCircleOutline} aria-hidden="true" />
                    Rechazar
                  </button>
                </div>
                <div role="status" className="lt-sr-only">
                  {announcement}
                </div>
              </section>
              <section className="lt-panel" aria-labelledby="det-timeline">
                <h2 className="lt-panel__title" id="det-timeline">
                  Línea de tiempo
                </h2>
                <ol className="lt-timeline" aria-label="Historial del paquete">
                  <li className="lt-timeline__item" data-status={history[0]?.from ?? pkg.status}>
                    Registrado como {STATUS_LABEL[history[0]?.from ?? pkg.status].toLowerCase()}
                    <time className="lt-timeline__time" dateTime={pkg.timestamp.toISOString()}>
                      {formatDateTime(pkg.timestamp)}
                    </time>
                  </li>
                  {history.map((entry) => (
                    <li className="lt-timeline__item" key={entry.id} data-status={entry.to}>
                      {STATUS_LABEL[entry.from]} → {STATUS_LABEL[entry.to]}
                      <time className="lt-timeline__time" dateTime={entry.at.toISOString()}>
                        {formatDateTime(entry.at)}
                      </time>
                    </li>
                  ))}
                </ol>
                {history.length === 0 ? <p className="lt-muted">Sin cambios de estado registrados.</p> : null}
              </section>
            </>
          ) : (
            <div className="lt-det-missing">
              <h2 className="lt-panel__title">No encontramos este paquete</h2>
              <p className="lt-muted">
                El identificador no corresponde a ningún paquete. Puede que el enlace sea antiguo o esté incompleto.
              </p>
              <IonButton routerLink="/paquetes" routerDirection="back">
                Volver a Paquetes
              </IonButton>
            </div>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default PackageDetail;
