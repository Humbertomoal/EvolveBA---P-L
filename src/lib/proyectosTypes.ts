// Shared constants and types for the Proyectos module.
// No server imports — safe to use in Client Components.

import type { ProjectStatus } from "@prisma/client";

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "PLANEACION", label: "Planeación" },
  { value: "EN_CURSO", label: "En curso" },
  { value: "SUSPENDIDA", label: "Suspendida" },
  { value: "CERRADA", label: "Cerrada" },
];

export type ProyectoDTO = {
  id: string;
  code: string;
  name: string;
  clientName: string;
  type: string | null;
  contractAmount: number;
  status: ProjectStatus;
  startDate: string;
  avancePct: number;
};

export type ProyectoDetalleDTO = {
  id: string;
  code: string;
  name: string;
  clientName: string;
  type: string | null;
  contractAmount: number;
  advanceAmount: number;
  retentionPct: number;
  startDate: string;
  endDate: string | null;
  status: ProjectStatus;
  notes: string | null;
  avancePct: number;
};

export type ProyectoFormInput = {
  code: string;
  name: string;
  clientName: string;
  type: string | null;
  contractAmount: number;
  advanceAmount: number;
  retentionPct: number;
  startDate: string;
  endDate: string | null;
  status: ProjectStatus;
  notes: string | null;
  employeeIds: string[];
  elementos: ElementoProyectoFormInput[];
};

// Renglón de Element ya persistido, para precargar el formulario en editar.
// Trae los valores LIVE del ElementType (no el snapshot) porque son los que se
// usan para "recalcular desde catálogo" y para saber si el largo aplica.
export type ElementoProyectoDTO = {
  elementId: string;
  elementTypeId: string;
  elementTypeName: string;
  elementTypeFamily: string;
  weightUnit: string;
  weightValueCatalogo: number;
  priceUnit: string;
  estimatedPriceCatalogo: number;
  code: string;
  qty: number;
  length: number | null;
  unitCost: number;
};

// Lo que el formulario manda al server action. `id` presente = actualizar un
// Element existente; ausente = crear uno nuevo.
export type ElementoProyectoFormInput = {
  id?: string;
  elementTypeId: string;
  code: string;
  qty: number;
  length: number | null;
  unitCost: number;
};

export type EmpleadoAsignadoDTO = {
  assignmentId: string;
  employeeId: string;
  name: string;
  role: string | null;
  crewId: string | null;
  crewNombre: string | null;
  hourlyCost: number;
};

// Empleado activo disponible para el selector de personal (formulario y tab
// Personal). No depende de un proyecto — es el mismo picker en ambos lados.
export type EmpleadoParaAsignarDTO = {
  id: string;
  code: string | null;
  name: string;
  role: string | null;
  crewId: string | null;
  crewNombre: string | null;
  isLeader: boolean;
  hourlyCost: number;
};
