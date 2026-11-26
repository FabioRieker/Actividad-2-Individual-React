import { useCallback, useEffect, useState } from 'react';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';

/** Espera, en milisegundos, antes de aplicar el texto escrito en la búsqueda. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Convierte el texto escrito en un término de búsqueda normalizado (sin espacios
 * en los extremos y en minúsculas) que solo cambia cuando el usuario deja de
 * teclear durante `delayMs` y el valor es distinto del anterior.
 *
 * La suscripción se crea en el efecto y se cancela en su limpieza, por lo que
 * sobrevive al doble montaje de StrictMode sin dejar suscripciones vivas.
 */
export function useDebouncedSearchTerm(delayMs: number = SEARCH_DEBOUNCE_MS): readonly [string, (raw: string) => void] {
  const [input$] = useState(() => new Subject<string>());
  const [term, setTerm] = useState('');

  useEffect(() => {
    const subscription = input$
      .pipe(
        map((raw) => raw.trim().toLowerCase()),
        debounceTime(delayMs),
        distinctUntilChanged(),
      )
      .subscribe(setTerm);
    return () => subscription.unsubscribe();
  }, [input$, delayMs]);

  const setInput = useCallback((raw: string): void => input$.next(raw), [input$]);

  return [term, setInput];
}
