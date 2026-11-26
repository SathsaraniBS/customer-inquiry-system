// "5 min ago", "3 h ago", "2 d ago". Returns "" when there is no date.
export function timeAgo(value) {
  if (!value) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(value).toLocaleDateString();
}

export function hoursSince(value) {
  if (!value) return 0;
  return (Date.now() - new Date(value).getTime()) / 36e5;
}