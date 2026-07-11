import { prisma } from "./prisma";
import { calcularAvancePct } from "./avanceProyecto";
import type {
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

  return proyectos.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    clientName: p.clientName,
    type: p.type,
    contractAmount: p.contractAmount.toNumber(),
    status: p.status,
    startDate: p.startDate.toISOString(),
    avancePct: calcularAvancePct(p.id),
  }));
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
    avancePct: calcularAvancePct(p.id),
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
    crewNombre: a.employee.crew?.name ?? null,
    hourlyCost: a.employee.hourlyCost.toNumber(),
  }));
}

export async function getEmpleadosParaAsignar(
  projectId: string,
  clienteId = "default"
): Promise<EmpleadoParaAsignarDTO[]> {
  const [empleados, asignados] = await Promise.all([
    prisma.employee.findMany({
      where: { clienteId, active: true, deletedAt: null },
      include: { crew: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.projectAssignment.findMany({
      where: { projectId, removedAt: null },
      select: { employeeId: true },
    }),
  ]);

  const asignadosIds = new Set(asignados.map((a) => a.employeeId));

  return empleados.map((e) => ({
    id: e.id,
    name: e.name,
    role: e.role,
    crewId: e.crewId,
    crewNombre: e.crew?.name ?? null,
    isLeader: e.isLeader,
    yaAsignado: asignadosIds.has(e.id),
  }));
}
