export default function StatCard({
  label,
  value,
  sub,
  accent,
  positive,
  negative,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        negative
          ? "bg-danger-50 border-danger-200"
          : "bg-card border-card-border"
      }`}
    >
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p
        className={`text-lg font-extrabold truncate leading-tight ${
          accent ? "text-accent-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-xs mt-0.5 font-bold ${
            positive
              ? "text-accent-500"
              : negative
                ? "text-danger-500"
                : "text-gray-400"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
