const STYLES = {
  "New": { badge: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  "In Progress": { badge: "bg-amber-50 text-amber-900 ring-amber-200", dot: "bg-amber-500" },
  "Resolved": { badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
};

// Colour + dot + text, so status never depends on colour alone.
export default function StatusBadge({ status }) {
  const s = STYLES[status] || { badge: "bg-gray-100 text-gray-700 ring-gray-200", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}