import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSnapshot, resetStore, subscribe, updateStatus, usePackages } from './packageStore';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TRACKING = /^LTK-\d{4}-ES$/;

describe('packageStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('contiene 8 paquetes con UUID v4 y código LTK-XXXX-ES únicos', () => {
    const packages = getSnapshot();
    expect(packages).toHaveLength(8);
    packages.forEach((p) => {
      expect(p.id).toMatch(UUID_V4);
      expect(p.trackingCode).toMatch(TRACKING);
      expect(p.timestamp).toBeInstanceOf(Date);
    });
    expect(new Set(packages.map((p) => p.id)).size).toBe(8);
    expect(new Set(packages.map((p) => p.trackingCode)).size).toBe(8);
  });

  it('mezcla prioridades y estados', () => {
    const packages = getSnapshot();
    expect(new Set(packages.map((p) => p.priority))).toEqual(new Set(['CRITICAL', 'STANDARD', 'LOW']));
    expect(new Set(packages.map((p) => p.status))).toEqual(new Set(['IN_TRANSIT', 'INSPECTED', 'REJECTED']));
  });

  it('está congelado (inmutable)', () => {
    const packages = getSnapshot();
    expect(Object.isFrozen(packages)).toBe(true);
    packages.forEach((p) => {
      expect(Object.isFrozen(p)).toBe(true);
    });
  });

  it('updateStatus devuelve una colección nueva sin mutar la anterior', () => {
    const before = getSnapshot();
    const target = before.find((p) => p.status === 'IN_TRANSIT');
    expect(target).toBeDefined();
    if (!target) return;

    updateStatus(target.id, 'INSPECTED');
    const after = getSnapshot();

    expect(after).not.toBe(before);
    expect(before.find((p) => p.id === target.id)?.status).toBe('IN_TRANSIT');
    expect(after.find((p) => p.id === target.id)?.status).toBe('INSPECTED');
    expect(after.filter((p) => p.id !== target.id)).toEqual(before.filter((p) => p.id !== target.id));
  });

  it('un id inexistente no cambia el estado ni notifica', () => {
    const before = getSnapshot();
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    updateStatus('00000000-0000-4000-8000-000000000000', 'REJECTED');

    expect(getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('subscribe notifica y unsubscribe deja de notificar', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    const first = getSnapshot()[0];
    expect(first).toBeDefined();
    if (!first) return;

    updateStatus(first.id, 'REJECTED');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    updateStatus(first.id, 'INSPECTED');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('usePackages', () => {
  beforeEach(() => {
    resetStore();
  });

  it('devuelve los paquetes y se re-renderiza al actualizar el estado', () => {
    const { result } = renderHook(() => usePackages());
    expect(result.current).toHaveLength(8);

    const target = result.current.find((p) => p.status === 'IN_TRANSIT');
    expect(target).toBeDefined();
    if (!target) return;

    act(() => {
      updateStatus(target.id, 'REJECTED');
    });

    expect(result.current.find((p) => p.id === target.id)?.status).toBe('REJECTED');
  });
});
