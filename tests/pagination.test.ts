import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculatePagination,
  getPaginationItems,
} from "../lib/pagination.ts";

describe("lib/pagination — calculatePagination", () => {
  it("menghitung totalPages, startIdx, dan endIdx dengan benar", () => {
    // 25 item, halaman 1, per halaman 10
    const res1 = calculatePagination(25, 1, 10);
    assert.equal(res1.totalPages, 3);
    assert.equal(res1.safePage, 1);
    assert.equal(res1.startIdx, 0);
    assert.equal(res1.endIdx, 10);

    // 25 item, halaman 3 (halaman terakhir)
    const res3 = calculatePagination(25, 3, 10);
    assert.equal(res3.totalPages, 3);
    assert.equal(res3.safePage, 3);
    assert.equal(res3.startIdx, 20);
    assert.equal(res3.endIdx, 25);

    // clamping jika currentPage melebihi totalPages
    const resOverflow = calculatePagination(25, 99, 10);
    assert.equal(resOverflow.safePage, 3);

    // clamping jika currentPage < 1
    const resUnderflow = calculatePagination(25, 0, 10);
    assert.equal(resUnderflow.safePage, 1);
  });
});

describe("lib/pagination — getPaginationItems", () => {
  it("mengembalikan semua nomor halaman saat totalPages <= 7", () => {
    assert.deepEqual(getPaginationItems(1, 1), [1]);
    assert.deepEqual(getPaginationItems(1, 3), [1, 2, 3]);
    assert.deepEqual(getPaginationItems(2, 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(getPaginationItems(4, 7), [1, 2, 3, 4, 5, 6, 7]);
  });

  it("menampilkan ellipsis di akhir saat berada di halaman awal (<= 4) untuk totalPages > 7", () => {
    assert.deepEqual(getPaginationItems(1, 10), [
      1,
      2,
      3,
      4,
      5,
      "ellipsis-end",
      10,
    ]);
    assert.deepEqual(getPaginationItems(4, 10), [
      1,
      2,
      3,
      4,
      5,
      "ellipsis-end",
      10,
    ]);
  });

  it("menampilkan ellipsis di awal saat berada di halaman akhir (>= totalPages - 3)", () => {
    assert.deepEqual(getPaginationItems(10, 10), [
      1,
      "ellipsis-start",
      6,
      7,
      8,
      9,
      10,
    ]);
    assert.deepEqual(getPaginationItems(7, 10), [
      1,
      "ellipsis-start",
      6,
      7,
      8,
      9,
      10,
    ]);
  });

  it("menampilkan ellipsis ganda saat berada di tengah halaman", () => {
    assert.deepEqual(getPaginationItems(5, 10), [
      1,
      "ellipsis-start",
      4,
      5,
      6,
      "ellipsis-end",
      10,
    ]);
    assert.deepEqual(getPaginationItems(6, 12), [
      1,
      "ellipsis-start",
      5,
      6,
      7,
      "ellipsis-end",
      12,
    ]);
  });
});
