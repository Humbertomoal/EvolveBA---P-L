import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const TODOS_MODULOS = [
  "proyectos", "presupuestos", "costos", "horas-hombre",
  "estimaciones", "pnl", "personal", "elementos", "captura", "configuracion",
];

// captura: pantalla unificada de avance+horas — el Capturista (supervisor de
// obra) la necesita para su trabajo del día a día, igual que horas-hombre.
const MODULOS_CAPTURISTA = ["horas-hombre", "captura"];

// costos/presupuestos/estimaciones/pnl: información financiera de la obra
// (materia prima, subcontratos, márgenes) — un supervisor de campo no la
// necesita para capturar horas y avance, y no debe verla ni siquiera de
// lectura. configuracion: administración del sistema, tampoco es su trabajo.
const MODULOS_SIN_ACCESO_CAPTURISTA = ["configuracion", "pnl", "costos", "presupuestos", "estimaciones"];

async function upsertRol(
  clienteId: string,
  nombre: string,
  descripcion: string,
  esAdmin: boolean,
  esSupervisor = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  let rol = await db.rol.findFirst({ where: { nombre, clienteId } });
  if (!rol) {
    rol = await db.rol.create({ data: { nombre, descripcion, esAdmin, esSupervisor, clienteId } });
  }
  return rol;
}

async function upsertPermiso(
  rolId: string,
  modulo: string,
  perms: { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean }
) {
  await db.rolPermiso.upsert({
    where: { rolId_modulo: { rolId, modulo } },
    update: perms,
    create: { rolId, modulo, ...perms },
  });
}

export async function ensureUsuariosSeed(clienteId = "default") {
  // ── Administrador: acceso total ──────────────────────────────────────────
  const admin = await upsertRol(clienteId, "Administrador", "Acceso total al sistema", true, false);
  for (const modulo of TODOS_MODULOS) {
    await upsertPermiso(admin.id, modulo, { ver: true, crear: true, editar: true, eliminar: true });
  }

  // ── Gerente: todo excepto configuración ──────────────────────────────────
  const gerente = await upsertRol(
    clienteId,
    "Gerente",
    "Supervisión operativa de proyectos, costos y P&L",
    false,
    true
  );
  for (const modulo of TODOS_MODULOS) {
    if (modulo === "configuracion") {
      await upsertPermiso(gerente.id, modulo, { ver: false, crear: false, editar: false, eliminar: false });
    } else if (modulo === "pnl") {
      // pnl es un dashboard calculado: no hay nada que crear/editar, solo ver.
      await upsertPermiso(gerente.id, modulo, { ver: true, crear: false, editar: false, eliminar: false });
    } else {
      await upsertPermiso(gerente.id, modulo, { ver: true, crear: true, editar: true, eliminar: false });
    }
  }

  // ── Capturista: supervisor de obra. Captura horas-hombre y avance; ve el
  // proyecto, su personal y sus elementos para poder capturar, pero no tiene
  // ningún acceso a información financiera (costos, presupuestos,
  // estimaciones, pnl) ni a configuración ──────────────────────────────────
  const capturista = await upsertRol(
    clienteId,
    "Capturista",
    "Supervisor de obra: captura horas-hombre y avance; sin acceso a información financiera",
    false,
    false
  );
  for (const modulo of TODOS_MODULOS) {
    if (MODULOS_SIN_ACCESO_CAPTURISTA.includes(modulo)) {
      await upsertPermiso(capturista.id, modulo, { ver: false, crear: false, editar: false, eliminar: false });
    } else if (MODULOS_CAPTURISTA.includes(modulo)) {
      await upsertPermiso(capturista.id, modulo, { ver: true, crear: true, editar: true, eliminar: false });
    } else {
      // proyectos, personal, elementos: solo lectura, necesaria para ubicar
      // el proyecto/cuadrilla/elemento correcto al capturar.
      await upsertPermiso(capturista.id, modulo, { ver: true, crear: false, editar: false, eliminar: false });
    }
  }

  // ── Usuario administrador del sistema ──────────────────────────────────────
  const adminEmail = "admin@plconstruccion.com";
  const existe = await db.usuario.findUnique({ where: { email: adminEmail } });
  if (!existe) {
    const passwordHash = await bcrypt.hash("Admin2026!", 12);
    await db.usuario.create({
      data: {
        nombre: "Admin",
        apellido: "P&L",
        email: adminEmail,
        password: passwordHash,
        activo: true,
        rolId: admin.id,
        clienteId,
        emailVerificado: true,
        primerAcceso: false,
        tipoUsuario: "comprador",
      },
    });
  }
}
