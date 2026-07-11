import { prisma } from "./prisma";
import { calcularAvancePct } from "./avanceProyecto";
import { getEmpleados } from "./getPersonal";
import type {
  ElementoProyectoDTO,
  EmpleadoAsignadoDTO,
  EmpleadoParaAsignarDTO,
  ProyectoDetalleDTO,
  ProyectoDTO,
} from "./proyectosTypes";

export async function getProyectos(clienteId = "default"): Promise<ProyectoDTO[]> {
  const proyectos = await prisma.project.findMany({
    where: { clienteId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    proyectos.map(async (p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      clientName: p.clientName,
      type: p.type,
      contractAmount: p.contractAmount.toNumber(),
      status: p.status,
      startDate: p.startDate.toISOString(),
      avancePct: await calcularAvancePct(p.id),
    }))
  );
}

export async function getProyectoDetalle(
  id: string,
  clienteId = "default"
): Promise<ProyectoDetalleDTO | null> {
  const p = await prisma.project.findFirst({
    where: { id, clienteId, deletedAt: null },
  });
  if (!p) return null;

  return {
    id: p.id,
    code: p.code,
    name: p.name,
    clientName: p.clientName,
    type: p.type,
    contractAmount: p.contractAmount.toNumber(),
    advanceAmount: p.advanceAmount.toNumber(),
    retentionPct: p.retentionPct.toNumber(),
    startDate: p.startDate.toISOString(),
    endDate: p.endDate ? p.endDate.toISOString() : null,
    status: p.status,
    notes: p.notes,
    avancePct: await calcularAvancePct(p.id),
  };
}

export async function getEmpleadosAsignados(projectId: string): Promise<EmpleadoAsignadoDTO[]> {
  const asignaciones = await prisma.projectAssignment.findMany({
    where: { projectId, removedAt: null },
    include: { employee: { include: { crew: { select: { name: true } } } } },
    orderBy: { assignedAt: "asc" },
  });

  return asignaciones.map((a) => ({
    assignmentId: a.id,
    employeeId: a.employeeId,
    name: a.employee.name,
    role: a.employee.role,
    crewId: a.employee.crewId,
    crewNombre: a.employee.crew?.name ?? null,
    hourlyCost: a.employee.hourlyCost.toNumber(),
  }));
}

// Renglones de Element ya persistidos, para precargar la tabla editable en
// editar. Trae los valores LIVE del ElementType (join), no el snapshot del
// Element, porque son los que necesita el botón "recalcular desde catálogo".
export async function getElementosProyecto(projectId: string): Promise<ElementoProyectoDTO[]> {
  const elementos = await prisma.element.findMany({
    where: { projectId, deletedAt: null },
    include: { elementType: true },
    orderBy: { createdAt: "asc" },
  });

  return elementos.map((e) => ({
    elementId: e.id,
    elementTypeId: e.elementTypeId ?? "",
    elementTypeName: e.elementType?.name ?? e.name,
    elementTypeFamily: e.elementType?.family ?? e.type,
    weightUnit: e.elementType?.weightUnit ?? "KG_PZA",
    weightValueCatalogo: e.elementType?.weightValue.toNumber() ?? e.weight.toNumber(),
    priceUnit: e.elementType?.priceUnit ?? "PZA",
    estimatedPriceCatalogo: e.elementType?.estimatedPrice.toNumber() ?? e.unitCost.toNumber(),
    code: e.code,
    qty: e.qty,
    length: e.length?.toNumber() ?? null,
    unitCost: e.unitCost.toNumber(),
  }));
}

// Picker de empleados activos reutilizado por el formulario de proyecto (nuevo/
// editar) y por el tab Personal del detalle — reusa getEmpleados (Fase 1) en vez
// de duplicar la query.
export async function getEmpleadosParaAsignar(clienteId = "default"): Promise<EmpleadoParaAsignarDTO[]> {
  const empleados = await getEmpleados(clienteId);
  return empleados
    .filter((e) => e.active)
    .map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
      role: e.role,
      crewId: e.crewId,
      crewNombre: e.crewNombre,
      isLeader: e.isLeader,
      hourlyCost: Number(e.hourlyCost),
    }));
}
