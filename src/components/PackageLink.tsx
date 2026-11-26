import { IonRouterLink } from '@ionic/react';

import './PackageLink.css';

interface PackageLinkProps {
  readonly id: string;
  readonly trackingCode: string;
}

/** Enlace al detalle de un paquete; el texto visible es el código de seguimiento. */
export function PackageLink({ id, trackingCode }: PackageLinkProps): React.ReactElement {
  return (
    <IonRouterLink className="lt-pkg-link" routerLink={`/paquetes/${id}`} routerDirection="forward">
      {trackingCode}
    </IonRouterLink>
  );
}
