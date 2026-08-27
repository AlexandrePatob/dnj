import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("pastoral rules isolate the direct-access boundary", async () => {
  const rules = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");

  assert.match(rules, /match \/config\/\{document=\*\*\}/);
  assert.match(rules, /match \/queue\/\{document=\*\*\}/);
  assert.match(rules, /match \/calledPeople\/\{document=\*\*\}/);
  assert.match(rules, /match \/\{document=\*\*\}/);
  assert.match(rules, /allow read, write: if true/);
  assert.match(rules, /allow read, write: if false/);
});
