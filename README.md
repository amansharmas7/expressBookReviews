# Express Book Reviews

[![Node.js checks](https://github.com/amansharmas7/expressBookReviews/actions/workflows/node-checks.yml/badge.svg)](https://github.com/amansharmas7/expressBookReviews/actions/workflows/node-checks.yml)
[![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

A Node.js and Express educational starter API for a small book catalogue and review service. It includes a sample in-memory catalogue, route modules for public book access and customer actions, and a small smoke-test suite for the currently available server behaviour.

> **Implementation status:** This repository is an educational starter project, not a finished production API. Several route handlers and the authentication middleware are intentionally unfinished. They return HTTP 501 rather than pretending to complete the requested action. The smoke tests verify the health endpoint and this explicit placeholder behaviour; they do not certify authentication, authorization, or full API functionality.

## Technology

- Node.js
- Express 4
- express-session
- JSON Web Tokens (`jsonwebtoken`)
- dotenv for local environment configuration

## Repository structure

```text
.
├── final_project/
│   ├── index.js
│   ├── package.json
│   └── router/
│       ├── auth_users.js
│       ├── booksdb.js
│       └── general.js
├── LICENSE
└── README.md
```

## Requirements

- Node.js 20.6 or newer
- npm

## Run locally

### 1. Move into the application directory

```bash
cd final_project
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the session secret

Copy the example environment file:

**macOS / Linux**

```bash
cp .env.example .env
```

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

Replace the placeholder `SESSION_SECRET` with a unique random value of at least 32 characters. You can generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep `.env` private. It is ignored by Git.

### 4. Start the server

```bash
npm start
```

The server listens on port `5000` by default. The npm scripts use Node.js `--env-file` support to load `final_project/.env`; set `PORT` there to use another port.

For development with automatic restarts:

```bash
npm run dev
```

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the API |
| `npm run dev` | Run with Nodemon |
| `npm run check` | Perform Node.js syntax checks on the application files |

Run the syntax check before committing:

```bash
npm run check
```

This check validates JavaScript syntax only; it does not prove that unfinished routes or authentication flows work.

## Planned API surface

The route modules provide the following starter endpoints. **Most handlers currently return HTTP 501 and must be implemented before use.**

| Method | Route | Intended purpose | Current status |
| --- | --- | --- | --- |
| POST | `/register` | Register a customer | TODO |
| GET | `/` | List books | TODO |
| GET | `/isbn/:isbn` | Find a book by ISBN | TODO |
| GET | `/author/:author` | Find books by author | TODO |
| GET | `/title/:title` | Find books by title | TODO |
| GET | `/review/:isbn` | Read a book's reviews | HTTP 501 placeholder |
| POST | `/customer/login` | Sign in a customer | TODO |
| PUT | `/customer/auth/review/:isbn` | Add or update a review | TODO |

The sample catalogue is stored in memory in `router/booksdb.js`; changes are not persisted between server restarts.

## Tests and development checks

Run the syntax check and Node.js smoke tests:

```bash
npm run check
npm test
```

The tests verify the health endpoint and confirm that currently unfinished routes return HTTP 501. They do not test completed registration, login, JWT validation, review persistence, or role-based authorization because those features are not implemented yet.

## Before production use

- Implement registration, login, JWT validation, and authorization checks.
- Hash passwords with a suitable password-hashing algorithm; never store plaintext passwords.
- Add input validation and consistent error handling.
- Replace the in-memory book catalogue with a persistent database.
- Add automated tests for successful and rejected requests.
- Review session, cookie, CORS, rate-limit, and logging settings for the deployment environment.
- Do not use real user credentials or personal data in the current starter implementation.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow. Security reporting instructions are in [SECURITY.md](SECURITY.md).

## License

This project retains the Apache License 2.0 included with the starter material. See [LICENSE](LICENSE).
