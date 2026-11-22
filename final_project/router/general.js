const express = require("express");
const { isValid, registerUser, validateRegistration } = require("./auth_users.js");

function validSearchTerm(value) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 100;
}

function createGeneralRouter({ books }) {
  const router = express.Router();

  router.post("/register", async (req, res, next) => {
    const validation = validateRegistration(req.body);
    if (validation.error) return res.status(400).json({ error: validation.error });
    const { username, password, email } = validation.value;
    if (!isValid(username)) {
      return res.status(409).json({ error: "Username is already registered." });
    }
    try {
      const user = await registerUser({ username, password, email });
      return res.status(201).json({ message: "Registration successful.", user });
    } catch (error) {
      if (error.code === "USERNAME_TAKEN") {
        return res.status(409).json({ error: "Username is already registered." });
      }
      return next(error);
    }
  });

  router.get("/", (_req, res) => {
    return res.status(200).json(books);
  });

  router.get("/isbn/:isbn", (req, res) => {
    const isbn = req.params.isbn;
    if (!/^\d{1,10}$/.test(isbn)) {
      return res.status(400).json({ error: "ISBN must contain 1–10 digits." });
    }
    const book = books[isbn];
    if (!book) return res.status(404).json({ error: "Book not found." });
    return res.status(200).json(book);
  });

  router.get("/author/:author", (req, res) => {
    const author = req.params.author;
    if (!validSearchTerm(author)) {
      return res.status(400).json({ error: "Author search must contain 1–100 characters." });
    }
    const term = author.trim().toLocaleLowerCase();
    const matches = Object.entries(books)
      .filter(([, book]) => book.author.toLocaleLowerCase().includes(term))
      .map(([isbn, book]) => ({ isbn, ...book }));
    return res.status(200).json(matches);
  });

  router.get("/title/:title", (req, res) => {
    const title = req.params.title;
    if (!validSearchTerm(title)) {
      return res.status(400).json({ error: "Title search must contain 1–100 characters." });
    }
    const term = title.trim().toLocaleLowerCase();
    const matches = Object.entries(books)
      .filter(([, book]) => book.title.toLocaleLowerCase().includes(term))
      .map(([isbn, book]) => ({ isbn, ...book }));
    return res.status(200).json(matches);
  });

  router.get("/review/:isbn", (req, res) => {
    const isbn = req.params.isbn;
    if (!/^\d{1,10}$/.test(isbn)) {
      return res.status(400).json({ error: "ISBN must contain 1–10 digits." });
    }
    const book = books[isbn];
    if (!book) return res.status(404).json({ error: "Book not found." });
    return res.status(200).json({ isbn, reviews: book.reviews });
  });

  return router;
}

module.exports = { createGeneralRouter };
