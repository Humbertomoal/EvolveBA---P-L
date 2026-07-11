import {
  IconListDetails,
  IconSettings,
  IconShield,
  IconUser,
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
      label: "Configuración",
      icon: <IconSettings className={ICON_CLASSNAME} />,
      children: [
        {
          href: `${basePath}/comprador/configuracion/catalogos`,
          label: "Catálogos",
          icon: <IconListDetails className={ICON_CLASSNAME} />,
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
          seccion="Comprador"
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
