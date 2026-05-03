export default function SectionLabel({
  text,
  badge,
  badgeCls,
}: {
  text: string;
  badge: string;
  badgeCls: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
        {text}
      </h2>
      <span
        className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}
      >
        {badge}
      </span>
    </div>
  );
}
