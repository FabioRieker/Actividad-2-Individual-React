import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';

import { usePackages } from '../services/packageStore';
import './Home.css';

const Home: React.FC = () => {
  const packages = usePackages();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>LogiTrack Express</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <h1>Recepción, inspección y clasificación de paquetes.</h1>
        <p>{packages.length} paquetes registrados</p>
      </IonContent>
    </IonPage>
  );
};

export default Home;
