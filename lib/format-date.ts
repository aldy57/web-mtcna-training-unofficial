/**
 * Format tanggal standar aplikasi: dd/mm/yy 24h
 * Contoh output: "05/11/26 18:05"
 */
export function formatAppDateTime(
  dateInput: string | number | Date | null | undefined,
): string {
  if (!dateInput) {
    return "—";
  }

  const date =
    typeof dateInput === "string" || typeof dateInput === "number"
      ? new Date(dateInput)
      : dateInput;

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yy} ${hh}:${min}`;
}

