export default function AuthShell({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xl font-extrabold text-white tracking-tight">
            Habitflow
          </p>
          <p className="text-xs text-white/30 mt-1">
            Track · Analyze · Improve
          </p>
        </div>
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-accent-500 to-accent-400 px-6 py-5">
            <h1 className="text-lg font-extrabold text-white">{title}</h1>
            <p className="text-sm text-white/60 mt-0.5">{sub}</p>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
