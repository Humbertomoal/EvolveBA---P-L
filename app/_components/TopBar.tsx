"use client";

import { IconLogout, IconMenu2 } from "@tabler/icons-react";
import { usePageHeaderTitle } from "./PageHeaderContext";
import { useSidebarState } from "./SidebarStateContext";

type UsuarioInfo = {
  nombre: string;
  email: string;
  rolNombre: string | null;
};

export default function TopBar({
  usuario,
  logoutAction,
}: {
  usuario: UsuarioInfo;
  logoutAction: () => Promise<void>;
}) {
  const titulo = usePageHeaderTitle();
  const { toggleMobileOpen } = useSidebarState();

  const iniciales = usuario.nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-4 shadow-card sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleMobileOpen}
          title="Abrir menú"
          className="shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-700 md:hidden"
        >
          <IconMenu2 className="h-5 w-5" />
        </button>
        <h1 className="truncate text-lg font-semibold text-zinc-900">{titulo}</h1>
      </div>

      <div className="flex items-center gap-3">
        {usuario.rolNombre && (
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
            {usuario.rolNombre}
          </span>
        )}

        <div className="flex items-center gap-2.5 pl-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {iniciales}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900">{usuario.nombre}</p>
            <p className="truncate text-xs text-zinc-500">{usuario.email}</p>
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="shrink-0 rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <IconLogout className="h-[18px] w-[18px]" />
          </button>
        </form>
      </div>
    </header>
  );
}
