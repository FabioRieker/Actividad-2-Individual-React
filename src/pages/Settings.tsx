import {
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useState } from 'react';

import packageInfo from '../../package.json';
import { useFocusHeading } from '../hooks/useFocusHeading';
import { applyTheme, getStoredTheme, isThemePreference, saveTheme } from '../services/theme';
import type { ThemePreference } from '../services/theme';
import './PageShell.css';
import './Settings.css';

const THEME_OPTIONS: readonly { readonly value: ThemePreference; readonly label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

const Settings: React.FC = () => {
  const headingRef = useFocusHeading();
  const [theme, setTheme] = useState<ThemePreference>(getStoredTheme);

  return (
    <IonPage className="lt-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <h1 className="lt-page__title" ref={headingRef} tabIndex={-1}>
              Ajustes
            </h1>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="lt-page__content">
        <main className="lt-page__main">
          <section className="lt-panel" aria-labelledby="set-theme">
            <h2 className="lt-panel__title" id="set-theme">
              Tema
            </h2>
            <p className="lt-muted lt-set-hint">
              «Sistema» sigue la preferencia de tu dispositivo. La elección se guarda en este navegador.
            </p>
            <IonSegment
              aria-label="Tema de la aplicación"
              value={theme}
              onIonChange={(e) => {
                const value = e.detail.value;
                if (isThemePreference(value)) {
                  setTheme(value);
                  applyTheme(value);
                  saveTheme(value);
                }
              }}
            >
              {THEME_OPTIONS.map((option) => (
                <IonSegmentButton key={option.value} value={option.value}>
                  <IonLabel>{option.label}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
          </section>
          <section className="lt-panel" aria-labelledby="set-about">
            <h2 className="lt-panel__title" id="set-about">
              Acerca de
            </h2>
            <dl className="lt-set-about">
              <dt>Aplicación</dt>
              <dd>LogiTrack Express</dd>
              <dt>Versión</dt>
              <dd>{packageInfo.version}</dd>
            </dl>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Settings;
