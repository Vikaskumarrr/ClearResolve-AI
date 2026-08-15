import { MongoClient } from "mongodb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);

export async function getRelevantChunks(question: string, k = 4) {
  const collection = client
    .db(process.env.MONGODB_DB)
    .collection(process.env.MONGODB_COLLECTION!);

  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001", // MUST match what you seeded with
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const store = new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: process.env.VECTOR_INDEX_NAME,
    textKey: "text",
    embeddingKey: "embedding",
  });

  return store.similaritySearch(question, k);
}