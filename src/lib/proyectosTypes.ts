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
};

export type EmpleadoAsignadoDTO = {
  assignmentId: string;
  employeeId: string;
  name: string;
  role: string | null;
  crewNombre: string | null;
  hourlyCost: number;
};

export type EmpleadoParaAsignarDTO = {
  id: string;
  name: string;
  role: string | null;
  crewId: string | null;
  crewNombre: string | null;
  isLeader: boolean;
  yaAsignado: boolean;
};
