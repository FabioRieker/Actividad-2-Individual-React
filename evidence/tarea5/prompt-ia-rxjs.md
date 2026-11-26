# Tarea 5 — Prompt enviado al asistente de IA

- Fecha: 2026-11-26
- Asistente: Claude (Anthropic), modelo claude-opus-5-5, en una conversación nueva sin contexto del proyecto.
- URL de la conversación: no disponible.
- La respuesta se guarda sin modificar en `respuesta-ia-rxjs.md`; su hash SHA-256 está en `SEAL.sha256`.

## Prompt literal

```text
Estoy haciendo una app con Ionic y React (TypeScript) llamada LogiTrack Express, para gestionar paquetes en un almacén. Tengo una interfaz WarehousePackage (con trackingCode, status, prioridad, etc.) y un servicio que guarda el array de paquetes.

Quiero que la lista de paquetes se filtre mientras el usuario escribe en un IonSearchbar, buscando por trackingCode. Además hay un filtro de prioridad (un select) que debe combinarse con la búsqueda.

Genérame un método de filtrado reactivo con RxJS para esa barra de búsqueda, usando debounceTime, distinctUntilChanged y switchMap.

Dame el código TypeScript del servicio y del componente de la página, sin explicaciones adicionales.
```
