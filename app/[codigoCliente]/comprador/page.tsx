import { PageTitle } from "@/app/_components/PageHeaderContext";

export default function CompradorHomePage() {
  return (
    <div className="max-w-3xl">
      <PageTitle title="Panel" />
      <p className="mt-1 text-sm text-zinc-500">
        Resumen general de tu actividad.
      </p>
    </div>
  );
}
