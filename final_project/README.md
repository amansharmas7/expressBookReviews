# Express Book Reviews — Application

This directory contains the Node.js/Express REST API for the repository.

## Run

~~~bash
npm install
~~~

Copy .env.example to .env, then set independent random values for SESSION_SECRET and JWT_SECRET (at least 32 characters each).

~~~bash
npm start
~~~

The API listens on port 5000 by default.

## Checks

~~~bash
npm run check
npm test
~~~

The API includes customer registration, password hashing, JWT login and authorization, public catalogue lookups, and JWT-protected review creation/update. Users and reviews are currently held in memory and are reset when the process restarts. See the [repository README](../README.md) for endpoint details and security limitations.
