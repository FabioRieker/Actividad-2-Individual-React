import { useIonViewWillEnter } from '@ionic/react';
import { useRef } from 'react';

/**
 * Ref para el contenido principal de una pantalla: cada vez que la vista pasa a ser la activa
 * se reinicia la animacion de entrada (deslizamiento corto + fundido). La barra superior no se mueve.
 */
export function usePageEnter<T extends HTMLElement = HTMLElement>(): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  useIonViewWillEnter(() => {
    const element = ref.current;
    if (!element) return;
    element.classList.remove('lt-enter');
    void element.offsetWidth; // fuerza el reflujo para poder reiniciar la animacion
    element.classList.add('lt-enter');
  });
  return ref;
}
