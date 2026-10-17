/**
 * The upload hook and the TypeScript storage contract must agree.
 *
 * `pb/pb_hooks/lib/storage-limits.js` repeats the defaults, the category table
 * and the MIME table because PocketBase's hook runtime cannot import TypeScript.
 * This test loads the hook through a `node:vm` context (the same way
 * `edge-hook.test.mjs` loads the edge validator) and compares both copies:
 *
 *   * defaults and environment parsing,
 *   * the category every known extension maps to,
 *   * the enforcement itself — the ceiling, the quota, and the metadata the hook
 *     stamps on the record.
 *
 * It also pins the wiring: `files.pb.js` must call the module for every create
 * request, or the policy would simply not run.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

import * as contract from "../../packages/utils/src/storage-limits.ts";

const HOOK_SOURCE = readFileSync(
  new URL("../../pb/pb_hooks/lib/storage-limits.js", import.meta.url),
  "utf8",
);

/**
 * Copies a value out of the hook's `node:vm` realm.
 *
 * Values built inside the context have that realm's `Object.prototype`, and
 * `assert.deepEqual` (strict) compares prototypes, so the comparison has to be
 * made on plain JSON shapes.
 */
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Loads the hook module with a fake `$os` and fake PocketBase error classes. */
function loadHook(env = {}) {
  class BadRequestError extends Error {}
  class UnauthorizedError extends Error {}
  const scope = {
    module: { exports: {} },
    BadRequestError,
    UnauthorizedError,
    $os: {
      getenv: (name) => env[name],
    },
  };
  runInNewContext(HOOK_SOURCE, scope);
  return { ...scope.module.exports, BadRequestError, UnauthorizedError };
}

test("the hook repeats the TypeScript defaults", () => {
  const hook = loadHook();
  assert.deepEqual(plain(hook.DEFAULT_LIMITS), contract.DEFAULT_STORAGE_LIMITS);
  assert.deepEqual(plain(hook.CATEGORY_EXTENSIONS), {
    image: [
      "png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg", "ico",
      "heic", "heif", "tif", "tiff",
    ],
    video: [
      "mp4", "m4v", "mov", "webm", "mkv", "avi", "mpg", "mpeg", "ogv", "3gp",
      "ts", "m3u8",
    ],
    audio: [
      "mp3", "wav", "ogg", "oga", "flac", "m4a", "aac", "opus", "wma", "aiff",
      "aif",
    ],
    pdf: ["pdf"],
  });
});

test("the hook classifies every known extension exactly like the contract", () => {
  const hook = loadHook();
  for (const [category, extensions] of Object.entries(hook.CATEGORY_EXTENSIONS)) {
    for (const extension of extensions) {
      const fileName = `fixture.${extension}`;
      assert.equal(
        hook.categoryForName(fileName),
        category,
        `${fileName}: hook category`,
      );
      assert.equal(
        contract.storageCategoryFor(fileName),
        category,
        `${fileName}: contract category`,
      );
      // The MIME type the hook writes must classify back to the same category
      // through the contract's MIME-first path.
      const mimeType = hook.mimeTypeForName(fileName);
      assert.equal(
        contract.storageCategoryFor(fileName, mimeType),
        category,
        `${fileName}: contract category from ${mimeType}`,
      );
    }
  }

  for (const name of ["archive.zip", "no-extension", ".gitignore", "trailing."]) {
    assert.equal(hook.categoryForName(name), "other", name);
    assert.equal(contract.storageCategoryFor(name), "other", name);
  }
});

test("the hook resolves the same limits from the same environment", () => {
  const environments = [
    {},
    {
      DBRAIN_STORAGE_USER_QUOTA_BYTES: "0",
      DBRAIN_STORAGE_MAX_IMAGE_BYTES: "1024",
      DBRAIN_STORAGE_MAX_VIDEO_BYTES: "2048",
    },
    {
      DBRAIN_STORAGE_USER_QUOTA_BYTES: "not-a-number",
      DBRAIN_STORAGE_MAX_IMAGE_BYTES: "-1",
      DBRAIN_STORAGE_MAX_VIDEO_BYTES: "1.5",
      DBRAIN_STORAGE_MAX_AUDIO_BYTES: "",
      DBRAIN_STORAGE_MAX_PDF_BYTES: "99999999999999999999",
    },
  ];

  for (const env of environments) {
    assert.deepEqual(
      plain(loadHook(env).resolveLimits()),
      contract.resolveStorageLimits(env),
    );
  }
});

/** A PocketBase-shaped create event the hook can be called with. */
function createEvent({
  auth = { id: "owner" },
  files = [{ originalName: "photo.png", name: "photo.png", size: 100 }],
  existingSizes = [],
} = {}) {
  const values = new Map();
  const event = {
    auth,
    values,
    record: {
      set: (key, value) => values.set(key, value),
      getString: (key) => values.get(key) ?? "",
      getUnsavedFiles: () => files,
    },
    app: {
      findRecordsByFilter: () =>
        existingSizes.map((size) => ({ getFloat: () => size })),
    },
    next: () => "saved",
  };
  return event;
}

test("the hook stamps owner, size, MIME type and default display name", () => {
  const hook = loadHook();
  const event = createEvent();
  assert.equal(hook.enforceFileCreate(event), "saved");
  assert.equal(event.values.get("ownerId"), "owner");
  assert.equal(event.values.get("size"), 100);
  assert.equal(event.values.get("mimeType"), "image/png");
  assert.equal(event.values.get("displayName"), "photo.png");
});

test("an unauthenticated create is rejected", () => {
  const hook = loadHook();
  assert.throws(
    () => hook.enforceFileCreate(createEvent({ auth: null })),
    /Authentication required/,
  );
});

test("the category ceiling is enforced", () => {
  const hook = loadHook({ DBRAIN_STORAGE_MAX_IMAGE_BYTES: "50" });
  const event = createEvent({
    files: [{ originalName: "photo.png", name: "photo.png", size: 51 }],
  });
  assert.throws(() => hook.enforceFileCreate(event), /image limit is 50/);
});

test("the per-user quota counts what is already stored", () => {
  const hook = loadHook({ DBRAIN_STORAGE_USER_QUOTA_BYTES: "1000" });

  // 900 stored + 100 incoming fits exactly.
  const fits = createEvent({
    files: [{ originalName: "photo.png", name: "photo.png", size: 100 }],
    existingSizes: [400, 500],
  });
  assert.equal(hook.enforceFileCreate(fits), "saved");

  const exceeds = createEvent({
    files: [{ originalName: "photo.png", name: "photo.png", size: 101 }],
    existingSizes: [900],
  });
  assert.throws(() => hook.enforceFileCreate(exceeds), /Storage quota exceeded/);
});

test("a zero quota disables only the total check", () => {
  const hook = loadHook({ DBRAIN_STORAGE_USER_QUOTA_BYTES: "0" });
  const event = createEvent({
    files: [{ originalName: "photo.png", name: "photo.png", size: 100 }],
    existingSizes: [10 * 1024 ** 3],
  });
  assert.equal(hook.enforceFileCreate(event), "saved");
});

test("files.pb.js routes every create request through the hook module", () => {
  const source = readFileSync(
    new URL("../../pb/pb_hooks/files.pb.js", import.meta.url),
    "utf8",
  );
  assert.match(source, /lib\/storage-limits\.js/);
  assert.match(source, /enforceFileCreate/);
  assert.match(source, /onRecordCreateRequest/);
});
