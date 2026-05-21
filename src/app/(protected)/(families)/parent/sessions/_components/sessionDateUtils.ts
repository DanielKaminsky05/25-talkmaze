export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getDurationMin(startIso: string, endIso: string | null) {
  if (!endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const min = Math.round((end.getTime() - start.getTime()) / 60000);
  return Number.isFinite(min) && min > 0 ? min : null;
}
