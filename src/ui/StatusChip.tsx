type StatusChipProps = {
  status?: string;
  isActive?: boolean;
};

export default function StatusChip({ status, isActive }: StatusChipProps) {
  if (isActive !== undefined) {
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${isActive ? 'badge-success' : 'badge-danger'}`}>
        {isActive ? 'Ativo' : 'Inativo'}
      </span>
    );
  }

  if (!status) return null;

  const normalized = String(status).toUpperCase();
  if (normalized === 'OK') {
    return (
      <span className="badge badge-success">
        OK
      </span>
    );
  }
  if (normalized === 'COMPRAR') {
    return (
      <span className="badge badge-warning">
        COMPRAR
      </span>
    );
  }
  return (
    <span className="badge badge-neutral">
      {status}
    </span>
  );
}
