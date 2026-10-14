import test from "node:test";
import assert from "node:assert/strict";
import { validateRun } from "./validate-run.mjs";
test("publication accepts only successful unified runs from the same repository", () => {
  const repository = "Yuqi-666/dBrain";
  const run = {
    id: 123,
    repository: { full_name: repository },
    head_repository: { full_name: repository },
    path: ".github/workflows/gate.yml",
    event: "push",
    status: "completed",
    conclusion: "success",
    head_sha: "a".repeat(40),
    run_attempt: 1,
  };
  assert.equal(validateRun(run, repository, "123"), run);
  assert.equal(
    validateRun({ ...run, event: "workflow_dispatch" }, repository, "123").event,
    "workflow_dispatch",
  );
  for (const change of [
    { conclusion: "failure" },
    { status: "in_progress" },
    { head_repository: { full_name: "other/fork" } },
    { path: ".github/workflows/release-candidate.yml" },
    { event: "pull_request" },
    { run_attempt: 0 },
    { id: 456 },
  ])
    assert.throws(() => validateRun({ ...run, ...change }, repository, "123"));
});
