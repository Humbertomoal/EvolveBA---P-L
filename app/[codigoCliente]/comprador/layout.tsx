import {
  IconBuildingSkyscraper,
  IconCash,
  IconChartBar,
  IconClipboardList,
  IconClock,
  IconFileInvoice,
  IconListDetails,
  IconReceipt2,
  IconRuler2,
  IconSettings,
  IconShield,
  IconUser,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import SidebarNav from "@/app/_components/SidebarNav";
import TopBar from "@/app/_components/TopBar";
import { PageHeaderProvider } from "@/app/_components/PageHeaderContext";
import { SidebarStateProvider } from "@/app/_components/SidebarStateContext";
import {
  CODIGO_CLIENTE_SIN_ESPECIFICAR,
  getClienteByCodigo,
} from "@/src/lib/getClienteByCodigo";
import { logoutAction } from "@/src/lib/authActions";
import { getUsuarioActual } from "@/src/lib/usuarioActual";

const ICON_CLASSNAME = "h-4 w-4 shrink-0";

export default async function CompradorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ codigoCliente: string }>;
}) {
  const { codigoCliente } = await params;
  const cliente = getClienteByCodigo(codigoCliente);

  if (!cliente) {
    return null;
  }

  const basePath =
    codigoCliente === CODIGO_CLIENTE_SIN_ESPECIFICAR ? "" : `/${codigoCliente}`;

  const usuarioActual = await getUsuarioActual();

  const NAV_ITEMS = [
    {
      href: `${basePath}/comprador/proyectos`,
      label: "Proyectos",
      icon: <IconBuildingSkyscraper className={ICON_CLASSNAME} />,
    },
    {
      href: `${basePath}/comprador/presupuestos`,
      label: "Presupuestos",
      icon: <IconClipboardList className={ICON_CLASSNAME} />,
    },
    {
      href: `${basePath}/comprador/elementos`,
      label: "Elementos",
      icon: <IconRuler2 className={ICON_CLASSNAME} />,
    },
    {
      label: "Costos",
      icon: <IconReceipt2 className={ICON_CLASSNAME} />,
      children: [
        {
          href: `${basePath}/comprador/costos`,
          label: "Registro de costos",
          icon: <IconReceipt2 className={ICON_CLASSNAME} />,
        },
        {
          href: `${basePath}/comprador/costos/nomina`,
          label: "Nómina",
          icon: <IconCash className={ICON_CLASSNAME} />,
        },
      ],
    },
    {
      href: `${basePath}/comprador/horas-hombre`,
      label: "Horas-hombre",
      icon: <IconClock className={ICON_CLASSNAME} />,
    },
    {
      href: `${basePath}/comprador/estimaciones`,
      label: "Estimaciones",
      icon: <IconFileInvoice className={ICON_CLASSNAME} />,
    },
    {
      href: `${basePath}/comprador/pnl`,
      label: "P&L",
      icon: <IconChartBar className={ICON_CLASSNAME} />,
    },
    {
      label: "Personal",
      icon: <IconUsersGroup className={ICON_CLASSNAME} />,
      children: [
        {
          href: `${basePath}/comprador/personal/empleados`,
          label: "Empleados",
          icon: <IconUsers className={ICON_CLASSNAME} />,
        },
        {
          href: `${basePath}/comprador/personal/cuadrillas`,
          label: "Cuadrillas",
          icon: <IconUsersGroup className={ICON_CLASSNAME} />,
        },
      ],
    },
    {
      label: "Configuración",
      icon: <IconSettings className={ICON_CLASSNAME} />,
      children: [
        {
          href: `${basePath}/comprador/configuracion/catalogos`,
          label: "Catálogos",
          icon: <IconListDetails className={ICON_CLASSNAME} />,
        },
        {
          href: `${basePath}/comprador/configuracion/cuentas`,
          label: "Cuentas contables",
          icon: <IconReceipt2 className={ICON_CLASSNAME} />,
        },
        {
          href: `${basePath}/comprador/configuracion/usuarios`,
          label: "Usuarios",
          icon: <IconUser className={ICON_CLASSNAME} />,
        },
        {
          href: `${basePath}/comprador/configuracion/roles`,
          label: "Roles",
          icon: <IconShield className={ICON_CLASSNAME} />,
        },
      ],
    },
  ];

  return (
    <SidebarStateProvider>
      <div
        className="flex min-h-screen"
        style={
          {
            "--color-primario": cliente.colorPrimario,
            "--color-secundario": cliente.colorSecundario,
          } as React.CSSProperties
        }
      >
        <SidebarNav
          nombreEmpresa={cliente.nombreEmpresa}
          logoUrl={cliente.logoUrl}
          seccion="P&L Construcción"
          panelHref={`${basePath}/comprador`}
          cambiarVistaHref={`${basePath}/inicio`}
          items={NAV_ITEMS}
        />
        <PageHeaderProvider>
          <div className="flex min-w-0 flex-1 flex-col">
            {usuarioActual && (
              <TopBar usuario={usuarioActual} logoutAction={logoutAction} />
            )}
            <main className="min-w-0 flex-1 bg-[#FEFBFB] p-4 sm:p-8">{children}</main>
          </div>
        </PageHeaderProvider>
      </div>
    </SidebarStateProvider>
  );
}
