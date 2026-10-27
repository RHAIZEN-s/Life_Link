// Calendar dates (donations, eligibility) follow Indian Standard Time.
export function todayIst() {
  return new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
