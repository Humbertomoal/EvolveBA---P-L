@AGENTS.md

# P&L Construcción

Control de proyectos, costos, mano de obra y P&L para constructoras. Es una copia
heredada de una app de licitaciones (EvolveBA Compras) reconvertida a este dominio
en Fase 0 — si ves referencias a "licitaciones", "proveedores" u "órdenes de compra"
en código, historial o nombres de archivo, son residuos de esa herencia, no dominio
actual.

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
- `Employee` — plantilla propia, con `hourlyCost` (costo/hora integrado).
- `TimeEntry` — horas capturadas de mano de obra **propia**.
- `Estimate` — estimaciones de avance de obra; devengan el ingreso.

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
`TIPO_PROYECTO`. `CostCategory`, `ProjectStatus` y `EstimateStatus` son enums de
Prisma — nunca dupliques sus valores como `CatalogoValor`.

## Permisos

Mecanismo `Rol` + `RolPermiso` (ver/crear/editar/eliminar por módulo string).
Módulos: `proyectos`, `presupuestos`, `costos`, `horas-hombre`, `estimaciones`,
`pnl`, `configuracion`. Fuente única del catálogo de módulos:
`src/lib/usuariosTypes.ts` (`MODULOS`). Roles sembrados: Administrador (todo),
Gerente (todo excepto configuración, sin eliminar, solo lectura en `pnl` por ser
un dashboard calculado), Capturista (lectura general, escritura en `costos` y
`horas-hombre`).

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
