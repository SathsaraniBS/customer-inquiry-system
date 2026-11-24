const STYLES = {
  "New": "bg-blue-100 text-blue-800",
  "In Progress": "bg-amber-100 text-amber-800",
  "Resolved": "bg-green-100 text-green-800",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STYLES[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}