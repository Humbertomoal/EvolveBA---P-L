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

### Fórmulas del P&L (documentadas, aún no implementadas — Fase 8+)

```
Ingreso            = Σ Estimate.grossAmount  WHERE status IN (AUTORIZADA, PAGADA)
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
