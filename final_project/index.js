const express = require("express");
const session = require("express-session");
const books = require("./router/booksdb.js");
const { createAuthenticatedRouter } = require("./router/auth_users.js");
const { createGeneralRouter } = require("./router/general.js");

function createApp() {
  const port = Number.parseInt(process.env.PORT || "5000", 10);
  const sessionSecret = process.env.SESSION_SECRET;
  const jwtSecret = process.env.JWT_SECRET || sessionSecret;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port between 1 and 65535.");
  }
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET is required and must contain at least 32 characters.");
  }
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    return res.status(200).json({ status: "ok" });
  });

  app.use(
    "/customer",
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 2 * 60 * 60 * 1000,
      },
    })
  );

  app.use("/customer", createAuthenticatedRouter({ jwtSecret, books }));
  app.use("/", createGeneralRouter({ books }));

  app.use((req, res) => {
    return res.status(404).json({ error: "Route not found." });
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && "body" in error) {
      return res.status(400).json({ error: "Request body must contain valid JSON." });
    }
    if (error?.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body is too large." });
    }
    return res.status(500).json({ error: "Unexpected server error." });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = Number.parseInt(process.env.PORT || "5000", 10);
  app.listen(port, () => {
    console.log("Book Reviews API listening on port " + port);
  });
}

module.exports = { createApp };
