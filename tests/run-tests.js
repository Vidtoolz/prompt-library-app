const assert = require("node:assert/strict");
const model = require("../prompt-model.js");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("legacy prompt with content becomes normalized prompt with body", () => {
  const prompt = model.normalizePrompt({
    id: "legacy-1",
    title: "Legacy",
    content: "Legacy prompt body",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-02T00:00:00.000Z",
  });

  assert.equal(prompt.body, "Legacy prompt body");
  assert.equal(prompt.content, "Legacy prompt body");
  assert.equal(prompt.created_at, "2026-04-01T00:00:00.000Z");
  assert.equal(prompt.updated_at, "2026-04-02T00:00:00.000Z");
});

test("v2 prompt with body remains valid", () => {
  const prompt = model.normalizePrompt({
    id: "v2-1",
    title: "V2",
    body: "V2 prompt body",
    folder: "Research",
    tags: ["analysis"],
    favorite: true,
    archived: false,
    version: 2,
    created_at: "2026-04-03T00:00:00.000Z",
    updated_at: "2026-04-04T00:00:00.000Z",
  });

  assert.equal(prompt.body, "V2 prompt body");
  assert.equal(prompt.version, 2);
  assert.equal(prompt.folder, "Research");
  assert.deepEqual(prompt.tags, ["analysis"]);
  assert.equal(prompt.favorite, true);
});

test("missing tags folder and favorite fields get defaults", () => {
  const prompt = model.normalizePrompt({
    id: "defaults-1",
    title: "Defaults",
    body: "Body",
  });

  assert.deepEqual(prompt.tags, []);
  assert.equal(prompt.folder, "Workspace");
  assert.equal(prompt.favorite, false);
  assert.equal(prompt.archived, false);
  assert.equal(prompt.version, 2);
});

test("export includes schemaVersion and counts", () => {
  const payload = model.buildExportPayload([
    { id: "a", title: "A", body: "One", favorite: true },
    { id: "b", title: "B", body: "Two", archived: true },
  ]);

  assert.equal(payload.version, 2);
  assert.equal(payload.schemaVersion, 2);
  assert.equal(payload.counts.prompts, 2);
  assert.equal(payload.counts.archived, 1);
  assert.equal(payload.counts.favorites, 1);
});

test("import accepts v2 backup", () => {
  const backup = model.buildExportPayload([
    { id: "v2-import", title: "Import", body: "Backup body", folder: "Ops" },
  ]);
  const result = model.normalizeImportedPrompts(backup);

  assert.equal(result.ok, true);
  assert.equal(result.prompts.length, 1);
  assert.equal(result.prompts[0].body, "Backup body");
  assert.equal(result.prompts[0].folder, "Ops");
});

test("import accepts legacy prompt array", () => {
  const result = model.normalizeImportedPrompts([
    { id: "legacy-array", title: "Legacy Array", content: "Legacy array body" },
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.prompts.length, 1);
  assert.equal(result.prompts[0].body, "Legacy array body");
});

test("invalid JSON and import shape are rejected", () => {
  const invalidJson = model.parseImportJson("{not json");
  const invalidShape = model.normalizeImportedPrompts({ prompts: "nope" });

  assert.equal(invalidJson.ok, false);
  assert.equal(invalidShape.ok, false);
});

let failures = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failures) {
  console.error(`${failures} test${failures === 1 ? "" : "s"} failed.`);
  process.exit(1);
}

console.log(`${tests.length} tests passed.`);
