/**
 * Authentication + session infrastructure (Auth_Service).
 *
 * DESIGN ADAPTATION
 * -----------------
 * The design document specifies Auth.js/NextAuth with a `[...nextauth]` route
 * handler. That handler is Next.js App-Router-specific and does not fit this
 * project, which is a plain **Express** server with a separate React (Vite)
 * client. So we implement the *intent* of the requirement on the Express
 * stack: session-based authentication whose session carries the authenticated
 * user's id, backed by the existing MongoDB `users` collection.
 *
 * Implementation choices (given the Express reality):
 * - `express-session` for server-side sessions (the standard Express session
 *   primitive), with a signed, httpOnly session-id cookie.
 * - `connect-mongo` as the session store, reusing the shared `MongoClient`
 *   singleton so sessions persist in MongoDB alongside the rest of the app's
 *   data (Requirement 6.1 "session backed by MongoDB").
 * - `bcryptjs` for password hashing on the credential register/login flow
 *   (pure-JS, no native build step — plays nicely with `--legacy-peer-deps`).
 *
 * The session stores the user's id under `req.session.userId`. Task 6.2's
 * `requireUser()` reads that value to resolve `{ userId, tenantId }` (tenantId
 * = userId), and task 6.3 wires it into the upload/chat routes. Until then the
 * existing routes remain unauthenticated.
 */

import session, { type SessionOptions } from "express-session";
import MongoStore from "connect-mongo";
import bcrypt from "bcryptjs";
import { ObjectId, type Document } from "mongodb";

import { config } from "../config.js";
import { getMongoClient, getUsersCollection } from "../db/mongo.js";
import { ValidationError } from "../ingestion/errors.js";

/**
 * Augment express-session's typed `SessionData` so `req.session.userId` is a
 * first-class, type-checked field across the codebase.
 */
declare module "express-session" {
  interface SessionData {
    /** Id of the authenticated user (also used as the tenantId). */
    userId?: string;
  }
}

/** Cost factor for bcrypt hashing. 10 is a sensible default for web logins. */
const BCRYPT_ROUNDS = 10;

/** Shape of a user document stored in the `users` collection. */
export interface UserDoc extends Document {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

/** Public view of a user (never exposes the password hash). */
export interface PublicUser {
  id: string;
  email: string;
}

/**
 * Build the express-session middleware, wired to a MongoDB-backed store.
 *
 * The store reuses the shared `MongoClient` promise so we do not open a second
 * connection. Cookie settings come entirely from `config.session`:
 * - `httpOnly`  — the cookie is not readable from client-side JS (XSS defense).
 * - `sameSite: "lax"` — mitigates CSRF for top-level navigations.
 * - `secure`    — HTTPS-only in production (see `config.session.secureCookie`).
 *
 * `resave: false` and `saveUninitialized: false` avoid writing empty sessions
 * for anonymous visitors.
 */
export function createSessionMiddleware() {
  const store = MongoStore.create({
    clientPromise: getMongoClient(),
    dbName: config.mongo.db,
    collectionName: config.session.collectionName,
  });

  const options: SessionOptions = {
    name: config.session.cookieName,
    secret: config.session.secret,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.session.secureCookie,
      maxAge: config.session.maxAgeMs,
    },
  };

  return session(options);
}

/** Normalize a raw email into a stable, comparable form. */
function normalizeEmail(email: unknown): string {
  if (typeof email !== "string" || email.trim().length === 0) {
    throw new ValidationError("Email is required");
  }
  return email.trim().toLowerCase();
}

/** Validate a raw password value (minimal policy: non-empty, >= 8 chars). */
function validatePassword(password: unknown): string {
  if (typeof password !== "string" || password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
  return password;
}

/** Hash a plaintext password with bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Verify a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Register a new user with a hashed password.
 *
 * Throws `ValidationError` when the email/password are invalid or when the
 * email is already registered. Returns the public view of the created user.
 */
export async function registerUser(
  emailInput: unknown,
  passwordInput: unknown,
): Promise<PublicUser> {
  const email = normalizeEmail(emailInput);
  const password = validatePassword(passwordInput);

  const users = await getUsersCollection<UserDoc>();

  const existing = await users.findOne({ email });
  if (existing) {
    throw new ValidationError("An account with that email already exists");
  }

  const passwordHash = await hashPassword(password);
  const doc: UserDoc = {
    _id: new ObjectId(),
    email,
    passwordHash,
    createdAt: new Date(),
  };
  await users.insertOne(doc);

  return { id: doc._id.toHexString(), email: doc.email };
}

/**
 * Verify credentials for login.
 *
 * Returns the public user on success, or `null` when the email is unknown or
 * the password does not match. Callers deliberately treat both failure cases
 * identically so the response never reveals whether an email exists.
 */
export async function verifyCredentials(
  emailInput: unknown,
  passwordInput: unknown,
): Promise<PublicUser | null> {
  const email = normalizeEmail(emailInput);
  const password = validatePassword(passwordInput);

  const users = await getUsersCollection<UserDoc>();
  const user = await users.findOne({ email });
  if (!user) {
    return null;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return null;
  }

  return { id: user._id.toHexString(), email: user.email };
}

/**
 * Look up a user by id (as stored in the session). Returns the public view or
 * `null` when the id is malformed or no such user exists.
 */
export async function findUserById(id: string): Promise<PublicUser | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const users = await getUsersCollection<UserDoc>();
  const user = await users.findOne({ _id: new ObjectId(id) });
  return user ? { id: user._id.toHexString(), email: user.email } : null;
}
