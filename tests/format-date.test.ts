import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APP_TIMEZONE, formatAppDateTime, formatAppTime } from "@/lib/format-date";

describe("lib/format-date — Standar Zona Waktu UTC+7 (dd/mm/yy 24h)", () => {
  it("mengonfirmasi konstanta zona waktu resmi aplikasi adalah Asia/Jakarta", () => {
    assert.equal(APP_TIMEZONE, "Asia/Jakarta");
  });

  it("mengonversi tanggal ISO UTC ke UTC+7 dengan format dd/mm/yy HH:mm 24h", () => {
    // 12:15 UTC = 19:15 UTC+7 (WIB)
    const isoUtc = "2026-11-07T12:15:00.000Z";
    assert.equal(formatAppDateTime(isoUtc), "07/11/26 19:15");

    // Jam siang 13:00 UTC+7 (06:00 UTC)
    const middayUtc = "2026-05-15T06:00:00.000Z";
    assert.equal(formatAppDateTime(middayUtc), "15/05/26 13:00");
  });

  it("menangani pergantian tanggal saat waktu UTC+7 melewati tengah malam", () => {
    // 7 November 18:30 UTC = 8 November 01:30 UTC+7
    const midnightCrossover = "2026-11-07T18:30:00.000Z";
    assert.equal(formatAppDateTime(midnightCrossover), "08/11/26 01:30");

    // Tepat tengah malam 00:00 UTC+7 (17:00 UTC hari sebelumnya)
    const exactMidnight = "2026-12-31T17:00:00.000Z";
    assert.equal(formatAppDateTime(exactMidnight), "01/01/27 00:00");
  });

  it("menerima input berupa Date object dan angka timestamp milidetik", () => {
    const dateObj = new Date("2026-08-17T03:00:00.000Z"); // 10:00 WIB
    assert.equal(formatAppDateTime(dateObj), "17/08/26 10:00");

    const timestampMs = dateObj.getTime();
    assert.equal(formatAppDateTime(timestampMs), "17/08/26 10:00");
  });

  it("mengembalikan strip panjang (—) untuk input null, undefined, atau string tidak valid", () => {
    assert.equal(formatAppDateTime(null), "—");
    assert.equal(formatAppDateTime(undefined), "—");
    assert.equal(formatAppDateTime(""), "—");
    assert.equal(formatAppDateTime("invalid-date-string"), "—");
  });

  it("memformat waktu saja dengan formatAppTime (HH:mm 24h UTC+7)", () => {
    assert.equal(formatAppTime("2026-11-07T12:15:00.000Z"), "19:15");
    assert.equal(formatAppTime("2026-11-07T17:00:00.000Z"), "00:00");
    assert.equal(formatAppTime("2026-11-07T02:05:00.000Z"), "09:05");
    assert.equal(formatAppTime(null), "—");
    assert.equal(formatAppTime("invalid"), "—");
  });
});

