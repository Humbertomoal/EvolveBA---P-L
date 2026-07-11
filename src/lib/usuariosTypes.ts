// Shared constants and types for the Usuarios/Roles module.
// No server imports — safe to use in Client Components.

export const MODULOS = [
  { key: "proyectos", label: "Proyectos" },
  { key: "presupuestos", label: "Presupuestos" },
  { key: "costos", label: "Costos" },
  { key: "horas-hombre", label: "Horas-hombre" },
  { key: "estimaciones", label: "Estimaciones" },
  { key: "pnl", label: "P&L" },
  { key: "personal", label: "Personal (Empleados y Cuadrillas)" },
  { key: "elementos", label: "Catálogo de Elementos" },
  { key: "captura", label: "Captura de Obra (avance y horas)" },
  { key: "configuracion", label: "Configuración (Catálogos, Usuarios y Roles)" },
] as const;

export type ModuloKey = (typeof MODULOS)[number]["key"];

export type RolPermisoDTO = {
  modulo: string;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
};

export type RolDTO = {
  id: string;
  nombre: string;
  descripcion: string | null;
  esAdmin: boolean;
  esSupervisor: boolean;
  clienteId: string;
  usuariosCount: number;
  permisos: RolPermisoDTO[];
};

export type UsuarioDTO = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  avatar: string | null;
  activo: boolean;
  usaMicrosoft: boolean;
  rolId: string;
  rolNombre: string;
  ultimoAcceso: string | null;
};
