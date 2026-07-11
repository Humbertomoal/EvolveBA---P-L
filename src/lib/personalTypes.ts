// Shared constants and types for the Personal (Empleados/Cuadrillas) module.
// No server imports — safe to use in Client Components.

export type EmpleadoDTO = {
  id: string;
  code: string | null;
  name: string;
  role: string | null;
  hourlyCost: string;
  active: boolean;
  isLeader: boolean;
  crewId: string | null;
  crewNombre: string | null;
};

export type CuadrillaDTO = {
  id: string;
  name: string;
  leaderId: string;
  leaderNombre: string;
  active: boolean;
  miembrosCount: number;
};

export type CuadrillaMiembroDTO = {
  id: string;
  code: string | null;
  name: string;
  role: string | null;
};

export type CuadrillaDetalleDTO = CuadrillaDTO & {
  miembros: CuadrillaMiembroDTO[];
};
