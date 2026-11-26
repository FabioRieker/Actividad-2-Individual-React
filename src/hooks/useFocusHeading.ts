import { useIonViewDidEnter } from '@ionic/react';
import { useRef } from 'react';

/**
 * Devuelve una ref para el <h1> de la página y le mueve el foco cada vez que la vista
 * pasa a ser la activa, de modo que lectores de pantalla y teclado empiezan en el contenido nuevo.
 */
export function useFocusHeading<T extends HTMLElement = HTMLHeadingElement>(): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  useIonViewDidEnter(() => {
    ref.current?.focus({ preventScroll: true });
  });
  return ref;
}
