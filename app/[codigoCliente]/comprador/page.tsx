import { PageTitle } from "@/app/_components/PageHeaderContext";
import { ensureUsuariosSeed } from "@/src/lib/usuariosSeed";
import { ensureCatalogosSeed } from "@/src/lib/catalogosSeed";
import { ensureProyectosSeed } from "@/src/lib/proyectosSeed";

export default async function CompradorHomePage() {
  const clienteId = "default";

  try {
    await ensureUsuariosSeed(clienteId);
    await ensureCatalogosSeed(clienteId);
    await ensureProyectosSeed(clienteId);
  } catch {
    // Migration not yet applied — seed skipped
  }

  return (
    <div className="max-w-3xl">
      <PageTitle title="Panel" />
      <p className="mt-1 text-sm text-zinc-500">
        Resumen general de tu actividad.
      </p>
    </div>
  );
}
