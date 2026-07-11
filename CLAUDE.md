@AGENTS.md

# P&L Construcción

Control de proyectos, costos, mano de obra y P&L para una empresa **estructurista**
(fabricación y montaje de acero). Es una copia heredada de una app de licitaciones
(EvolveBA Compras) reconvertida a este dominio en Fase 0 — si ves referencias a
"licitaciones", "proveedores" u "órdenes de compra" en código, historial o nombres
de archivo, son residuos de esa herencia, no dominio actual.

El proyecto se compone de **elementos** (vigas, placas, columnas, barras, ángulos,
conexiones) que avanzan por **etapas** (habilitado → fabricado → en sitio →
montado). El personal propio se organiza en **cuadrillas** con un jefe.

## Stack

Next.js 16, Tailwind v4, Prisma 7 (adapter-pg), Supabase (Postgres), NextAuth v5
(`AUTH_SECRET`), TypeScript.

## Multi-tenant

No hay modelo `Cliente`/`Tenant` en la base de datos. El tenant vive en código:
`src/config/clientes.ts` (branding: nombre, logo, colores por `codigo` de cliente
en la URL, `app/[codigoCliente]/...`). El aislamiento de datos usa un campo
`clienteId String` plano (sin relación FK) en los modelos raíz por tenant
(`Project`, `Employee`, `Usuario`, `Rol`, `CatalogoValor`); los modelos hijos
heredan tenant vía su FK al padre (p. ej. `BudgetItem.projectId`), no repiten
`clienteId`. **Importante:** en runtime, el `clienteId` usado para filtrar datos
está hardcodeado a la constante `"default"` en todas las páginas — el `codigo` de
la URL solo controla branding, no aislamiento de datos. Es una limitación heredada,
no un bug de esta fase.

## Dominio (schema)

- `Project` — obra/proyecto. `contractAmount` es solo referencia contractual, NO es
  ingreso reconocido.
- `BudgetItem` — partidas presupuestales, jerárquicas (`parentId`).
- `Cost` — costos reales (materiales, subcontratos, equipo, indirectos, y mano de
  obra **subcontratada**).
- `Employee` — plantilla propia, con `hourlyCost` (costo/hora integrado). Puede
  pertenecer a una `Crew` (`crewId`) y/o liderarla (`isLeader`, relación `leads`).
- `TimeEntry` — horas capturadas de mano de obra **propia**; opcionalmente ligadas
  a un `Element` (`elementId`).
- `Estimate` — estimaciones de avance de obra; devengan el ingreso.
- `Crew` — cuadrilla. `leaderId` es `@unique`: un empleado lidera como máximo una
  cuadrilla (constraint de BD, no validación de app). `Employee.crewId` es un
  escalar simple: un empleado pertenece a una sola cuadrilla (también por diseño
  del schema, no por validación de app).
- `ProjectAssignment` — historial de qué empleado trabajó en qué obra
  (`assignedAt`/`removedAt`).
- `ElementStage` — catálogo de etapas **por tenant** (no es `CatalogoValor`: tiene
  `weightPct` y `order`, campos que no existen en el catálogo genérico).
- `Element` — pieza de acero (viga, placa, columna...) con peso unitario, costo y
  `progressPct` derivado.
- `ElementProgress` — avance de un elemento por etapa (`qtyDone` de las `qty`
  totales del elemento).

### Reglas de negocio (no romper)

1. **Mano de obra propia SOLO en `TimeEntry`.** `Cost.category = MANO_OBRA` es
   exclusivamente para subcontratistas de mano de obra. Nunca duplicar el mismo
   costo de personal propio en ambos lados.
2. **`TimeEntry.hourlyCost` y `.amount` son SNAPSHOT.** Se copian de
   `Employee.hourlyCost` al crear el registro y jamás se recalculan desde la
   relación viva — subir un sueldo no debe reescribir el P&L histórico.
3. **El ingreso se devenga por `Estimate`** con `status` `AUTORIZADA` o `PAGADA`.
   `Project.contractAmount` es solo referencia, nunca ingreso.
4. **Todos los montos son `Decimal`** (`@db.Decimal`), nunca `Float`.
5. **`Element.progressPct` es DERIVADO:** `Σ(stage.weightPct × qtyDone / Element.qty)`.
   Nunca se captura a mano.
