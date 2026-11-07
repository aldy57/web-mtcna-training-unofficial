import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { deleteMaterialSchema, upsertMaterialSchema } from "../lib/materials.ts";
import type { QuestionBankData } from "../lib/types.ts";

const QUESTIONS_JSON_PATH = resolve(process.cwd(), "data/questions.json");

describe("lib/materials — Validasi Sumber Materi & Integritas Data", () => {
  it("memvalidasi skema upsertMaterialSchema dengan benar untuk input valid", () => {
    const validPayload = {
      id: "S30",
      title: "VLAN on Bridge in RouterOS v7",
      url: "https://help.mikrotik.com/docs/spaces/ROS/pages/328068/Bridging+and+Switching#BridgingandSwitching-BridgeVLANFiltering",
      description: "Konfigurasi VLAN filtering pada bridge RouterOS v7.",
    };

    const res = upsertMaterialSchema.safeParse(validPayload);
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.id, "S30");
      assert.equal(res.data.title, "VLAN on Bridge in RouterOS v7");
      assert.equal(res.data.description, "Konfigurasi VLAN filtering pada bridge RouterOS v7.");
    }
  });

  it("menolak ID yang mengandung spasi atau karakter ilegal", () => {
    const invalidIdPayload = {
      id: "S 30 / ILLEGAL",
      title: "Judul Materi",
      url: "https://help.mikrotik.com/docs/",
    };

    const res = upsertMaterialSchema.safeParse(invalidIdPayload);
    assert.equal(res.success, false);
  });

  it("menolak URL yang tidak valid atau tidak berawalan http/https", () => {
    const invalidUrlPayload = {
      id: "S31",
      title: "Judul Materi",
      url: "ftp://files.mikrotik.com/docs",
    };

    const res = upsertMaterialSchema.safeParse(invalidUrlPayload);
    assert.equal(res.success, false);
  });

  it("menolak judul materi yang terlalu pendek", () => {
    const shortTitlePayload = {
      id: "S32",
      title: "ab",
      url: "https://help.mikrotik.com",
    };

    const res = upsertMaterialSchema.safeParse(shortTitlePayload);
    assert.equal(res.success, false);
  });

  it("memvalidasi deleteMaterialSchema dengan id yang wajib diisi", () => {
    const valid = deleteMaterialSchema.safeParse({ id: "S01" });
    assert.equal(valid.success, true);

    const empty = deleteMaterialSchema.safeParse({ id: "   " });
    assert.equal(empty.success, false);
  });

  it("memastikan data fallback bank soal memuat tepat 29 referensi (S01 s/d S29)", () => {
    const bank = JSON.parse(readFileSync(QUESTIONS_JSON_PATH, "utf8")) as QuestionBankData;
    const refKeys = Object.keys(bank.references);

    assert.equal(refKeys.length, 29);
    assert.ok(bank.references["S01"], "Referensi S01 harus ada");
    assert.ok(bank.references["S29"], "Referensi S29 harus ada");

    for (const [id, ref] of Object.entries(bank.references)) {
      assert.equal(ref.id, id);
      assert.ok(ref.title.length > 0, `Judul ${id} tidak boleh kosong`);
      assert.ok(ref.url.startsWith("http"), `URL ${id} harus berawalan http`);
    }
  });
});
