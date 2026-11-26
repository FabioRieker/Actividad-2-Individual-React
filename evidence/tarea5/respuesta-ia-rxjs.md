**`src/models/WarehousePackage.ts`**

```ts
export type PackageStatus =
  "received" | "inspecting" | "classified" | "damaged";

export type PackagePriority = "low" | "medium" | "high" | "urgent";

export interface WarehousePackage {
  readonly id: string;
  readonly trackingCode: string;
  readonly status: PackageStatus;
  readonly priority: PackagePriority;
  readonly recipient: string;
  readonly weightKg: number;
  readonly receivedAt: string;
}
```

**`src/services/PackageService.ts`**

```ts
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
} from "rxjs";
import type {
  PackagePriority,
  PackageStatus,
  WarehousePackage,
} from "../models/WarehousePackage";

export type PriorityFilter = PackagePriority | "all";

export interface PackageFilterCriteria {
  readonly term: string;
  readonly priority: PriorityFilter;
}

const SEARCH_DEBOUNCE_MS = 300;

const INITIAL_PACKAGES: ReadonlyArray<WarehousePackage> = [
  {
    id: "pkg-001",
    trackingCode: "LTX-2026-0001",
    status: "received",
    priority: "high",
    recipient: "Almacén Norte",
    weightKg: 2.4,
    receivedAt: "2026-11-20T08:15:00Z",
  },
  {
    id: "pkg-002",
    trackingCode: "LTX-2026-0002",
    status: "inspecting",
    priority: "urgent",
    recipient: "Farmacia Central",
    weightKg: 0.8,
    receivedAt: "2026-11-20T09:02:00Z",
  },
  {
    id: "pkg-003",
    trackingCode: "LTX-2026-0003",
    status: "classified",
    priority: "low",
    recipient: "Librería Sur",
    weightKg: 5.1,
    receivedAt: "2026-11-21T11:40:00Z",
  },
  {
    id: "pkg-004",
    trackingCode: "LTX-2026-0004",
    status: "damaged",
    priority: "medium",
    recipient: "Tienda Electrónica Este",
    weightKg: 3.7,
    receivedAt: "2026-11-22T16:25:00Z",
  },
];

function matchesCriteria(
  pkg: WarehousePackage,
  { term, priority }: PackageFilterCriteria,
): boolean {
  const matchesPriority = priority === "all" || pkg.priority === priority;
  const matchesTerm =
    term === "" || pkg.trackingCode.toLowerCase().includes(term);
  return matchesPriority && matchesTerm;
}

class PackageService {
  private readonly packagesSubject = new BehaviorSubject<
    ReadonlyArray<WarehousePackage>
  >(INITIAL_PACKAGES);

  readonly packages$: Observable<ReadonlyArray<WarehousePackage>> =
    this.packagesSubject.asObservable();

  getSnapshot(): ReadonlyArray<WarehousePackage> {
    return this.packagesSubject.getValue();
  }

  updateStatus(id: string, status: PackageStatus): void {
    const next = this.packagesSubject
      .getValue()
      .map((pkg) => (pkg.id === id ? { ...pkg, status } : pkg));
    this.packagesSubject.next(next);
  }

  search(
    criteria: PackageFilterCriteria,
  ): Observable<ReadonlyArray<WarehousePackage>> {
    return this.packages$.pipe(
      map((packages) =>
        packages.filter((pkg) => matchesCriteria(pkg, criteria)),
      ),
    );
  }

  filterPackages(
    searchTerm$: Observable<string>,
    priority$: Observable<PriorityFilter>,
  ): Observable<ReadonlyArray<WarehousePackage>> {
    const term$ = searchTerm$.pipe(
      map((term) => term.trim().toLowerCase()),
      debounceTime(SEARCH_DEBOUNCE_MS),
      startWith(""),
      distinctUntilChanged(),
    );

    const priorityFilter$ = priority$.pipe(distinctUntilChanged());

    return combineLatest([term$, priorityFilter$]).pipe(
      switchMap(([term, priority]) => this.search({ term, priority })),
    );
  }
}

export const packageService = new PackageService();
```

**`src/pages/PackageListPage.tsx`**

```tsx
import { useEffect, useState, type FC } from "react";
import {
  IonBadge,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { BehaviorSubject, Subject } from "rxjs";
import type {
  PackagePriority,
  PackageStatus,
  WarehousePackage,
} from "../models/WarehousePackage";
import {
  packageService,
  type PriorityFilter,
} from "../services/PackageService";

interface PriorityOption {
  readonly value: PriorityFilter;
  readonly label: string;
}

const PRIORITY_OPTIONS: ReadonlyArray<PriorityOption> = [
  { value: "all", label: "Todas" },
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

const PRIORITY_LABEL: Readonly<Record<PackagePriority, string>> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const PRIORITY_COLOR: Readonly<Record<PackagePriority, string>> = {
  urgent: "danger",
  high: "warning",
  medium: "primary",
  low: "medium",
};

const STATUS_LABEL: Readonly<Record<PackageStatus, string>> = {
  received: "Recibido",
  inspecting: "En inspección",
  classified: "Clasificado",
  damaged: "Dañado",
};

function isPriorityFilter(value: unknown): value is PriorityFilter {
  return PRIORITY_OPTIONS.some((option) => option.value === value);
}

const PackageListPage: FC = () => {
  const [searchTerm$] = useState(() => new Subject<string>());
  const [priority$] = useState(
    () => new BehaviorSubject<PriorityFilter>("all"),
  );
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [packages, setPackages] = useState<ReadonlyArray<WarehousePackage>>(
    () => packageService.getSnapshot(),
  );

  useEffect(() => {
    const subscription = packageService
      .filterPackages(searchTerm$, priority$)
      .subscribe((result) => setPackages(result));

    return () => subscription.unsubscribe();
  }, [searchTerm$, priority$]);

  const handlePriorityChange = (value: unknown): void => {
    if (!isPriorityFilter(value)) {
      return;
    }
    setPriority(value);
    priority$.next(value);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Paquetes</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            placeholder="Buscar por código de seguimiento"
            aria-label="Buscar paquete por código de seguimiento"
            debounce={0}
            onIonInput={(event) => searchTerm$.next(event.detail.value ?? "")}
          />
        </IonToolbar>
        <IonToolbar>
          <IonItem lines="none">
            <IonSelect
              label="Prioridad"
              interface="popover"
              value={priority}
              onIonChange={(event) => handlePriorityChange(event.detail.value)}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <IonSelectOption key={option.value} value={option.value}>
                  {option.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonList>
          {packages.length === 0 ? (
            <IonItem lines="none">
              <IonLabel>
                No hay paquetes que coincidan con la búsqueda.
              </IonLabel>
            </IonItem>
          ) : (
            packages.map((pkg) => (
              <IonItem key={pkg.id}>
                <IonLabel>
                  <h2>{pkg.trackingCode}</h2>
                  <p>
                    {pkg.recipient} · {STATUS_LABEL[pkg.status]} ·{" "}
                    {pkg.weightKg} kg
                  </p>
                </IonLabel>
                <IonBadge slot="end" color={PRIORITY_COLOR[pkg.priority]}>
                  {PRIORITY_LABEL[pkg.priority]}
                </IonBadge>
              </IonItem>
            ))
          )}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default PackageListPage;
```
