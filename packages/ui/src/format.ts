export function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function formatEta(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} hr`;
  const days = Math.round(minutes / (24 * 60));
  return `${days} day${days > 1 ? "s" : ""}`;
}

export function formatSavings(mrpPaise: number, pricePaise: number): string | null {
  if (mrpPaise <= pricePaise) return null;
  const pct = Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
  return `Save ₹${Math.round((mrpPaise - pricePaise) / 100)} · ${pct}%`;
}
