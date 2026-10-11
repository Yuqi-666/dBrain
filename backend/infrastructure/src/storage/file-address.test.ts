import test from "node:test";
import assert from "node:assert/strict";
// File path logic has no dependencies on native modules or the database.
import { toFileEndpointPath } from "./file-address.ts";
test("deployment and desktop gateway addresses resolve only to stored files", () => {
  for (const prefix of ["", "https://example.test", "https://example.test/pb", "/session/abcdef"]) {
    assert.equal(toFileEndpointPath(`${prefix}/api/files/files/abcdef123456789/sample.pdf`), "/api/files/files/abcdef123456789/sample.pdf");
  }
  for (const url of ["http://169.254.169.254/latest/meta-data", "/api/files/files/a/../../health", "/api/collections/users/records", "/api/files/files/a/name/extra"]) {
    assert.throws(() => toFileEndpointPath(url));
  }
});
