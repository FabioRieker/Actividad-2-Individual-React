export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'lt-theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Lee la preferencia guardada; ante un valor inválido o almacenamiento bloqueado devuelve 'system'. */
export function getStoredTheme(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

/** Aplica la preferencia en <html>: 'system' elimina el atributo y deja actuar a prefers-color-scheme. */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

/** Guarda la preferencia; si el almacenamiento falla, el tema sigue aplicado durante la sesión. */
export function saveTheme(theme: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // almacenamiento no disponible (modo privado, cuota): se ignora
  }
}

/** Aplica el tema guardado al arrancar. */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
