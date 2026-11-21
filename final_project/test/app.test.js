const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");

const originalSecret = process.env.SESSION_SECRET;
process.env.SESSION_SECRET = "test-session-secret-for-node-test-suite-123456";

const { createApp } = require("../index");
const app = createApp();
const server = app.listen(0);
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  if (originalSecret === undefined) {
    delete process.env.SESSION_SECRET;
  } else {
    process.env.SESSION_SECRET = originalSecret;
  }
});

test("health endpoint returns a structured success response", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("unfinished public routes return 501 rather than a redirect status", async () => {
  const cases = [
    ["GET", "/"],
    ["POST", "/register"],
    ["GET", "/isbn/1"],
    ["GET", "/author/Chinua%20Achebe"],
    ["GET", "/title/Things%20Fall%20Apart"],
    ["GET", "/review/1"],
  ];

  for (const [method, path] of cases) {
    const response = await fetch(`${baseUrl}${path}`, { method });
    assert.equal(response.status, 501, `${method} ${path} should be explicitly marked as unfinished`);
  }
});

test("unfinished customer routes return 501", async () => {
  const response = await fetch(`${baseUrl}/customer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "sample", password: "not-a-real-password" }),
  });
  assert.equal(response.status, 501);
});
