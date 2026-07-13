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
import { getPermisoModulo } from "@/src/lib/permisos";

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
  const [
    permisoProyectos,
    permisoPresupuestos,
    permisoElementos,
    permisoCostos,
    permisoHorasHombre,
    permisoEstimaciones,
    permisoPnl,
    permisoPersonal,
    permisoConfiguracion,
  ] = await Promise.all([
    getPermisoModulo("proyectos"),
    getPermisoModulo("presupuestos"),
    getPermisoModulo("elementos"),
    getPermisoModulo("costos"),
    getPermisoModulo("horas-hombre"),
    getPermisoModulo("estimaciones"),
    getPermisoModulo("pnl"),
    getPermisoModulo("personal"),
    getPermisoModulo("configuracion"),
  ]);

  type NavChildDef = { href: string; label: string; icon: React.ReactNode; ver: boolean };
  type NavItemDef = NavChildDef | { label: string; icon: React.ReactNode; children: NavChildDef[] };

  // Cada entrada declara el módulo de permisos que la gatea — si el rol no
  // tiene "ver" en ese módulo, ni el link ni (para los grupos) la sección
  // completa se renderizan. No basta con ocultar el contenido de la página:
  // el propio link no debe aparecer.
  const NAV_ITEMS_TODOS: NavItemDef[] = [
    {
      href: `${basePath}/comprador/proyectos`,
      label: "Proyectos",
      icon: <IconBuildingSkyscraper className={ICON_CLASSNAME} />,
      ver: permisoProyectos.ver,
    },
    {
      href: `${basePath}/comprador/presupuestos`,
      label: "Presupuestos",
      icon: <IconClipboardList className={ICON_CLASSNAME} />,
      ver: permisoPresupuestos.ver,
    },
    {
      href: `${basePath}/comprador/elementos`,
      label: "Elementos",
      icon: <IconRuler2 className={ICON_CLASSNAME} />,
      ver: permisoElementos.ver,
    },
    {
      label: "Costos",
      icon: <IconReceipt2 className={ICON_CLASSNAME} />,
      children: [
        {
          href: `${basePath}/comprador/costos`,
          label: "Registro de costos",
          icon: <IconReceipt2 className={ICON_CLASSNAME} />,
          ver: permisoCostos.ver,
        },
        {
          href: `${basePath}/comprador/costos/nomina`,
          label: "Nómina",
          icon: <IconCash className={ICON_CLASSNAME} />,
          ver: permisoCostos.ver,
        },
      ],
    },
    {
      href: `${basePath}/comprador/horas-hombre`,
      label: "Horas-hombre",
      icon: <IconClock className={ICON_CLASSNAME} />,
      ver: permisoHorasHombre.ver,
    },
    {
      href: `${basePath}/comprador/estimaciones`,
      label: "Estimaciones",
      icon: <IconFileInvoice className={ICON_CLASSNAME} />,
      ver: permisoEstimaciones.ver,
    },
    {
      href: `${basePath}/comprador/pnl`,
      label: "P&L",
      icon: <IconChartBar className={ICON_CLASSNAME} />,
      ver: permisoPnl.ver,
    },
    {
      label: "Personal",
      icon: <IconUsersGroup className={ICON_CLASSNAME} />,
      children: [
        {
          href: `${basePath}/comprador/personal/empleados`,
          label: "Empleados",
          icon: <IconUsers className={ICON_CLASSNAME} />,
          ver: permisoPersonal.ver,
        },
        {
          href: `${basePath}/comprador/personal/cuadrillas`,
          label: "Cuadrillas",
          icon: <IconUsersGroup className={ICON_CLASSNAME} />,
          ver: permisoPersonal.ver,
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
          ver: permisoConfiguracion.ver,
        },
        {
          href: `${basePath}/comprador/configuracion/cuentas`,
          label: "Cuentas contables",
          icon: <IconReceipt2 className={ICON_CLASSNAME} />,
          ver: permisoConfiguracion.ver,
        },
        {
          href: `${basePath}/comprador/configuracion/usuarios`,
          label: "Usuarios",
          icon: <IconUser className={ICON_CLASSNAME} />,
          ver: permisoConfiguracion.ver,
        },
        {
          href: `${basePath}/comprador/configuracion/roles`,
          label: "Roles",
          icon: <IconShield className={ICON_CLASSNAME} />,
          ver: permisoConfiguracion.ver,
        },
      ],
    },
  ];

  const NAV_ITEMS: NavItemDef[] = [];
  for (const item of NAV_ITEMS_TODOS) {
    if ("children" in item) {
      const children = item.children.filter((c) => c.ver);
      if (children.length > 0) NAV_ITEMS.push({ ...item, children });
    } else if (item.ver) {
      NAV_ITEMS.push(item);
    }
  }

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
