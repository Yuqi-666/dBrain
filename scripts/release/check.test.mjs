import test from "node:test";
import assert from "node:assert/strict";
import { checkRelease } from "./check.mjs";
test("release metadata is consistent and mismatched tags fail", async () => {
  assert.match(await checkRelease(), /^\d+\.\d+\.\d+/);
  await assert.rejects(checkRelease("v999.0.0"));
});
