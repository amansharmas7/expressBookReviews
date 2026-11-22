const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");

const originalSessionSecret = process.env.SESSION_SECRET;
const originalJwtSecret = process.env.JWT_SECRET;
process.env.SESSION_SECRET = "test-session-secret-12345678901234567890";
process.env.JWT_SECRET = "test-jwt-secret-12345678901234567890";

const { createApp } = require("../index");
const { resetUsers, users } = require("../router/auth_users");
const books = require("../router/booksdb");
const app = createApp();
const server = app.listen(0);
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  baseUrl = "http://127.0.0.1:" + address.port;
});

beforeEach(() => {
  resetUsers();
  for (const book of Object.values(books)) book.reviews = {};
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSessionSecret;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

async function jsonRequest(path, method = "GET", body, token) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = "Bearer " + token;
  return fetch(baseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function registerAndLogin(username = "alice") {
  const registration = await jsonRequest("/register", "POST", {
    username,
    password: "correct-horse-battery",
    email: username + "@example.com",
  });
  assert.equal(registration.status, 201);
  const login = await jsonRequest("/customer/login", "POST", {
    username,
    password: "correct-horse-battery",
  });
  assert.equal(login.status, 200);
  return (await login.json()).token;
}

test("health endpoint returns a structured success response", async () => {
  const response = await jsonRequest("/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("registration validates input, hashes passwords, and rejects duplicate usernames", async () => {
  const invalid = await jsonRequest("/register", "POST", {
    username: "a",
    password: "short",
  });
  assert.equal(invalid.status, 400);

  const missing = await jsonRequest("/register", "POST", null);
  assert.equal(missing.status, 400);

  const response = await jsonRequest("/register", "POST", {
    username: "Alice_1",
    password: "correct-horse-battery",
    email: "ALICE@example.com",
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.user.username, "Alice_1");
  assert.equal(payload.user.email, "alice@example.com");
  assert.equal(users.length, 1);
  assert.notEqual(users[0].passwordHash, "correct-horse-battery");
  assert.ok(users[0].salt);

  const duplicate = await jsonRequest("/register", "POST", {
    username: "alice_1",
    password: "another-password",
  });
  assert.equal(duplicate.status, 409);
});

test("login rejects invalid credentials and returns a signed JWT for valid credentials", async () => {
  await jsonRequest("/register", "POST", {
    username: "alice",
    password: "correct-horse-battery",
  });

  const invalid = await jsonRequest("/customer/login", "POST", {
    username: "alice",
    password: "wrong-password",
  });
  assert.equal(invalid.status, 401);

  const login = await jsonRequest("/customer/login", "POST", {
    username: "alice",
    password: "correct-horse-battery",
  });
  assert.equal(login.status, 200);
  const payload = await login.json();
  assert.equal(payload.tokenType, "Bearer");
  assert.equal(payload.expiresIn, 3600);
  assert.equal(payload.user.username, "alice");
  assert.ok(payload.token);
});

test("JWT authorization is required before a customer can create or update a review", async () => {
  const token = await registerAndLogin("reviewer");

  const missingToken = await jsonRequest(
    "/customer/auth/review/1",
    "PUT",
    { review: "A thoughtful review." }
  );
  assert.equal(missingToken.status, 401);

  const invalidToken = await jsonRequest(
    "/customer/auth/review/1",
    "PUT",
    { review: "A thoughtful review." },
    "not-a-jwt"
  );
  assert.equal(invalidToken.status, 401);

  const created = await jsonRequest(
    "/customer/auth/review/1",
    "PUT",
    { review: "A thoughtful review." },
    token
  );
  assert.equal(created.status, 200);
  assert.equal((await created.json()).review, "A thoughtful review.");

  const updated = await jsonRequest(
    "/customer/auth/review/1",
    "PUT",
    { review: "Updated after a second reading." },
    token
  );
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).review, "Updated after a second reading.");

  const publicReview = await jsonRequest("/review/1");
  assert.equal(publicReview.status, 200);
  assert.equal(
    (await publicReview.json()).reviews.reviewer,
    "Updated after a second reading."
  );
});

test("review endpoint validates ISBN and review text", async () => {
  const token = await registerAndLogin("reviewer");
  const malformedIsbn = await jsonRequest(
    "/customer/auth/review/not-an-isbn",
    "PUT",
    { review: "Review" },
    token
  );
  assert.equal(malformedIsbn.status, 400);

  const missingBook = await jsonRequest(
    "/customer/auth/review/999",
    "PUT",
    { review: "Review" },
    token
  );
  assert.equal(missingBook.status, 404);

  const emptyReview = await jsonRequest(
    "/customer/auth/review/1",
    "PUT",
    { review: "   " },
    token
  );
  assert.equal(emptyReview.status, 401);

  const invalidReview = await jsonRequest(
    "/customer/auth/review/1",
    "PUT",
    { review: "   " },
    token
  );
  assert.equal(invalidReview.status, 400);
});

test("catalogue supports list, ISBN, author, title, and public review lookup", async () => {
  const list = await jsonRequest("/");
  assert.equal(list.status, 200);
  assert.equal(Object.keys(await list.json()).length, 10);

  const byIsbn = await jsonRequest("/isbn/1");
  assert.equal((await byIsbn.json()).title, "Things Fall Apart");

  const byAuthor = await jsonRequest("/author/Chinua%20Achebe");
  assert.equal(byAuthor.status, 200);
  assert.equal((await byAuthor.json())[0].author, "Chinua Achebe");

  const byTitle = await jsonRequest("/title/things%20fall");
  assert.equal(byTitle.status, 200);
  assert.equal((await byTitle.json())[0].title, "Things Fall Apart");

  const noMatches = await jsonRequest("/title/no-such-book");
  assert.deepEqual(await noMatches.json(), []);

  const reviews = await jsonRequest("/review/1");
  assert.deepEqual((await reviews.json()).reviews, {});
});

test("catalogue validates malformed ISBN and search terms", async () => {
  assert.equal((await jsonRequest("/isbn/not-a-number")).status, 400);
  assert.equal((await jsonRequest("/review/999")).status, 404);
  assert.equal((await jsonRequest("/author/%20%20")).status, 400);
  assert.equal((await jsonRequest("/title/%20%20")).status, 400);
});

test("malformed JSON receives a structured client error", async () => {
  const response = await fetch(baseUrl + "/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid",
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid JSON/i);
});
