import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useState } from 'react';

import { useFocusHeading } from '../hooks/useFocusHeading';
import { usePageEnter } from '../hooks/usePageEnter';
import { undoLast, useActivity } from '../services/packageStore';
import { formatDateTime, STATUS_LABEL } from '../utils/labels';
import './PageShell.css';
import './Activity.css';

const Activity: React.FC = () => {
  const headingRef = useFocusHeading();
  const mainRef = usePageEnter<HTMLElement>();
  const activity = useActivity();
  const [announcement, setAnnouncement] = useState('');
  const entries = [...activity].reverse();
  const empty = activity.length === 0;

  const handleUndo = (): void => {
    if (empty) return;
    const undone = undoLast();
    if (undone) {
      setAnnouncement(`Cambio deshecho: ${undone.trackingCode} vuelve a ${STATUS_LABEL[undone.from].toLowerCase()}`);
    }
  };

  return (
    <IonPage className="lt-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <h1 className="lt-page__title" ref={headingRef} tabIndex={-1}>
              Actividad
            </h1>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="lt-page__content">
        <main className="lt-page__main" ref={mainRef}>
          <div className="lt-act-toolbar">
            <p className="lt-muted">Cambios de estado, del más reciente al más antiguo.</p>
            <button type="button" className="lt-btn lt-btn--primary" aria-disabled={empty} onClick={handleUndo}>
              Deshacer último cambio
            </button>
          </div>
          <div role="status" className="lt-sr-only">
            {announcement}
          </div>
          {empty ? (
            <div className="lt-act-empty">
              <h2 className="lt-panel__title">Sin actividad</h2>
              <p>Aún no se ha cambiado el estado de ningún paquete. Los cambios aparecerán aquí.</p>
            </div>
          ) : (
            <ul className="lt-act-list" aria-label="Historial de cambios">
              {entries.map((entry) => (
                <li className="lt-act-item" key={entry.id} data-status={entry.to}>
                  <span>
                    <span className="lt-act-item__code">{entry.trackingCode}</span>: {STATUS_LABEL[entry.from]} →{' '}
                    {STATUS_LABEL[entry.to]}
                  </span>
                  <time className="lt-act-item__time" dateTime={entry.at.toISOString()}>
                    {formatDateTime(entry.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Activity;
