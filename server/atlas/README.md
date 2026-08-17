# Atlas Vector Search index

This directory holds the MongoDB Atlas Vector Search index definition for the
`chunks` collection (the `Vector_Store`). The definition lives in
[`vector-index.json`](./vector-index.json) so it is version-controlled and can
be applied consistently across environments.

## What the index declares

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 3072, "similarity": "cosine" },
    { "type": "filter", "path": "tenantId" },
    { "type": "filter", "path": "source" }
  ]
}
```

- **`embedding` (vector, 3072-dim, cosine)** — the chunk embedding produced by
  `gemini-embedding-001`. Dimensionality and similarity metric must match the
  embedding model, or the distances are meaningless.
- **`tenantId` (filter)** — this is what enables tenant **pre-filtering** inside
  the vector search. The retriever runs similarity search with
  `preFilter: { tenantId: { $eq: tenantId } }`, so a user can only ever match
  their own chunks. Without this filter field the pre-filter cannot run
  (**Requirement 6.4**).
- **`source` (filter)** — supports efficient dedup deletes. Re-ingesting a
  source runs `deleteMany({ tenantId, source })`; indexing `source` as a filter
  field keeps that replace-by-source operation efficient (**Requirement 7.2**).

## Important: index name and collection

The index **name must match** `config.mongo.vectorIndexName`, which is read from
the `VECTOR_INDEX_NAME` environment variable (default `vector_index`). If your
env uses a different name, update the `name` in `vector-index.json` (and the
Atlas UI / command below) to match.

The index is created **on the chunks collection** named by
`MONGODB_COLLECTION` (see `server/.env.example`), inside the `MONGODB_DB`
database.

## Applying the index

An Atlas Vector Search index cannot be created from a standard MongoDB index
command; it requires an Atlas cluster that supports Search (**M10+ or a
serverless/Flex instance**). Choose any one of the following.

### Option 1 — Atlas UI

1. In the Atlas console, open your cluster and go to **Atlas Search** →
   **Create Search Index**.
2. Choose the **Vector Search** index type and the **JSON editor**.
3. Select the database (`MONGODB_DB`) and the chunks collection
   (`MONGODB_COLLECTION`).
4. Set the index **name** to match `VECTOR_INDEX_NAME` (default `vector_index`).
5. Paste the `definition` object from `vector-index.json` and create the index.
6. Wait until the index status becomes **Active**.

### Option 2 — Atlas CLI

```bash
atlas clusters search indexes create \
  --clusterName <yourCluster> \
  --file server/atlas/vector-index.json
```

The JSON file already includes `name`, `type: "vectorSearch"`, and the
`definition`, which is the shape the Atlas CLI expects. Adjust `name` in the
file first if your `VECTOR_INDEX_NAME` differs.

### Option 3 — Helper script (mongodb driver)

An optional script is provided that reads `vector-index.json` and calls the
driver's `createSearchIndex` against the chunks collection. It uses the running
config so the index name always matches `VECTOR_INDEX_NAME`:

```bash
# from the server/ directory, with a valid .env at the repo root
npm run atlas:create-index
```

Requirements for the script:

- The `MONGODB_URI` must point at an Atlas cluster that supports Vector Search
  (M10+ or serverless/Flex). It will not work against a local `mongod` or a
  shared free tier that lacks Search.
- All required env vars must be set (`MONGODB_URI`, `MONGODB_DB`,
  `VECTOR_INDEX_NAME`, and the collection name).

Index build is asynchronous — after the command returns, the index may take a
short while to reach the **Active** state before queries can use it.
