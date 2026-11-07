/**
 * Zona waktu resmi aplikasi: UTC+7 (Asia/Jakarta / WIB)
 */
export const APP_TIMEZONE = "Asia/Jakarta";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function parseDateInput(
  dateInput: string | number | Date | null | undefined,
): Date | null {
  if (!dateInput) {
    return null;
  }
  const date =
    typeof dateInput === "string" || typeof dateInput === "number"
      ? new Date(dateInput)
      : dateInput;
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format tanggal standar aplikasi: dd/mm/yy 24h (UTC+7 / Asia/Jakarta)
 * Contoh output: "05/11/26 18:05"
 */
export function formatAppDateTime(
  dateInput: string | number | Date | null | undefined,
): string {
  const date = parseDateInput(dateInput);
  if (!date) {
    return "—";
  }

  const parts = dateTimeFormatter.formatToParts(date);
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${m.day}/${m.month}/${m.year} ${m.hour}:${m.minute}`;
}

/**
 * Format waktu standar aplikasi: HH:mm 24h (UTC+7 / Asia/Jakarta)
 * Contoh output: "18:05"
 */
export function formatAppTime(
  dateInput: string | number | Date | null | undefined,
): string {
  const date = parseDateInput(dateInput);
  if (!date) {
    return "—";
  }

  const parts = timeFormatter.formatToParts(date);
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${m.hour}:${m.minute}`;
}
