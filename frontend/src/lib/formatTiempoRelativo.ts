const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function formatTiempoRelativo(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now(); // negative for past
  const diffSeconds = Math.round(diff / 1000);
  const diffMinutes = Math.round(diff / 60_000);
  const diffHours = Math.round(diff / 3_600_000);
  const diffDays = Math.round(diff / 86_400_000);

  const absSeconds = Math.abs(diffSeconds);
  const absMinutes = Math.abs(diffMinutes);
  const absHours = Math.abs(diffHours);
  const absDays = Math.abs(diffDays);

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second');
  } else if (absMinutes < 60) {
    return rtf.format(diffMinutes, 'minute');
  } else if (absHours < 24) {
    return rtf.format(diffHours, 'hour');
  } else if (absDays < 30) {
    return rtf.format(diffDays, 'day');
  } else {
    const diffMonths = Math.round(diff / (30 * 86_400_000));
    return rtf.format(diffMonths, 'month');
  }
}
