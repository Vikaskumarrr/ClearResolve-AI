import "dotenv/config";

import { MongoClient } from "mongodb";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";


async function main(){ 
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();

    const collection = client
    .db(process.env.MONGODB_DB)
    .collection(process.env.MONGODB_COLLECTION!);

    await collection.deleteMany({}); // aviod duplication on re-send

    const loader = new PDFLoader("./data/sample.pdf");

    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({ 
        chunkSize : 1000,
        chunkOverlap : 200,
    }); 

    const chunks = await splitter.splitDocuments(docs);
    console.log(`Embedding ${chunks.length} chunks....`);

    const embeddings = new GoogleGenerativeAIEmbeddings({ 
        model : "gemini-embedding-001", //3072-dim vector
        apiKey: process.env.GOOGLE_API_KEY,
    });

    await MongoDBAtlasVectorSearch.fromDocuments(chunks, embeddings, {
        collection,
        indexName: process.env.VECTOR_INDEX_NAME,
        textKey: "text",
        embeddingKey: "embedding",
    });

    console.log("stored docuemnts with embedding");
    await client.close();
};

main().catch((e)=>{
    console.error(e);
    process.exit(1);
}
)

