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
- `BudgetItem` — dos niveles (regla #9): PARTIDA (`parentId=null`,
  `accountId=null`) y LÍNEA (`parentId`+`accountId` de `CostAccount`, ambos
  obligatorios). `isCalculated=true` en la línea "2.1 Materia prima" (regla
  #14). `qty`/`unitPrice` son nullable porque partidas y líneas calculadas no
  los usan.
- `CostAccount` — catálogo REAL de cuentas contables (Fase 6, reemplaza el enum
  `CostCategory`). Árbol por tenant (`parentId`). `level` es el número de GRUPO
  contable (2=Costos operativos, 3=Gastos administrativos, 4=Publicidad y
  marketing, 5=Impuestos), no profundidad de árbol. `isProject=true` en nivel 2
  (va a obra); `isSystem=true` en las cuentas que se calculan solas y jamás se
  capturan (ver regla #11).
- `Cost` — costos reales, ligados a una `CostAccount` (`accountId`, obligatorio).
  `projectId` es NULLABLE: con proyecto = costo directo de obra (cuenta nivel 2);
  sin proyecto = gasto fijo de empresa (niveles 3/4/5). `paidAt` distingue
  comprometido (null) de pagado (con fecha).
- `PayrollPeriod` — nómina REAL pagada por mes y tipo (OPERATIVA/ADMINISTRATIVA),
  a nivel empresa. Ver regla #12 (MO aplicada vs. nómina real).
- `Employee` — plantilla propia, con `hourlyCost` (costo/hora integrado). Puede
  pertenecer a una `Crew` (`crewId`) y/o liderarla (`isLeader`, relación `leads`).
- `TimeEntry` — horas capturadas de mano de obra **propia**; opcionalmente ligadas
  a un `Element` (`elementId`).
- `Estimate` — estimaciones de avance de obra; devengan el ingreso. `progressPct`
  es el avance acumulado CALCULADO (`calcularAvancePct`, regla #8) al momento de
  crear/editar, nunca capturable a mano. `grossAmountManual` (Fase 8) marca si
  el bruto fue sobrescrito manualmente en vez de tomarse del cálculo.
- `Crew` — cuadrilla. `leaderId` es `@unique`: un empleado lidera como máximo una
  cuadrilla (constraint de BD, no validación de app). `Employee.crewId` es un
  escalar simple: un empleado pertenece a una sola cuadrilla (también por diseño
  del schema, no por validación de app).
- `ProjectAssignment` — historial de qué empleado trabajó en qué obra
  (`assignedAt`/`removedAt`).
- `ElementStage` — catálogo de etapas **por tenant** (no es `CatalogoValor`: tiene
  `weightPct` y `order`, campos que no existen en el catálogo genérico).
- `Element` — pieza de acero (viga, placa, columna...) con peso unitario, costo y
  `progressPct` derivado. Puede referenciar un `ElementType` del catálogo maestro
  (`elementTypeId`, opcional). `budgetItemId` (opcional) apunta a una PARTIDA de
  presupuesto (regla #9), asignable desde el tab Elementos del proyecto.
- `ElementProgress` — avance de un elemento por etapa (`qtyDone` de las `qty`
  totales del elemento).
- `ElementType` — catálogo MAESTRO de tipos de elemento (perfiles, placas, barras),
  reutilizable entre proyectos. Es de referencia: sus valores se copian (snapshot)
  al `Element` al crearlo (regla #10).

### Reglas de negocio (no romper)

1. **Mano de obra propia SOLO en `TimeEntry`.** Las cuentas "Nómina Operativa"
   (2.8) y "Nómina Administrativa" (3.5) son `isSystem=true`: el formulario de
   captura de costos las bloquea, es imposible meter doble conteo por error
   (ver regla #11). `Cost` es exclusivamente para materiales, subcontratos,
   equipo y gastos fijos — nunca personal propio.
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
   Validado en cliente y servidor por `validarProgresoAcumulativo` (Fase 5).
7. **`ElementStage.weightPct` debe sumar exactamente 100 por tenant.** Validar al
   editar el catálogo de etapas (aún no implementado).
8. **Avance del proyecto = `Σ(weight × qty × progressPct) / Σ(weight × qty)`.**
   Ponderado por PESO, no por costo ni cantidad.
9. **`BudgetItem` tiene dos niveles con reglas distintas (Fase 7).** Un
   `BudgetItem` SIN `accountId` y SIN `parentId` es una PARTIDA (Fabricación,
   Montaje...): su `amount` = Σ de sus líneas hijas, NUNCA se captura a mano.
   Un `BudgetItem` CON `accountId` y `parentId` es una LÍNEA de esa partida:
   captura normal `qty × unitPrice`, EXCEPTO la línea `isCalculated` (ver
   regla #14). `Element.budgetItemId` apunta siempre a la PARTIDA, nunca a
   una línea.
10. **`ElementType` es un catálogo de REFERENCIA.** Sus valores (peso, precio,
    material, dimensiones) se COPIAN como snapshot al `Element` del proyecto al
    crearlo. Cambiar precio o peso en el catálogo NO recalcula proyectos ya
    capturados — mismo principio que `Employee.hourlyCost` (regla #2).
11. **DOBLE CONTEO DE MANO DE OBRA — la regla más importante del sistema.**
    "Nómina Operativa" (2.8) NUNCA se captura como `Cost`; su valor en el P&L es
    `Σ TimeEntry.amount`. "Nómina Administrativa" (3.5) NUNCA se captura como
    `Cost`; su valor es `PayrollPeriod` donde `type = ADMINISTRATIVA`. Ambas
    cuentas son `isSystem=true` y el formulario de captura de costos las
    excluye del select — es imposible meter doble conteo por error.
12. **MO APLICADA vs. NÓMINA REAL.** MO aplicada = `Σ TimeEntry.amount` (lo
    cargado a obras). Nómina real = `PayrollPeriod` tipo OPERATIVA (lo
    realmente pagado). Ociosidad = nómina real − MO aplicada (gente pagada que
    no produjo). El P&L POR PROYECTO usa `TimeEntry`; el P&L DE EMPRESA usa
    `PayrollPeriod`. Nunca se suman — el diferencial vive a nivel empresa como
    "MO ociosa". Si la ociosidad es negativa, el `hourlyCost` de plantilla está
    sobreestimado.
13. **COSTOS FIJOS no se prorratean (por ahora).** El P&L de proyecto muestra
    MARGEN BRUTO (ingreso − costos directos − MO aplicada). Los niveles 3, 4 y
    5 de `CostAccount` viven a nivel empresa, no en el P&L de un proyecto
    específico. El schema queda listo para prorratear después
    (`Cost.projectId` ya es nullable) pero el prorrateo no está implementado.
14. **MATERIA PRIMA CALCULADA.** Si una PARTIDA tiene elementos asignados
    (`Element.budgetItemId`), su línea "2.1 Materia prima" es
    `isCalculated=true`: `amount = Σ Element.totalCost` de esos elementos,
    nunca se captura a mano. Se recalcula en vivo en cada lectura
    (`getPresupuestoProyecto`, nunca confía en el valor guardado en BD como
    fuente de verdad para mostrar) y también al escribir, cuando un elemento
    cambia de partida (`asignarElementoPartidaAction`). Misma filosofía que
    "Nómina Operativa" (regla #11): si el dato existe en otro lado, no se
    teclea. Evita que el presupuesto de material se despegue del alcance
    físico real capturado en Elementos.
15. **EL AVANCE DE UNA ESTIMACIÓN NUNCA RETROCEDE.** El avance del periodo
    (`progressPct` acumulado actual − `progressPct` de la última estimación
    `AUTORIZADA`/`PAGADA`) no puede ser negativo — no se puede "desavanzar".
    Si el avance acumulado calculado es menor al de la última estimación
    aceptada, se bloquea con un mensaje legible
    (`validarAvanceNoNegativo` en `estimacionesTypes.ts`), nunca un 500.
16. **AMORTIZACIÓN DE ANTICIPO, con tope.** `amortización = bruto ×
    (Project.advanceAmount / Project.contractAmount)`, pero JAMÁS más de lo
    que quede por amortizar: se topa contra
    `advanceAmount − Σ Estimate.advanceAmort` de las estimaciones ya
    `AUTORIZADA`/`PAGADA` (las en Borrador/Enviada no cuentan — todavía
    podrían no concretarse). Si `advanceAmount = 0`, la amortización es 0.

### Fórmulas del P&L (documentadas, aún no implementadas — Fase 9+)

```
Ingreso            = Σ Estimate.grossAmount  WHERE status IN (AUTORIZADA, PAGADA)   [implementado, Fase 8]
Costo real (obra)  = Σ Cost.amount (cuentas nivel 2) + Σ TimeEntry.amount (MO aplicada)
Presupuesto        = Σ BudgetItem.amount
Margen bruto       = Ingreso − Costo real (obra)          [regla #13, sin prorrateo de fijos]
Desviación         = Costo real (obra) − (Presupuesto × avance%)
MO ociosa (empresa) = Σ PayrollPeriod (OPERATIVA) − Σ TimeEntry.amount (regla #12)
```

## Catálogos configurables (`CatalogoValor`)

Solo lo configurable por cliente vive aquí: `UNIDAD_MEDIDA`, `ROL_EMPLEADO`,
`TIPO_PROYECTO`, `TIPO_ELEMENTO`. `ProjectStatus` y `EstimateStatus` son enums
de Prisma — nunca dupliques sus valores como `CatalogoValor`. `ElementStage`
tampoco es `CatalogoValor` (ver arriba): es su propio modelo porque necesita
`weightPct` y `order`. `CostAccount` (Fase 6) tampoco es `CatalogoValor`: es un
árbol jerárquico con `level`/`parentId`/`isProject`/`isSystem`, no un catálogo
plano — reemplazó al enum `CostCategory` que existía hasta Fase 5.

## Permisos

Mecanismo `Rol` + `RolPermiso` (ver/crear/editar/eliminar por módulo string).
Módulos: `proyectos`, `presupuestos`, `costos`, `horas-hombre`, `estimaciones`,
`pnl`, `personal`, `elementos`, `configuracion`. Fuente única del catálogo de módulos:
`src/lib/usuariosTypes.ts` (`MODULOS`). Roles sembrados:

- **Administrador:** acceso total a todos los módulos.
- **Gerente:** ver+crear+editar (sin eliminar) en todos los módulos operativos;
  solo lectura en `pnl` (dashboard calculado, nada que crear/editar); sin acceso a
  `configuracion`.
- **Capturista (supervisor de obra, Fase 10):** ver+crear+editar (sin eliminar)
  en `horas-hombre` y `captura` — su trabajo del día a día es capturar horas y
  avance, no información financiera. Solo lectura en `proyectos`, `personal` y
  `elementos` (necesaria para ubicar el proyecto/cuadrilla/elemento correcto al
  capturar). Sin ningún acceso — ni de lectura — a `costos`, `presupuestos`,
  `estimaciones`, `pnl` ni `configuracion`: son datos financieros de la obra
  (materia prima, subcontratos, márgenes) que no le corresponden a un
  supervisor de campo.

Cada ruta del sidebar valida su propio `permiso.ver` en el servidor
(`notFound()` si falta) — no basta con ocultar el link o el botón; tecleada a
mano, la URL debe rebotar igual. Mismo patrón en las 9+ páginas listadas en
`comprador/` (proyectos, presupuestos, elementos, costos, costos/nomina,
horas-hombre, estimaciones, personal/empleados, personal/cuadrillas,
configuracion/*). El sidebar (`layout.tsx`) además oculta cada link/grupo cuyo
módulo no tenga `ver` — doble candado, igual que "Nómina Operativa" en costos.

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

## Estado (Fase 2)

- Módulo Proyectos completo: lista con filtros, alta/edición (`/proyectos/nuevo`,
  `/proyectos/[id]/editar`), detalle con tabs (Resumen y Personal implementados;
  Presupuesto/Elementos/Costos/Horas/Estimaciones/P&L son placeholder), soft
  delete.
- Primer enforcement real de permisos: `src/lib/permisos.ts` (`getPermisoModulo`)
  — antes `RolPermiso` solo se mostraba en la UI de Configuración, nunca se
  validaba en ninguna acción ni página.
- Asignación de personal a proyecto: selector de personal reutilizable
  (`AsignarPersonalModal`, en `proyectos/_components/`, controlado — no llama
  acciones de servidor, solo devuelve la selección) usado tanto en el formulario
  de proyecto (crear/editar) como en el tab Personal del detalle (gestión rápida).
  Crear proyecto + asignar personal es una sola `prisma.$transaction`; editar hace
  diff contra las asignaciones activas (`syncAssignments`, helper compartido) —
  agrega/reactiva las nuevas, pone `removedAt` a las quitadas, nunca borra filas.
- `PanelFiltros` (`app/_components/`) se extendió con un tercer tipo de sección
  `"texto"` (antes solo select/checkboxes) — primer uso real del componente en el
  repo.
- Nota de infraestructura: en este proyecto, tras varias sesiones largas de
  desarrollo con muchos cambios de archivos, el dev server de Turbopack puede
  quedar en un estado corrupto (páginas devolviendo 500 sin relación con el
  código). Si algo se ve bien en el código pero falla en el navegador sin error de
  consola, probar `rm -rf .next` + reiniciar `npm run dev` antes de asumir que es
  un bug de la app.

## Estado (Fase 3)

- Catálogo maestro `ElementType` (perfiles, placas, barras — reutilizable entre
  proyectos), módulo `/elementos` con su propio permiso (`elementos`). Regla #10
  documentada arriba. `Element.elementTypeId` es opcional y aún no se usa desde
  UI (Fase 4 la conecta desde el formulario de proyecto).

## Estado (Fase 4)

- Formulario de proyecto (crear/editar) agrega una sección "Elementos de la obra":
  tabla editable (código de obra, cantidad, largo, peso/costo calculados, costo
  unitario sobrescribible con botón "recalcular desde catálogo") alimentada por
  `SeleccionarElementosModal` — selector que, a diferencia de
  `AsignarPersonalModal`, no reemplaza un conjunto sino que APPENDEA renglones en
  cada "Aceptar" (el mismo `ElementType` se puede agregar varias veces con
  distinto código/largo).
- "Crear tipo al vuelo": el selector tiene un modal anidado con el mismo
  formulario de `ElementType` de Fase 3, refactorizado en dos piezas —
  `ElementoTypeFormFields` (núcleo: campos + validación + acción, sin
  `usePageTitle` ni navegación) y `ElementoTypeForm` (wrapper de página, solo
  para las rutas `/elementos/nuevo` y `/elementos/[id]/editar`). El modal anidado
  usa `ElementoTypeFormFields` directamente para no duplicar el formulario ni
  pisar el título de la página del proyecto.
- Persistencia: `Element` se crea con SNAPSHOT del `ElementType` en el momento
  (`name`, `type`←`family`, `material`, `weight`) — el peso/costo se calculan
  server-side a partir del catálogo vigente, nunca se confía en lo que mande el
  cliente para esos campos derivados. Crear proyecto + personal + elementos es
  una sola `prisma.$transaction`. Editar hace diff (`syncElementos`): nuevos se
  crean, existentes se actualizan, los que ya no vienen se sueltan — pero si un
  `Element` tiene `TimeEntry` o `Cost` asociados, quitarlo aborta toda la
  transacción con un mensaje claro (nunca se pierde ese historial).
- `Element.material` se agregó al schema en esta fase (no existía) porque la
  regla #10 pedía explícitamente snapshot de material.

## Estado (Fase 5)

- Tab **Captura** (unificado horas + avance) en el detalle de proyecto: header
  con Fecha + Elemento, dos paneles (`PanelHoras` con atajo de cuadrilla y
  "horas para todos", `PanelAvance` con qty editable por etapa mostrando
  "anterior" vs "nuevo" en vivo) y un solo botón "Guardar" que dispara
  `guardarCapturaAction`, una única `prisma.$transaction` que crea/actualiza
  `TimeEntry`, upsertea `ElementProgress` y recalcula `Element.progressPct`
  (regla #5) e `installedAt` (se marca cuando MONTADO llega a `qty` completa).
- Tab **Elementos** (solo lectura): código/tipo/cantidad/peso/avance por etapa/
  % con barra de progreso/h-h y costo de MO acumulados por elemento, con botón
  "Ir a captura" que preselecciona el elemento en el tab Captura.
- Tab **Horas**: historial de `TimeEntry` con filtros (empleado/elemento/rango
  de fecha vía `PanelFiltros`), edición y borrado (soft-delete) inline según
  permiso.
- Se corrigió `TimeEntry.@@unique([projectId, employeeId, date])` →
  `@@unique([projectId, employeeId, elementId, date])` — sin este cambio un
  empleado no podía capturar horas en dos elementos distintos el mismo día.
  Se agregó también `TimeEntry.deletedAt` (soft delete, ningún historial de
  horas se pierde) y `Element.installedAt` — ninguno de los dos pedido
  explícitamente, ambos consistentes con el resto del código.
- `avanceProyecto.ts` dejó de ser un stub: `calcularAvancePct()` ahora implementa
  la regla #8 de verdad (`Σ(weight×qty×progressPct)/Σ(weight×qty)`), así que la
  lista de proyectos ya muestra avance real.
- Módulo de permisos nuevo `captura` (Admin T, Gerente E, Capturista E) —
  confirmado con el usuario antes de aplicarlo.
- **Bug real encontrado y corregido en esta fase:** `CapturaTab` tenía una
  condición de carrera — al cambiar de elemento en el dropdown, si la
  respuesta de `getEstadoCapturaAction` del elemento anterior resolvía
  DESPUÉS que la del nuevo, sus datos obsoletos sobreescribían el estado ya
  renderizado (mezclaba etapas de un elemento con la cantidad total de otro).
  Se corrigió con un guard de "última petición gana" (`requestIdRef` en
  `cargarEstado`). Encontrado verificando con Playwright, no reportado por el
  usuario.
- Verificado con Playwright (`test.describe.serial`, 3 tests con `expect()`
  reales, no solo `innerText()` de debug): captura completa con el ejemplo
  exacto del enunciado (40/40/18/18 @ 15/45/10/30 → 78.0%), rechazo de
  validación acumulativa con el mensaje dinámico exacto
  ("No puedes tener 18 en 'En sitio' si solo hay 10 en 'Fabricado'."), y un
  mismo empleado capturando horas en dos elementos distintos el mismo día sin
  conflicto. Snapshot de `hourlyCost` confirmado contra la BD tras la corrida.
  Datos de prueba y la cuadrilla huérfana "TEST Cuadrilla A" (debris de la
  Fase 1) limpiados al terminar.

## Estado (Fase 6)

- Se reemplazó el enum `CostCategory` por `CostAccount`, un catálogo real de
  cuentas contables en árbol (grupos 2/3/4/5, ver reglas #11-13). Sembrado
  desde Configuración → Cuentas contables (`/configuracion/cuentas`): los 4
  nodos de grupo son estructurales (no editables/eliminables desde UI); sus
  hojas sí son CRUD, excepto "Nómina Operativa" (2.8) y "Nómina Administrativa"
  (3.5), marcadas `isSystem=true` — visibles con badge "Calculada
  automáticamente", bloqueadas para editar/eliminar tanto en la UI como en el
  server action (doble candado, no solo cosmético).
- `BudgetItem.category` (el enum viejo) se migró a `BudgetItem.accountId`
  (opcional, mismo catálogo `CostAccount`) — no pedido explícitamente, pero
  necesario porque el enum desapareció; sin esto `BudgetItem` habría quedado
  sin forma de clasificar sus partidas. No hay UI todavía (Presupuesto sigue
  placeholder); el campo solo deja el schema listo para cuando exista.
- `Cost.projectId` ahora es nullable: con proyecto = costo directo de obra
  (cuenta nivel 2); sin proyecto = gasto fijo de empresa (niveles 3/4/5, el
  formulario de captura oculta el campo Proyecto en ese caso). Se agregó
  `Cost.paidAt` (comprometido vs. pagado) y `Cost.accountId` (obligatorio,
  reemplaza `category`).
- Módulo **Costos** (`/costos`, permiso `costos` ya existente desde Fase 0):
  lista global con filtros (rango de fechas, cuenta, proyecto — incluye "—
  Gastos de empresa —", estatus de pago, texto), totales de
  comprometido/pagado/total en el footer, alta/edición en modal
  (`createPortal`) con select de cuenta restringido a hojas capturables
  (`cuentasCapturables()`: excluye nodos con hijos y cuentas `isSystem`), el
  campo Proyecto solo aparece si la cuenta es `isProject`, y Elemento (opcional)
  se filtra por el proyecto elegido. Soft delete.
- Módulo **Nómina** (`/costos/nomina`, dentro del grupo de sidebar de Costos,
  mismo permiso `costos` — no se creó un módulo de permisos nuevo porque el
  enunciado dejaba la ruta a criterio y la nómina es un capturable más de
  costos, no un dominio aparte): captura mensual (año/mes/tipo/monto, upsert
  por `[clienteId, year, month, type]`) y tabla comparativa MO aplicada vs.
  nómina real (regla #12) solo para tipo OPERATIVA, con la fila de ociosidad en
  rojo cuando es negativa (hourlyCost sobreestimado).
- Tab **Costos** del detalle de proyecto: pasó de placeholder a real, solo
  lectura. Agrupa los `Cost` del proyecto por cuenta con subtotales, agrega
  al final una fila calculada "2.8 Nómina Operativa" (`Σ TimeEntry.amount`,
  badge "Calculada desde horas-hombre", regla #11) y un total que SÍ la suma
  (costos directos + MO aplicada) — es el "margen bruto" de la regla #13 en
  construcción, sin el P&L completo todavía (eso es Fase 7+).
- Sidebar: "Costos" pasó de link plano a grupo (Registro de costos / Nómina),
  mismo patrón que "Personal" y "Configuración". Se agregó "Cuentas contables"
  al grupo de Configuración.
- Migración: no hubo `Cost` ni `BudgetItem` con datos reales en la BD (0 filas
  en ambas tablas, verificado antes de tocar el schema) — no hizo falta migrar
  ni pedir instrucciones sobre qué hacer con datos existentes.

## Estado (Fase 7)

- Tab **Presupuesto** del proyecto: pasó de placeholder a real. Árbol
  Partida → Línea con columnas Cant/P.U./Importe/Real/Desv./%, expandible por
  partida (colapsado/expandido es estado de UI en memoria, no persistido).
  "Real" nunca suma `Cost` y `TimeEntry` para la misma cuenta (regla #11): para
  cuentas normales es `Σ Cost.amount` por `accountId`+`projectId`; para "2.8
  Nómina Operativa" es `Σ TimeEntry.amount` del proyecto — verificado que
  ambas fuentes son mutuamente excluyentes (Nómina Operativa es `isSystem`,
  estructuralmente imposible de capturar como `Cost` desde Fase 6).
- `BudgetItem.qty`/`unitPrice` se volvieron nullable (antes eran obligatorios)
  porque una PARTIDA y una línea `isCalculated` nunca los usan — regla #9
  reescrita para reflejar el diseño real de dos niveles en vez de la
  descripción especulativa que traía desde Fase 0.
- **Regla #14 (Materia Prima calculada):** la línea "2.1 Materia prima" de
  cada partida se crea/actualiza sola (`asignarElementoPartidaAction` →
  `asegurarLineaMateriaPrima`) cuando un elemento se asigna o se quita de esa
  partida, y además SIEMPRE se recalcula en vivo desde
  `Σ Element.totalCost` en `getPresupuestoProyecto` — el valor guardado en
  `BudgetItem.amount` es solo un caché de escritura, nunca la fuente de
  verdad que se muestra. Esto la vuelve auto-sanadora: si un elemento se
  soft-elimina por cualquier otro camino (p. ej. editando el proyecto), la
  línea calculada refleja el monto correcto en la siguiente lectura sin
  necesidad de un hook de recálculo en ese otro flujo.
- Asignación elemento → partida: select inline en el tab Elementos
  (`asignarElementoPartidaAction`, gateado por el permiso `presupuestos`, no
  por `elementos` — es una operación de presupuesto). `Element.budgetItemId`
  apunta siempre a la PARTIDA (nodo raíz), nunca a una línea.
- Select de cuentas para agregar línea a una partida (`cuentasParaPartida`,
  nueva en `costAccountTypes.ts`): distinto del `cuentasCapturables` de
  Fase 6 — aquí SÍ se ofrece "2.8 Nómina Operativa" (el enunciado es
  explícito: "aquí SÍ se presupuesta" aunque su costo real nunca se capture
  como `Cost`), pero se excluye "2.1 Materia prima" porque esa línea nace
  sola. Solo cuentas nivel 2 (`isProject`) — los niveles 3/4/5 son gasto de
  empresa, fuera del presupuesto de un proyecto (regla #13).
- Permisos: el módulo `presupuestos` ya existía desde Fase 0 con la matriz
  exacta pedida (Admin T, Gerente E, Capturista V) — cero cambios en
  `usuariosSeed.ts`/`usuariosTypes.ts` en esta fase.
- **Bug real encontrado y corregido en esta fase:** el estado de
  expandir/colapsar partidas se inicializaba una sola vez con
  `useState(new Set(partidas.map(p => p.id)))` — una partida creada
  DESPUÉS del primer render (vía `router.refresh()`) nunca entraba a ese
  Set, así que nacía colapsada y su línea recién agregada quedaba invisible
  aunque sí se había guardado correctamente en BD. Se corrigió invirtiendo
  el estado a "colapsadas" (opt-out) en vez de "expandidas" (opt-in): con
  eso, cualquier partida nueva nace expandida por default sin necesitar
  sincronización manual. Encontrado verificando con Playwright, no
  reportado por el usuario.
- Verificado con Playwright (`test.describe.serial`, 4 tests con `expect()`
  reales): crear partida + línea manual, confirmando que "2.1 Materia
  prima" NUNCA aparece en el select de líneas; asignar dos elementos a una
  partida y confirmar que la línea calculada sube exactamente a la suma de
  sus `totalCost` ($10,000 → $15,000) sin botones de editar/eliminar;
  quitar un elemento y confirmar que la línea baja de vuelta ($15,000 →
  $10,000); capturar un `Cost` real de $3,000 en una cuenta normal y un
  `TimeEntry` de $520 y confirmar que "Real" de cada línea toma el número
  correcto de la fuente correcta (Cost para la cuenta normal, TimeEntry
  para Nómina Operativa). Datos de prueba (2 `Element`, 1 `TimeEntry`, 1
  `Cost`, 1 partida con 3 líneas) limpiados al terminar.

## Estado (Fase 8)

- Tab **Estimaciones** del proyecto: pasó de placeholder a real. Lista
  (# · Periodo · Avance · Bruto · Retención · Amortiz. · Neto · Estatus) con
  footer "Facturado acumulado". Modal de alta/edición (`EstimacionModal.tsx`)
  con preview en vivo (debounce 300ms + guard de "última petición gana", mismo
  patrón `requestIdRef` que `CapturaTab` desde Fase 5): el avance acumulado se
  muestra como texto, nunca como input — es imposible teclearlo.
- Pipeline de cálculo único (`calcularEstimacion` en `estimacionesActions.ts`)
  compartido entre el preview (`previsualizarEstimacionAction`, solo lectura)
  y el guardado autoritativo (`crearEstimacionAction`/`actualizarEstimacionAction`,
  dentro de transacción) — el cliente nunca manda avance/montos calculados, solo
  periodo y, opcionalmente, el bruto sobrescrito.
- Reglas #15 (avance nunca retrocede) y #16 (amortización con tope) documentadas
  arriba. Flujo de estados BORRADOR → ENVIADA → AUTORIZADA → PAGADA con
  `enviarEstimacionAction`/`autorizarEstimacionAction`/`marcarPagadaEstimacionAction`;
  "regresar a Borrador" (`regresarABorradorAction`) exige `permiso.eliminar`
  (el único distintivo de Administrador vs. Gerente en este sistema) y limpia
  `authorizedAt`/`paidAt` porque dejan de ser válidos.
- Ficha del proyecto (tab Resumen): grid de 7 cards nuevas (Contrato, Facturado,
  Por facturar, Anticipo, Amortizado, Saldo anticipo, Retenido acumulado) vía
  `getResumenFacturacion()` — reemplazó el grid de 4 cards de Fase 2; Retención
  % y Días transcurridos se movieron a la "Ficha del proyecto" (dl) para no
  perderlos.
- Módulo global `/estimaciones`: pasó de placeholder a lista de cobranza de
  TODAS las estimaciones de todos los proyectos, con filtros (proyecto,
  estatus, rango de fechas) y totales (facturado, retenido, por cobrar —
  este último solo `AUTORIZADA` sin pagar, la cuenta por cobrar real).
- Permisos: el módulo `estimaciones` ya tenía la matriz exacta pedida
  (Admin T, Gerente E, Capturista V) desde Fase 0 — cero cambios en
  `usuariosSeed.ts`. "Autorizar/marcar pagada: solo T o E" se resuelve solo
  con `permiso.editar` (V de Capturista no lo tiene); "regresar a Borrador:
  solo T" se resuelve con `permiso.eliminar` (nadie más que Admin lo tiene en
  todo el sistema).
- Cambio de schema no pedido explícitamente: `Estimate.grossAmountManual`
  (booleano) — necesario para poder mostrar "sobrescrito manualmente" en la
  UI sin ambigüedad; sin este campo no había forma de distinguir un bruto
  calculado que por coincidencia diera el mismo número que uno tecleado a
  mano.
- **Bug real encontrado y corregido en esta fase:** el modal de nueva
  estimación inicializaba `periodStart` y `periodEnd` los dos en la fecha de
  HOY — un rango inválido (`periodStart` debe ser antes que `periodEnd`), así
  que toda estimación nueva nacía mostrando el error de validación de periodo
  en vez del preview, obligando al usuario a tocar una fecha antes de poder
  ver nada. Se corrigió con un default sensato: el mes calendario actual
  completo (mismo formato que el ejemplo del enunciado, "01-31 Jul 2026").
  Encontrado verificando con Playwright, no reportado por el usuario.
- Verificado con Playwright (`test.describe.serial`, 5 tests con `expect()`
  reales): el avance acumulado se pre-calcula desde los elementos y se
  muestra como texto no editable, con los montos exactos del ejemplo del
  enunciado (bruto $1,800,000, retención $90,000, amortización $360,000,
  neto $1,350,000 sobre un contrato de $4,500,000 con 40% de avance); una
  estimación Autorizada ya no muestra botón Editar; la amortización topa
  correctamente contra el saldo de anticipo disponible ($540,000) en vez
  del cálculo sin tope ($600,000); el avance del periodo negativo se
  bloquea con el mensaje exacto pedido; y "Facturado acumulado" solo cuenta
  estimaciones Autorizada/Pagada. Datos de prueba (1 `Element`, hasta 2
  `Estimate`) limpiados al terminar.

## Estado (Fase 9)

- **Tab P&L del proyecto (Parte A):** pasó de placeholder a real —
  `getPnlProyecto()` en `getPnl.ts` junta ingreso (Estimate), costo directo
  (Cost), MO aplicada (TimeEntry), presupuesto (BudgetItem vía
  `getPresupuestoProyecto`, reutilizado tal cual porque ya resuelve la línea
  calculada de Materia Prima — regla #14) en un solo DTO. Desglose por cuenta
  con presupuesto/% de consumo/semáforo, MARGEN BRUTO, CONTROL PRESUPUESTAL
  (desviación) y PROYECCIÓN AL CIERRE (EAC) con alerta roja grande si el
  margen proyectado es negativo. Donut de composición de costo (recharts,
  primera vez que se usa en el repo — ya estaba en `package.json`).
- **Módulo `/pnl` (Parte B + C):** dos vistas en tabs —
  **Comparativo de proyectos** (tabla ordenable por columna, clic en un
  renglón navega a `?tab=pnl` del proyecto — se agregó lectura de
  `useSearchParams` en `ProyectoDetalleView` para que el tab inicial respete
  la URL, algo que no existía antes) con gráfica de barras Ingreso/Costo
  real/Presupuesto por proyecto; y **P&L de Empresa** (Estado de Resultados
  con filtro de periodo mes/trimestre/año/rango custom, línea de evolución
  mensual). `getComparativoProyectos()` reutiliza `getPnlProyecto()` por
  proyecto vía `Promise.all` (paralelo, no secuencial) en vez de duplicar la
  fórmula del margen/EAC en dos lugares — el número de proyectos activos es
  chico, no justifica una consulta cross-proyecto más compleja.
- **Regla #12 (MO ociosa) implementada de verdad por primera vez:**
  `calcularMoOciosa()` en `pnlTypes.ts` = `PayrollPeriod(OPERATIVA)` del
  periodo − `Σ TimeEntry` de TODOS los proyectos en ese periodo (empresa
  completa, nunca por proyecto). Vive únicamente en el P&L de Empresa —
  verificado con Playwright que el comparativo de proyectos y el P&L por
  proyecto NUNCA la suman al costo real de una obra.
- **Optimización de queries (regla explícita de esta fase):** se corrigieron
  dos funciones heredadas de fases anteriores que traían filas completas a
  memoria para sumarlas en JS —
  `getManoDeObraAplicadaProyecto`/`getResumenFacturacion`— ahora usan
  `prisma.aggregate`. Se agregaron `getCostoDirectoProyecto` y
  `getCostosPorCuentaProyecto` (`groupBy`) en `getCostos.ts`. Todas las
  sumas del P&L (por proyecto, comparativo, y empresa) se agregan en BD.
- **Permisos:** el módulo `pnl` ya tenía Admin=T y Gerente=V desde Fase 0;
  se agregó el caso faltante — Capturista pasó de ver=true (heredado del
  branch genérico) a ver=false explícito, y el link "P&L" del sidebar ahora
  se filtra server-side según ese permiso (`layout.tsx`), cumpliendo "oculta
  el módulo" literalmente y no solo a nivel de contenido de página. La
  distinción Parte A (Admin+Gerente) vs. Parte B (solo Admin) se resolvió
  con `permiso.eliminar` como señal de "es Administrador" — mismo patrón que
  "regresar a Borrador" en Estimaciones (Fase 8), sin inventar una dimensión
  de permiso nueva.
- Verificado con Playwright (`test.describe.serial`, 4 tests con `expect()`
  reales, más una verificación directa contra BD): en el tab P&L del
  proyecto, "Nómina Operativa" (2.8) muestra exactamente el monto del
  `TimeEntry` de prueba y NUNCA pudo venir de `Cost` (se confirmó además que
  cero filas de `Cost` existen con esa cuenta — estructuralmente imposible
  desde Fase 6); ingreso/costo real/margen bruto/EAC cuadran exactamente con
  los números calculados a mano; en el P&L de Empresa, la MO ociosa se
  calcula correctamente y la utilidad neta cuadra; y el comparativo de
  proyectos muestra el costo real SIN la ociosidad sumada (180,000, nunca
  200,000). Datos de prueba (1 `Element`, 1 `TimeEntry`, 2 `Cost`, 1
  `Estimate`, 1 `PayrollPeriod`) limpiados al terminar.

## Estado (Fase 10)

- **Entry points del sidebar, por naturaleza del trabajo.** Los módulos
  vacíos (`horas-hombre`, `presupuestos`) pasaron de placeholder a un patrón
  de dos vistas: lista de proyectos (`PanelFiltros`, clic en un renglón) →
  vista de un solo proyecto en `/horas-hombre/[projectId]` y
  `/presupuestos/[projectId]`. Este patrón es correcto SOLO cuando el trabajo
  es intrínsecamente "por proyecto" (un supervisor captura horas de UNA obra
  a la vez). `costos` y `estimaciones` son transversales por naturaleza (la
  pregunta "¿qué tengo por cobrar/gastado?" cruza todos los proyectos) y NO
  se tocaron — seguían funcionando desde Fases 6/8, solo les faltaba el gate
  server-side (ver abajo). `elementos` (catálogo maestro) tampoco se tocó.
- **Componentes de tab extraídos a `comprador/_components/`** (antes vivían
  solo dentro de `proyectos/[id]/_components/`, atados al detalle de
  proyecto): `CapturaTab` + sus paneles (`PanelHoras`, `PanelAvance`),
  `HorasTab` y `PresupuestoTab`. Todos ya eran autocontenidos (reciben
  `projectId`/`clienteId`/datos/`permiso` por props, sin depender del estado
  de `ProyectoDetalleView`), así que la extracción fue mover archivo + ajustar
  imports, sin reescribir lógica — se reutilizan tal cual tanto en el tab del
  detalle de proyecto como en `/horas-hombre/[projectId]` y
  `/presupuestos/[projectId]`.
- **`/horas-hombre` agrega `getProyectosParaHorasHombre`** (`getCaptura.ts`):
  h-h acumuladas y fecha de última captura por proyecto, agregadas en BD
  (`groupBy` + `_sum`/`_max`, mismo principio de Fase 9 — nunca traer
  `TimeEntry` completos a memoria solo para sumarlos en JS). Filtro de
  estatus nace en `EN_CURSO` (opt-in a ver el resto): es la vista de trabajo
  diario, no el archivo histórico.
- **Matriz de permisos de Capturista, redefinida.** El rol pasó de "captura
  costos y horas-hombre, solo lectura en el resto" a un supervisor de campo
  puro: `horas-hombre`+`captura` con escritura (sin eliminar);
  `proyectos`+`personal`+`elementos` solo lectura (necesaria para ubicar
  qué capturar); **sin ningún acceso — ni de lectura —** a `costos`,
  `presupuestos`, `estimaciones`, `pnl` ni `configuracion`. Antes tenía
  lectura en `presupuestos`/`estimaciones` y control total de `costos`;
  ese acceso se retiró porque expone materia prima, subcontratos y márgenes
  de la obra, información que no le corresponde a un rol de campo. Ver
  matriz completa en la sección "Permisos" arriba.
- **Gateo de tabs del detalle de proyecto, por permiso real (regla de
  seguridad de esta fase).** Antes solo el tab P&L se ocultaba según
  permiso; Presupuesto/Costos/Estimaciones se renderizaban siempre,
  visibles para cualquiera con acceso al proyecto (Capturista incluido).
  Ahora los cuatro tabs financieros se filtran de `tabsVisibles` por su
  propio `permiso*.ver` (se agregó `permisoCostos`, antes no existía a nivel
  de tab). Defensa en profundidad, no solo UI: `proyectos/[id]/page.tsx`
  (server) solo hace `getPresupuestoProyecto`/`getCostosProyecto`/
  `getManoDeObraAplicadaProyecto`/`getEstimacionesProyecto`/`getPnlProyecto`
  cuando el permiso correspondiente tiene `ver` — si no, el dato ni siquiera
  viaja en el payload al cliente (antes `pnl` se calculaba y enviaba siempre,
  aunque el tab no lo renderizara). Además, si la URL trae
  `?tab=presupuesto|costos|estimaciones|pnl` sin permiso, la página
  redirige server-side antes de renderizar nada (rebote real, no solo un
  tab vacío).
- **Auditoría completa de gate server-side en las rutas del sidebar.** A
  partir del hallazgo de que `/estimaciones` (lista de cobranza, Fase 8) no
  tenía NINGÚN chequeo de permiso — cualquier usuario autenticado podía
  teclear la URL y ver todas las estimaciones de todos los proyectos — se
  revisaron las ~20 páginas de `comprador/`. Varias solo pasaban `permiso`
  a su vista para ocultar botones de crear/editar, pero nunca bloqueaban el
  acceso a la página en sí (`proyectos`, `elementos`, `costos`,
  `costos/nomina`, `configuracion/cuentas`); otras tres no fetcheaban
  `permiso` en absoluto (`personal/empleados`, `personal/cuadrillas`,
  `personal/cuadrillas/[id]`, `configuracion/catalogos`,
  `configuracion/roles`, `configuracion/usuarios` — este último expone alta
  de usuarios y asignación de roles, el hallazgo más serio de la auditoría).
  Las 10 páginas se corrigieron con el mismo patrón ya usado en `pnl/page.tsx`
  desde Fase 9: `const permiso = await getPermisoModulo(...); if
  (!permiso.ver) notFound();` antes de cualquier fetch de datos.
- **Sidebar generalizado.** `layout.tsx` filtraba antes solo el link de P&L;
  ahora cada entrada (y cada hijo dentro de un grupo) declara su módulo de
  permisos y se oculta si falta `ver` — un grupo (Costos/Personal/
  Configuración) desaparece completo si ninguno de sus hijos es visible.
- **Bug real encontrado y corregido en esta fase (`proxy.ts`, no relacionado
  al pedido original pero bloqueaba el rebote server-side pedido).** El
  rewrite que agrega el código de cliente por default
  (`NextResponse.rewrite(new URL(`/${CODIGO}${pathname}`, nextUrl))`)
  construía la URL destino solo con el pathname, sin el `search` — por cómo
  resuelve `URL` una referencia absoluta de ruta, el query string se perdía
  por completo en CADA request bajo `/comprador/*` e `/inicio/*` (o sea,
  toda la app). `searchParams` en cualquier Server Component de esas
  secciones venía siempre vacío sin importar la URL real en el navegador —
  el rebote `?tab=pnl` que se agregó en esta fase nunca redirigía porque el
  `tab` que el servidor leía era siempre `undefined`. Se corrigió clonando
  `nextUrl` (`nextUrl.clone()`) y solo reescribiendo `pathname`, en vez de
  construir la URL desde cero. Encontrado con Playwright (el debug log del
  servidor mostraba `tab: undefined` para una request con `?tab=pnl` en la
  URL), no reportado por el usuario.
- Verificado con Playwright end-to-end contra el dev server real (44
  aserciones, usuarios de prueba Capturista/Gerente creados y borrados al
  terminar): sidebar de Capturista muestra solo Proyectos/Elementos/
  Horas-hombre/Personal y oculta Presupuestos/Costos(+Nómina)/Estimaciones/
  P&L/Configuración; tabs del detalle de proyecto filtrados igual;
  `?tab=pnl|costos|presupuesto|estimaciones` tecleado a mano rebota al
  servidor (limpia el query string) antes de renderizar; acceso directo a
  `/presupuestos`, `/costos`, `/configuracion/usuarios`, `/estimaciones`,
  `/pnl` renderiza el boundary `not-found` (nota: este dev server con
  Turbopack responde HTTP 200 aunque `notFound()` se haya disparado — el
  payload SSR sí trae `digest: NEXT_HTTP_ERROR_FALLBACK;404` y el
  `<meta name="next-error" content="not-found">`, confirmado con curl; el
  contenido protegido nunca se renderiza, es una particularidad del status
  code en dev, no una fuga real); `/horas-hombre` lista proyectos y navega a
  `/horas-hombre/[id]` con Captura+Horas únicamente y "Volver a proyectos"
  funcional; como Gerente, `/presupuestos` sigue el mismo patrón reusando
  `PresupuestoTab`, y `/estimaciones` conserva la lista de cobranza cruzada
  intacta.
- **Bug de seguridad corregido de inmediato tras reportarlo (prioridad sobre
  el resto de la fase, a petición del usuario — bloqueaba dar de alta a
  cualquier persona real).** `crearUsuarioAction`/`actualizarUsuarioAction`
  (`usuariosActions.ts`) guardaban `Usuario.password` tal cual venía del
  formulario ("Passwords stored as-is for this MVP" decía el comentario
  original), pero el login (`app/login/actions.ts`) compara con
  `bcrypt.compare` — todo usuario creado o con contraseña cambiada desde
  Configuración → Usuarios quedaba con una contraseña que nunca podría volver
  a iniciar sesión. Se corrigió hasheando con `bcrypt.hash(pwd, 12)` (mismo
  cost factor que `usuariosSeed.ts` y `cambiar-password/actions.ts`, la única
  otra ruta de escritura de contraseña del sistema, que ya estaba correcta)
  antes de escribir en BD, en ambas acciones.
- **Segundo bug encontrado en el mismo archivo mientras se auditaba "todos
  los puntos donde se escribe una contraseña" (pedido explícito del
  usuario).** `actualizarUsuarioAction` recibía `password: null` en CADA
  edición donde el campo de contraseña se dejaba en blanco (el objeto
  `datos` en `UsuariosView.tsx` siempre incluía la llave, nunca la omitía) —
  cualquier edición rutinaria de un usuario (cambiar rol, activar/desactivar)
  sin retecelar la contraseña la borraba silenciosamente, dejando a esa
  persona sin poder entrar. Se corrigió en `UsuariosView.tsx`: en modo
  "editar", dejar el campo en blanco ahora omite `password` del payload
  (`undefined` = "no tocar"), y solo se manda un valor explícito al escribir
  una contraseña nueva o al cambiar a Microsoft SSO (ahí sí se limpia a
  propósito). `actualizarUsuarioAction` ya distinguía `undefined` de `null`
  correctamente — el bug estaba en qué le mandaba el caller, no en la acción.
- **Auditoría de escritura de contraseñas (pedida explícitamente):** el
  único otro punto que escribe `Usuario.password` es
  `cambiar-password/actions.ts` (`cambiarPasswordAction`), que ya hasheaba
  correctamente con cost 12 desde antes — sin cambios.
  `generarPasswordTemporal.ts` existe (generador criptográficamente seguro
  de contraseñas temporales, con un comentario que promete hasheo con
  bcrypt) pero no está conectado a ningún flujo real todavía — código muerto,
  no es una ruta de escritura.
- **Migración de datos existentes:** se auditó la BD completa (1 usuario con
  password, el admin sembrado por `usuariosSeed.ts`) — su hash ya era bcrypt
  válido, cero usuarios en texto plano encontrados. No hizo falta hashear ni
  resetear nada; el bug existía en el código pero nadie había alcanzado a
  crear un usuario con él todavía.
- Verificado con Playwright end-to-end contra el dev server real: login
  como Admin → Configuración → Usuarios → crear usuario con rol Capturista y
  contraseña → toast de éxito → logout → login con ese email/contraseña
  nuevos → entra correctamente (aterriza en `/cambiar-password` por
  `primerAcceso=true`, el flujo de primer acceso ya existente, no
  `/login` de vuelta). Confirmado además por consulta directa a BD que el
  campo `password` guardado tiene el formato `$2b$12$...` (bcrypt real, no
  texto plano). Usuario de prueba borrado al terminar.
