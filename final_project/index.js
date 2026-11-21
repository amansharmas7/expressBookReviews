const express = require("express");
const session = require("express-session");
const customerRoutes = require("./router/auth_users.js").authenticated;
const generalRoutes = require("./router/general.js").general;

function createApp() {
  const port = Number.parseInt(process.env.PORT || "5000", 10);
  const sessionSecret = process.env.SESSION_SECRET;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port between 1 and 65535.");
  }

  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error(
      "SESSION_SECRET is required and must contain at least 32 characters. " +
        "Copy .env.example to .env and set a unique secret."
    );
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

  // Authentication is intentionally unfinished in this starter project.
  // Return an explicit response rather than allowing protected requests to hang.
  app.use("/customer/auth/*", (_req, res) => {
    return res.status(501).json({
      message: "Customer authentication middleware has not been implemented yet.",
    });
  });

  app.use("/customer", customerRoutes);
  app.use("/", generalRoutes);
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = Number.parseInt(process.env.PORT || "5000", 10);
  app.listen(port, () => {
    console.log(`Book Reviews API listening on port ${port}`);
  });
}

module.exports = { createApp };
