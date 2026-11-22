# Express Book Reviews

[![Node.js checks](https://github.com/amansharmas7/expressBookReviews/actions/workflows/node-checks.yml/badge.svg)](https://github.com/amansharmas7/expressBookReviews/actions/workflows/node-checks.yml)
[![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js)](https://nodejs.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

A Node.js and Express REST API for a sample book catalogue, customer registration and login, JWT-protected reviews, and public catalogue lookup.

## Features

- Register customers with validated usernames, optional email addresses, and scrypt-hashed passwords.
- Authenticate customers and issue signed, one-hour JWT bearer tokens.
- Protect review creation and updates with JWT verification and account authorization.
- List books and look up books by ISBN, author, or title.
- Read public reviews by ISBN.
- Validate request bodies, route parameters, and review lengths.
- Run API integration tests with Node's built-in test runner.

## Technology

- Node.js 20.6+
- Express 4
- JSON Web Tokens (HS256)
- Node.js crypto scrypt for password hashing
- express-session (retained for compatibility with the starter app)

## Repository structure

~~~text
.
├── final_project/
│   ├── index.js
│   ├── .env.example
│   ├── package.json
│   ├── router/
│   │   ├── auth_users.js
│   │   ├── booksdb.js
│   │   └── general.js
│   └── test/
│       └── app.test.js
├── .github/workflows/node-checks.yml
├── LICENSE
└── README.md
~~~

## Requirements

- Node.js 20.6 or newer
- npm

## Run locally

### 1. Install dependencies

~~~bash
cd final_project
npm install
~~~

### 2. Configure secrets

Copy the example environment file:

**macOS / Linux**

~~~bash
cp .env.example .env
~~~

**Windows PowerShell**

~~~powershell
Copy-Item .env.example .env
~~~

Generate two independent secrets:

~~~bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
~~~

Use one random value for SESSION_SECRET and a different random value for JWT_SECRET. Both must contain at least 32 characters. Never commit .env.

### 3. Start the server

~~~bash
npm start
~~~

The API listens on port 5000 by default. Set PORT in .env to use another port. For development with automatic restarts:

~~~bash
npm run dev
~~~

## API reference

All request and response bodies use JSON. The server returns structured JSON errors and uses standard HTTP status codes.

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| GET | /health | Public | Health check |
| POST | /register | Public | Register a customer |
| POST | /customer/login | Public | Verify credentials and return a JWT |
| GET | / | Public | List the sample catalogue |
| GET | /isbn/:isbn | Public | Find one book by ISBN |
| GET | /author/:author | Public | Case-insensitive partial author search |
| GET | /title/:title | Public | Case-insensitive partial title search |
| GET | /review/:isbn | Public | Read reviews for a book |
| PUT | /customer/auth/review/:isbn | Bearer JWT | Add or update the authenticated user's review |

### Register

~~~http
POST /register
Content-Type: application/json

{
  "username": "reader_01",
  "password": "a-long-unique-password",
  "email": "reader@example.com"
}
~~~

Username must be 3–30 characters using letters, numbers, dot, underscore, or hyphen. Password must be 8–128 characters. Email is optional but must be valid when supplied. Duplicate usernames are rejected without regard to case.

### Login

~~~http
POST /customer/login
Content-Type: application/json

{
  "username": "reader_01",
  "password": "a-long-unique-password"
}
~~~

A successful response contains a signed JWT, token type, expiry in seconds, and the public user profile. Send the token on protected requests:

~~~http
Authorization: Bearer <token>
~~~

Tokens use HS256, expire after one hour, and are verified against the JWT_SECRET, issuer, and audience.

### Add or update a review

~~~http
PUT /customer/auth/review/1
Content-Type: application/json
Authorization: Bearer <token>

{
  "review": "A thoughtful and engaging book."
}
~~~

A review must contain 1–2,000 characters. Each authenticated customer has one review per ISBN; a subsequent PUT updates that customer's existing review. Other customers' reviews are not overwritten.

### Catalogue lookup

- GET / returns the catalogue keyed by ISBN.
- GET /isbn/1 returns the matching book or 404.
- GET /author/Chinua%20Achebe and GET /title/Things%20Fall%20Apart perform case-insensitive partial matches and return arrays.
- GET /review/1 returns the review map for the selected ISBN.

Malformed ISBNs and invalid search terms return 400. Unknown ISBNs return 404. Searches with no matches return an empty array.

## Available scripts

| Command | Description |
| --- | --- |
| npm start | Start the API |
| npm run dev | Start with Nodemon |
| npm run check | Check JavaScript syntax |
| npm test | Run API integration tests |

Run all checks from final_project:

~~~bash
npm run check
npm test
~~~

GitHub Actions runs the syntax checks and tests on pushes and pull requests to main.

## Current limitations

- **In-memory storage:** users and reviews are stored in process memory and reset when the server restarts. The book catalogue is a static sample dataset. Use a persistent database before multi-instance or production deployment.
- **No password recovery or email verification:** registration does not send verification messages, and there is no password-reset flow.
- **JWT lifecycle:** tokens expire after one hour; refresh-token rotation and revocation are not implemented. A user removed from the in-memory store is immediately unable to use their token.
- **Rate limiting:** authentication and registration do not yet have a distributed rate limiter or account lockout. Add one before exposing the service publicly.
- **Session store:** the legacy express-session middleware uses Express's default in-memory store. It is retained for starter compatibility and is not suitable for production.
- **No roles:** authorization currently means an authenticated customer may create or update only their own review. There are no administrator or moderator roles.
- **HTTPS required in deployment:** terminate TLS at a trusted reverse proxy or hosting platform and configure secure cookies appropriately.

Do not use this educational implementation with real customer credentials or personal data until persistent storage, operational security controls, and deployment settings have been reviewed.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow. Security reporting instructions are in [SECURITY.md](SECURITY.md).

## License

This project retains the Apache License 2.0 from the starter material. The existing LICENSE file is intentionally unchanged.
