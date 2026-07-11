import { auth } from "@/src/auth";
import { prisma } from "./prisma";

export type PermisoModulo = {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
};

const SIN_PERMISO: PermisoModulo = { ver: false, crear: false, editar: false, eliminar: false };

export async function getPermisoModulo(modulo: string): Promise<PermisoModulo> {
  const session = await auth();
  if (!session?.user?.id) return SIN_PERMISO;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id as string },
    select: { rolId: true },
  });
  if (!usuario) return SIN_PERMISO;

  const permiso = await prisma.rolPermiso.findUnique({
    where: { rolId_modulo: { rolId: usuario.rolId, modulo } },
  });
  if (!permiso) return SIN_PERMISO;

  return { ver: permiso.ver, crear: permiso.crear, editar: permiso.editar, eliminar: permiso.eliminar };
}
