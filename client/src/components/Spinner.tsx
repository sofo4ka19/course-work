export default function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
