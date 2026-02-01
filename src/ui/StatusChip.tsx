type StatusChipProps = {
  status?: string;
  isActive?: boolean;
};

export default function StatusChip({ status, isActive }: StatusChipProps) {
  if (isActive !== undefined) {
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
        {isActive ? 'Ativo' : 'Inativo'}
      </span>
    );
  }

  if (!status) return null;

  const normalized = String(status).toUpperCase();
  if (normalized === 'OK') {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200">
        OK
      </span>
    );
  }
  if (normalized === 'COMPRAR') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200">
        COMPRAR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {status}
    </span>
  );
}
