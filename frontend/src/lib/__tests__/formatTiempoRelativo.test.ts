import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatTiempoRelativo } from '../formatTiempoRelativo';

// ─────────────────────────────────────────────────────────────────
// formatTiempoRelativo — utilidad de tiempo relativo en español
// Cubre la utilidad usada en R15
// ─────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.useRealTimers();
});

describe('formatTiempoRelativo', () => {
  it('devuelve "hace 5 minutos" para una diferencia de 5 minutos', () => {
    const now = new Date('2026-06-08T12:00:00Z').getTime();
    vi.setSystemTime(now);
    const iso = new Date(now - 5 * 60_000).toISOString(); // 5 min ago
    const result = formatTiempoRelativo(iso);
    expect(result).toMatch(/5 minutos/);
  });

  it('devuelve "hace 2 horas" para una diferencia de 2 horas', () => {
    const now = new Date('2026-06-08T12:00:00Z').getTime();
    vi.setSystemTime(now);
    const iso = new Date(now - 2 * 3_600_000).toISOString(); // 2 hours ago
    const result = formatTiempoRelativo(iso);
    expect(result).toMatch(/2 horas/);
  });

  it('devuelve "hace 3 días" para una diferencia de 3 días', () => {
    const now = new Date('2026-06-08T12:00:00Z').getTime();
    vi.setSystemTime(now);
    const iso = new Date(now - 3 * 86_400_000).toISOString(); // 3 days ago
    const result = formatTiempoRelativo(iso);
    expect(result).toMatch(/3 días/);
  });

  it('devuelve una cadena en segundos para diferencias menores a 1 minuto', () => {
    const now = new Date('2026-06-08T12:00:00Z').getTime();
    vi.setSystemTime(now);
    const iso = new Date(now - 30_000).toISOString(); // 30 seconds ago
    const result = formatTiempoRelativo(iso);
    // e.g. "hace 30 segundos"
    expect(result).toMatch(/segundo/);
  });

  it('devuelve una cadena en meses para diferencias mayores a 30 días', () => {
    const now = new Date('2026-06-08T12:00:00Z').getTime();
    vi.setSystemTime(now);
    const iso = new Date(now - 60 * 86_400_000).toISOString(); // 60 days ago
    const result = formatTiempoRelativo(iso);
    // e.g. "hace 2 meses"
    expect(result).toMatch(/mes/);
  });
});
