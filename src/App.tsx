import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { cubeOutline, pieChartOutline, settingsOutline, timeOutline } from 'ionicons/icons';
import { Redirect, Route } from 'react-router-dom';

import Activity from './pages/Activity';
import Home from './pages/Home';
import PackageDetail from './pages/PackageDetail';
import Settings from './pages/Settings';
import Summary from './pages/Summary';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';
import './theme/tabs.css';

setupIonicReact({ mode: 'md' });

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/paquetes">
            <Home />
          </Route>
          <Route exact path="/paquetes/:id">
            <PackageDetail />
          </Route>
          <Route exact path="/resumen">
            <Summary />
          </Route>
          <Route exact path="/actividad">
            <Activity />
          </Route>
          <Route exact path="/ajustes">
            <Settings />
          </Route>
          <Route exact path="/">
            <Redirect to="/paquetes" />
          </Route>
        </IonRouterOutlet>
        <IonTabBar slot="bottom" aria-label="Navegación principal">
          <IonTabButton tab="paquetes" href="/paquetes">
            <IonIcon icon={cubeOutline} aria-hidden="true" />
            <IonLabel>Paquetes</IonLabel>
          </IonTabButton>
          <IonTabButton tab="resumen" href="/resumen">
            <IonIcon icon={pieChartOutline} aria-hidden="true" />
            <IonLabel>Resumen</IonLabel>
          </IonTabButton>
          <IonTabButton tab="actividad" href="/actividad">
            <IonIcon icon={timeOutline} aria-hidden="true" />
            <IonLabel>Actividad</IonLabel>
          </IonTabButton>
          <IonTabButton tab="ajustes" href="/ajustes">
            <IonIcon icon={settingsOutline} aria-hidden="true" />
            <IonLabel>Ajustes</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

export default App;
