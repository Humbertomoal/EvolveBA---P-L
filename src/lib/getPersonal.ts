import { prisma } from "./prisma";
import type { CuadrillaDetalleDTO, CuadrillaDTO, EmpleadoDTO } from "./personalTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function getEmpleados(clienteId = "default"): Promise<EmpleadoDTO[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empleados: any[] = await db.employee.findMany({
      where: { clienteId, deletedAt: null },
      include: { crew: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    return empleados.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
      role: e.role,
      hourlyCost: e.hourlyCost.toString(),
      active: e.active,
      isLeader: e.isLeader,
      crewId: e.crewId,
      crewNombre: e.crew?.name ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getEmpleadosDisponibles(clienteId = "default"): Promise<EmpleadoDTO[]> {
  const empleados = await getEmpleados(clienteId);
  return empleados.filter((e) => e.active && !e.crewId);
}

export async function getCuadrillas(clienteId = "default"): Promise<CuadrillaDTO[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cuadrillas: any[] = await db.crew.findMany({
      where: { clienteId, deletedAt: null },
      include: {
        leader: { select: { name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
    return cuadrillas.map((c) => ({
      id: c.id,
      name: c.name,
      leaderId: c.leaderId,
      leaderNombre: c.leader.name,
      active: c.active,
      miembrosCount: c._count.members,
    }));
  } catch {
    return [];
  }
}

export async function getCuadrillaDetalle(id: string): Promise<CuadrillaDetalleDTO | null> {
  try {
    const c = await db.crew.findUnique({
      where: { id },
      include: {
        leader: { select: { name: true } },
        members: {
          where: { deletedAt: null },
          select: { id: true, code: true, name: true, role: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { members: true } },
      },
    });
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      leaderId: c.leaderId,
      leaderNombre: c.leader.name,
      active: c.active,
      miembrosCount: c._count.members,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      miembros: c.members.map((m: any) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        role: m.role,
      })),
    };
  } catch {
    return null;
  }
}
