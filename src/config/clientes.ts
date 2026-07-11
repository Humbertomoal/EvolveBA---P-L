export type Cliente = {
  id: string;
  codigo: string;
  nombreEmpresa: string;
  logoUrl: string;
  colorPrimario: string;
  colorSecundario: string;
  faviconUrl: string;
};

export const CODIGO_CLIENTE_DEFAULT = "demo";

export const clientes: Cliente[] = [
  {
    id: "cli_001",
    codigo: "demo",
    nombreEmpresa: "Constructora Demo",
    logoUrl: "/clientes/demo/logo.svg",
    colorPrimario: "#B45309",
    colorSecundario: "#78350F",
    faviconUrl: "/clientes/demo/logo.svg",
  },
];
