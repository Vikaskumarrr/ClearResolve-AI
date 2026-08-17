import { MongoClient, type Collection, type Db, type Document } from "mongodb";

import { config } from "../config.js";

/**
 * Shared MongoDB client.
 *
 * Ported from the Next.js app's `app/lib/db/mongo.ts`. A single `MongoClient`
 * is reused across the whole server. Unlike the Next.js version (which had to
 * defend against HMR "connection storms"), a plain module-level singleton is
 * sufficient here because the Express process evaluates each module once.
 */
function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(config.mongo.uri);
  return client.connect();
}

const clientPromise: Promise<MongoClient> = createClientPromise();

/** Resolve the shared, connected `MongoClient`. */
export function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

/** Resolve the application database defined in `config.mongo.db`. */
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(config.mongo.db);
}

async function getCollection<T extends Document = Document>(
  name: string
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

/** Collection holding ingested chunks, embeddings, and metadata. */
export function getChunksCollection<T extends Document = Document>(): Promise<
  Collection<T>
> {
  return getCollection<T>(config.mongo.chunksCollection);
}

/** Collection holding background ingestion jobs. */
export function getJobsCollection<T extends Document = Document>(): Promise<
  Collection<T>
> {
  return getCollection<T>(config.mongo.jobsCollection);
}

/** Collection holding authenticated users. */
export function getUsersCollection<T extends Document = Document>(): Promise<
  Collection<T>
> {
  return getCollection<T>(config.mongo.usersCollection);
}
