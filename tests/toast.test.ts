import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  clearAllToasts,
  dismissToast,
  getToasts,
  showToast,
  subscribeToasts,
} from "../lib/toast.ts";

describe("lib/toast — Toast store & subscription", () => {
  beforeEach(() => {
    clearAllToasts();
  });

  it("dapat menambahkan toast baru dan membaca daftar toast aktif", () => {
    const id = showToast({
      type: "success",
      title: "Login Berhasil!",
      message: "Selamat datang kembali",
      duration: 5000,
    });

    const list = getToasts();
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, id);
    assert.equal(list[0]?.type, "success");
    assert.equal(list[0]?.title, "Login Berhasil!");
    assert.equal(list[0]?.duration, 5000);
  });

  it("dapat menghapus toast berdasarkan ID", () => {
    const id1 = showToast({
      type: "info",
      title: "Info 1",
    });
    const id2 = showToast({
      type: "warning",
      title: "Info 2",
    });

    assert.equal(getToasts().length, 2);

    dismissToast(id1);

    const remaining = getToasts();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0]?.id, id2);
  });

  it("memberitahu subscriber saat ada penambahan atau penghapusan toast", () => {
    let callCount = 0;
    const unsubscribe = subscribeToasts(() => {
      callCount++;
    });

    const id = showToast({
      type: "success",
      title: "Pemberitahuan",
    });
    assert.equal(callCount, 1);

    dismissToast(id);
    assert.equal(callCount, 2);

    unsubscribe();
    showToast({
      type: "error",
      title: "Error Baru",
    });
    // callCount tidak bertambah lagi setelah unsubscribe
    assert.equal(callCount, 2);
  });
});