6. **Las etapas son ACUMULATIVAS.** `ElementProgress.qtyDone` no puede aumentar
   conforme sube `ElementStage.order` — no puede haber más montadas que fabricadas.
   Validar al guardar (aún no implementado — no hay UI de elementos todavía).
7. **`ElementStage.weightPct` debe sumar exactamente 100 por tenant.** Validar al
   editar el catálogo de etapas (aún no implementado).
8. **Avance del proyecto = `Σ(weight × qty × progressPct) / Σ(weight × qty)`.**
   Ponderado por PESO, no por costo ni cantidad.
9. **Una `BudgetItem` CON elementos:** su `amount` = Σ de sus elementos, no se
   captura a mano. Una `BudgetItem` SIN elementos: captura normal `qty × unitPrice`.
   Nunca ambas a la vez para la misma partida.

### Fórmulas del P&L (documentadas, aún no implementadas — Fase 6+)

```
Ingreso     = Σ Estimate.grossAmount  WHERE status IN (AUTORIZADA, PAGADA)
Costo real  = Σ Cost.amount + Σ TimeEntry.amount
Presupuesto = Σ BudgetItem.amount
Margen      = Ingreso − Costo real
Desviación  = Costo real − (Presupuesto × avance%)
```

## Catálogos configurables (`CatalogoValor`)

Solo lo configurable por cliente vive aquí: `UNIDAD_MEDIDA`, `ROL_EMPLEADO`,
`TIPO_PROYECTO`, `TIPO_ELEMENTO`. `CostCategory`, `ProjectStatus` y
`EstimateStatus` son enums de Prisma — nunca dupliques sus valores como
`CatalogoValor`. `ElementStage` tampoco es `CatalogoValor` (ver arriba): es su
propio modelo porque necesita `weightPct` y `order`.

## Permisos

Mecanismo `Rol` + `RolPermiso` (ver/crear/editar/eliminar por módulo string).
Módulos: `proyectos`, `presupuestos`, `costos`, `horas-hombre`, `estimaciones`,
`pnl`, `personal`, `configuracion`. Fuente única del catálogo de módulos:
`src/lib/usuariosTypes.ts` (`MODULOS`). Roles sembrados:

- **Administrador:** acceso total a todos los módulos.
- **Gerente:** ver+crear+editar (sin eliminar) en todos los módulos operativos;
  solo lectura en `pnl` (dashboard calculado, nada que crear/editar); sin acceso a
  `configuracion`.
- **Capturista:** solo lectura en todo, excepto escritura (sin eliminar) en
  `costos` y `horas-hombre`; sin acceso a `configuracion`.

## Estado (Fase 0)

- Rol proveedor y dominio licitaciones eliminados completamente.
- Schema reemplazado por el dominio P&L; migración inicial única
  (`init_pl_construccion`) aplicada contra Supabase.
- Seed: 1 cliente demo (`demo`), 1 admin, catálogos, 3 empleados, 1 proyecto de
  ejemplo. Se dispara desde `app/[codigoCliente]/comprador/page.tsx` al visitar el
  dashboard (mismo patrón "ensure on page load" que usuarios/roles/catálogos).
- Sidebar con los 6 módulos de negocio + Configuración; páginas placeholder, sin
  funcionalidad real todavía.
- **Pendiente, a propósito:** la ruta sigue en `app/[codigoCliente]/comprador/`
  (no renombrada a `app/`) — se pospuso hasta que los módulos funcionen, para no
  arriesgar sesión/guards/proxy sin entregar nada funcional en el camino.

## Estado (Fase 1)

- Schema extendido con el dominio estructurista: `Crew`, `ProjectAssignment`,
  `ElementStage`, `Element`, `ElementProgress`; `Employee` con `crewId`/`isLeader`;
  `TimeEntry`/`Cost` con `elementId` opcional.
- Reglas 5-9 (progreso derivado, etapas acumulativas, pesos que suman 100, avance
  ponderado por peso, partidas con/sin elementos) documentadas arriba pero **sin
  UI ni validación de app todavía** — no existe pantalla de Elementos/Etapas en
  esta fase, solo el catálogo `ElementStage` sembrado y el schema listo.
- Módulo Personal implementado: Empleados y Cuadrillas (`/personal/empleados`,
  `/personal/cuadrillas`), con su propio módulo de permisos (`personal`).
