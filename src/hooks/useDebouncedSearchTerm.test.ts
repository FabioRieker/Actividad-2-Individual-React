import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useDebouncedSearchTerm } from './useDebouncedSearchTerm';

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Cuenta los Subject suscritos con `observed` activo entre los receptores de `subscribe`. */
function subjectsObserved(contexts: readonly unknown[]): number {
  const subjects = new Set<Subject<unknown>>();
  for (const context of contexts) {
    if (context instanceof Subject) subjects.add(context);
  }
  return [...subjects].filter((subject) => subject.observed).length;
}

describe('useDebouncedSearchTerm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('empieza con el término vacío', () => {
    const { result } = renderHook(() => useDebouncedSearchTerm());
    expect(result.current[0]).toBe('');
  });

  test('no emite antes de 300 ms', () => {
    const { result } = renderHook(() => useDebouncedSearchTerm());
    act(() => result.current[1]('Madrid'));
    advance(299);
    expect(result.current[0]).toBe('');
  });

  test('emite el término normalizado tras 300 ms', () => {
    const { result } = renderHook(() => useDebouncedSearchTerm());
    act(() => result.current[1]('  MaDrid '));
    advance(300);
    expect(result.current[0]).toBe('madrid');
  });

  test('solo emite el último valor de una ráfaga de pulsaciones', () => {
    const { result } = renderHook(() => useDebouncedSearchTerm());
    act(() => result.current[1]('m'));
    advance(200);
    act(() => result.current[1]('ma'));
    advance(200);
    expect(result.current[0]).toBe('');
    advance(100);
    expect(result.current[0]).toBe('ma');
  });

  test('el término vacío se aplica sin esperar el retardo', () => {
    const { result } = renderHook(() => useDebouncedSearchTerm());
    act(() => result.current[1]('madrid'));
    advance(300);
    expect(result.current[0]).toBe('madrid');
    act(() => result.current[1]('   '));
    advance(0);
    expect(result.current[0]).toBe('');
  });

  test('distinctUntilChanged evita reemitir un término repetido', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useDebouncedSearchTerm();
    });
    act(() => result.current[1]('bilbao'));
    advance(300);
    const afterFirst = renders;
    act(() => result.current[1]('Bilbao '));
    advance(300);
    expect(result.current[0]).toBe('bilbao');
    expect(renders).toBe(afterFirst);
  });

  test('tras desmontar no quedan suscripciones vivas al Subject', () => {
    const spy = vi.spyOn(Subject.prototype, 'subscribe');
    const { unmount } = renderHook(() => useDebouncedSearchTerm());
    expect(subjectsObserved(spy.mock.contexts)).toBe(1);
    unmount();
    expect(subjectsObserved(spy.mock.contexts)).toBe(0);
  });

  test('en StrictMode queda una única suscripción viva y 0 tras desmontar', () => {
    const spy = vi.spyOn(Subject.prototype, 'subscribe');
    const { unmount } = renderHook(() => useDebouncedSearchTerm(), { wrapper: StrictMode });
    expect(subjectsObserved(spy.mock.contexts)).toBe(1);
    unmount();
    expect(subjectsObserved(spy.mock.contexts)).toBe(0);
  });

  test('funciona en StrictMode sin duplicar la emisión', () => {
    const { result } = renderHook(() => useDebouncedSearchTerm(), { wrapper: StrictMode });
    act(() => result.current[1]('Valencia'));
    advance(300);
    expect(result.current[0]).toBe('valencia');
  });
});
