import { prisma } from "./prisma";

type SeedCuenta = {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
  order: number;
  isProject: boolean;
  isSystem?: boolean;
};

// Estructura contable real de la empresa (Fase 6). Los códigos "2", "3", "4",
// "5" son los nodos de grupo (padres); sus hijos son las cuentas hoja.
const CUENTAS: SeedCuenta[] = [
  { code: "2", name: "Costos operativos", level: 2, parentCode: null, order: 1, isProject: true },
  { code: "2.1", name: "Materia prima", level: 2, parentCode: "2", order: 1, isProject: true },
  { code: "2.2", name: "Otros insumos", level: 2, parentCode: "2", order: 2, isProject: true },
  { code: "2.3", name: "Oxígeno y gas", level: 2, parentCode: "2", order: 3, isProject: true },
  { code: "2.4", name: "Primario / esmalte", level: 2, parentCode: "2", order: 4, isProject: true },
  { code: "2.5", name: "Soldadura", level: 2, parentCode: "2", order: 5, isProject: true },
  { code: "2.6", name: "Diesel y gasolina", level: 2, parentCode: "2", order: 6, isProject: true },
  { code: "2.7", name: "Renta de maquinaria", level: 2, parentCode: "2", order: 7, isProject: true },
  { code: "2.8", name: "Nómina Operativa", level: 2, parentCode: "2", order: 8, isProject: true, isSystem: true },
  { code: "2.9", name: "Herramienta", level: 2, parentCode: "2", order: 9, isProject: true },
  { code: "2.10", name: "Otros operativos", level: 2, parentCode: "2", order: 10, isProject: true },

  { code: "3", name: "Gastos administrativos", level: 3, parentCode: null, order: 2, isProject: false },
  { code: "3.1", name: "Telefonía y sistemas", level: 3, parentCode: "3", order: 1, isProject: false },
  { code: "3.2", name: "Agua", level: 3, parentCode: "3", order: 2, isProject: false },
  { code: "3.3", name: "Energía", level: 3, parentCode: "3", order: 3, isProject: false },
  { code: "3.4", name: "Mantenimiento", level: 3, parentCode: "3", order: 4, isProject: false },
  { code: "3.5", name: "Nómina Administrativa", level: 3, parentCode: "3", order: 5, isProject: false, isSystem: true },
  { code: "3.6", name: "Otros administrativos", level: 3, parentCode: "3", order: 6, isProject: false },

  { code: "4", name: "Publicidad y marketing", level: 4, parentCode: null, order: 3, isProject: false },
  { code: "4.1", name: "Publicidad", level: 4, parentCode: "4", order: 1, isProject: false },
  { code: "4.2", name: "Marketing", level: 4, parentCode: "4", order: 2, isProject: false },

  { code: "5", name: "Impuestos", level: 5, parentCode: null, order: 4, isProject: false },
  { code: "5.1", name: "ISR e IVA", level: 5, parentCode: "5", order: 1, isProject: false },
  { code: "5.2", name: "IMSS", level: 5, parentCode: "5", order: 2, isProject: false },
  { code: "5.3", name: "Estatales", level: 5, parentCode: "5", order: 3, isProject: false },
];

export async function ensureCostAccountsSeed(clienteId = "default") {
  // Dos pasadas: primero los padres (parentCode null), luego los hijos, para
  // poder resolver parentId por code sin depender del orden del arreglo.
  const idPorCode = new Map<string, string>();

  for (const c of CUENTAS.filter((c) => c.parentCode === null)) {
    const cuenta = await prisma.costAccount.upsert({
      where: { clienteId_code: { clienteId, code: c.code } },
      update: {},
      create: {
        clienteId,
        code: c.code,
        name: c.name,
        level: c.level,
        parentId: null,
        order: c.order,
        isProject: c.isProject,
        isSystem: c.isSystem ?? false,
      },
    });
    idPorCode.set(c.code, cuenta.id);
  }

  for (const c of CUENTAS.filter((c) => c.parentCode !== null)) {
    const parentId = idPorCode.get(c.parentCode!) ?? null;
    await prisma.costAccount.upsert({
      where: { clienteId_code: { clienteId, code: c.code } },
      update: {},
      create: {
        clienteId,
        code: c.code,
        name: c.name,
        level: c.level,
        parentId,
        order: c.order,
        isProject: c.isProject,
        isSystem: c.isSystem ?? false,
      },
    });
  }
}
