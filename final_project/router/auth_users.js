const express = require("express");
const jwt = require("jsonwebtoken");
const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(scryptCallback);
const users = [];
const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,30}$/;
const JWT_ISSUER = "express-book-reviews";
const JWT_AUDIENCE = "express-book-reviews";

function isValid(username) {
  if (typeof username !== "string") return false;
  const clean = username.trim();
  return (
    USERNAME_PATTERN.test(clean) &&
    !users.some((user) => user.username.toLowerCase() === clean.toLowerCase())
  );
}

function validateRegistration(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object." };
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = body.password;
  const email = body.email === undefined ? "" : body.email;

  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Username must be 3–30 characters using letters, numbers, dot, underscore, or hyphen." };
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return { error: "Password must contain between 8 and 128 characters." };
  }
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return { error: "Provide a valid email address." };
  }
  return { value: { username, password, email: email.trim().toLowerCase() } };
}

async function registerUser({ username, password, email = "" }) {
  if (!isValid(username)) {
    const error = new Error("Username is already registered or invalid.");
    error.code = "USERNAME_TAKEN";
    throw error;
  }
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  const user = {
    username: username.trim(),
    email,
    salt: salt.toString("hex"),
    passwordHash: derivedKey.toString("hex"),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return { username: user.username, email: user.email };
}

async function authenticatedUser(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return null;
  const user = users.find((item) => item.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) return null;
  const expected = Buffer.from(user.passwordHash, "hex");
  const actual = await scrypt(password, Buffer.from(user.salt, "hex"), 64);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return { username: user.username, email: user.email };
}

function createAuthMiddleware(jwtSecret) {
  return (req, res, next) => {
    const header = req.get("authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: "A Bearer access token is required." });
    }
    try {
      const payload = jwt.verify(match[1], jwtSecret, {
        algorithms: ["HS256"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      if (!payload || typeof payload.username !== "string") {
        return res.status(401).json({ error: "The access token is invalid." });
      }
      const user = users.find(
        (item) => item.username.toLowerCase() === payload.username.toLowerCase()
      );
      if (!user) return res.status(401).json({ error: "The access token is no longer valid." });
      req.user = { username: user.username, email: user.email };
      return next();
    } catch (_error) {
      return res.status(401).json({ error: "The access token is invalid or expired." });
    }
  };
}

function createAuthenticatedRouter({ jwtSecret, books }) {
  const router = express.Router();
  const requireAuth = createAuthMiddleware(jwtSecret);

  router.post("/login", async (req, res, next) => {
    try {
      const username = req.body?.username;
      const password = req.body?.password;
      if (typeof username !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Username and password are required." });
      }
      const user = await authenticatedUser(username, password);
      if (!user) return res.status(401).json({ error: "Invalid username or password." });

      const token = jwt.sign(
        { username: user.username },
        jwtSecret,
        {
          algorithm: "HS256",
          expiresIn: "1h",
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        }
      );
      return res.status(200).json({ token, tokenType: "Bearer", expiresIn: 3600, user });
    } catch (error) {
      return next(error);
    }
  });

  router.put("/auth/review/:isbn", requireAuth, (req, res) => {
    const isbn = req.params.isbn;
    if (!/^\d{1,10}$/.test(isbn)) {
      return res.status(400).json({ error: "ISBN must contain 1–10 digits." });
    }
    const book = books[isbn];
    if (!book) return res.status(404).json({ error: "Book not found." });

    const review = req.body?.review;
    if (typeof review !== "string" || !review.trim() || review.trim().length > 2000) {
      return res.status(400).json({ error: "Review must contain between 1 and 2,000 characters." });
    }

    book.reviews[req.user.username] = review.trim();
    return res.status(200).json({
      message: "Review saved.",
      isbn,
      username: req.user.username,
      review: book.reviews[req.user.username],
    });
  });

  return router;
}

function resetUsers() {
  users.length = 0;
}

module.exports = {
  authenticatedUser,
  createAuthMiddleware,
  createAuthenticatedRouter,
  isValid,
  registerUser,
  resetUsers,
  users,
  validateRegistration,
};
