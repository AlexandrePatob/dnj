import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildServiceWorker, resolveRevision, writeFileAtomic } from "./build-service-worker.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function temporaryPath(filename: string) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "dnj-sw-"));
  temporaryDirectories.push(directory);
  return path.join(directory, filename);
}

describe("service worker build", () => {
  it("uses the Vercel git commit as deployment revision", () => {
    expect(resolveRevision({ VERCEL_GIT_COMMIT_SHA: "ABCDEF1234567890" }, ["source"])).toBe("abcdef123456");
  });

  it("uses the Vercel deployment id when no git commit is available", () => {
    expect(resolveRevision({ VERCEL_DEPLOYMENT_ID: "dpl_DNJ-2026" }, ["source"])).toBe("dpl-dnj-2026");
  });

  it("creates a deterministic local revision from relevant inputs", () => {
    expect(resolveRevision({}, ["worker", "policy"])).toBe(resolveRevision({}, ["worker", "policy"]));
  });

  it("changes the local revision when a relevant input changes", () => {
    expect(resolveRevision({}, ["worker", "policy-a"])).not.toBe(resolveRevision({}, ["worker", "policy-b"]));
  });

  it("bundles the worker and policy into one deployable file", async () => {
    const outputPath = await temporaryPath("sw.js");

    const result = await buildServiceWorker({ root: process.cwd(), outputPath, env: { VERCEL_GIT_COMMIT_SHA: "abc123" } });

    expect(result.contents).toContain('var revision = "abc123"');
    expect(result.contents).not.toMatch(/\b(import|export)\s/);
    expect(result.contents).not.toContain("__PWA_REVISION__");
  });

  it("produces byte-identical output for identical builds", async () => {
    const firstPath = await temporaryPath("first.js");
    const secondPath = await temporaryPath("second.js");

    await buildServiceWorker({ root: process.cwd(), outputPath: firstPath, env: {} });
    await buildServiceWorker({ root: process.cwd(), outputPath: secondPath, env: {} });

    expect(await readFile(firstPath)).toEqual(await readFile(secondPath));
  });

  it("fails when the worker source is missing", async () => {
    const outputPath = await temporaryPath("sw.js");

    await expect(buildServiceWorker({ root: process.cwd(), entryPath: "src/pwa/missing.ts", outputPath })).rejects.toThrow(
      "Service worker source not found",
    );
  });

  it("writes complete output atomically without leaving the temporary file", async () => {
    const outputPath = await temporaryPath("sw.js");
    const contents = "complete worker";

    await writeFileAtomic(outputPath, contents);

    expect(await readFile(outputPath, "utf8")).toBe(contents);
    await expect(readFile(`${outputPath}.${process.pid}.tmp`, "utf8")).rejects.toThrow();
  });
});
