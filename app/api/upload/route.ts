import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import {PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {GoogleGenerativeAIEmbeddings} from "@langchain/google-genai";
import { MongoDBAtlasSemanticCache, MongoDBAtlasVectorSearch } from "@langchain/mongodb";

// pdf- parse + mongodb driver need the Node.js runtine (not edge)

export const runtime = "nodejs";

// Embedding several chunks can take a few seconds; give it room
export const maxDuration = 60;

const client = new MongoClient(process.env.MONGODB_URI!);

export async function POST(req : NextRequest){ 
    try { 
        const form = await req.formData();
        const file = form.get("file");

        // validation
        if(!file || !(file instanceof File)){ 
            return NextResponse.json(
                {error : "No file uploaded"},
                {status : 400}
            );
        }

        if(file.type !== "application/pdf"){ 
            return NextResponse.json(
                {error : "Only PDF file are support"},{status : 400},
            );
        };
        if(file.size > 10 * 1024 * 1024){ 
            return NextResponse.json(
                {error : "File too large (max 1MB)",},
                {status : 400}
            );
        };


        // Load pdf straight from the client
        const loader = new PDFLoader(file);
        const docs = await loader.load();

        // split into chunks 
        const splitter = new RecursiveCharacterTextSplitter({ 
            chunkSize : 1000,
            chunkOverlap : 200,
        })

        const chunks = await splitter.splitDocuments(docs);

        // tag each chunk with original filname (usefull for citations later)

        for(const c of chunks){ 
            c.metadata.source = file.name
        };

        // 3. Embed + 4. store - same collection your chat neads from .

        await client.connect();
        const collection = client
        .db(process.env.MONGODB_DB)
        .collection(process.env.MONGODB_COLLECTION!);
        
        const embeddings = new GoogleGenerativeAIEmbeddings({ 
            model : "gemini-embedding-001",
            apiKey : process.env.GOOGLE_API_KEY
        });

        await MongoDBAtlasVectorSearch.fromDocuments(chunks, embeddings,{ 
            collection,
            indexName: process.env.VECTOR_INDEX_NAME,
            textKey : "text",
            embeddingKey: "embedding",
        });

        return NextResponse.json({
            ok:true,
            file:file.name,
            chunks : chunks.length,
        });
    } catch (err){ 
        console.error(err);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
    }
}