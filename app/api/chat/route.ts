import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getRelevantChunks } from "@/app/lib/retriever";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const chunks = await getRelevantChunks(message);
    const context = chunks.map((c) => c.pageContent).join("\n\n---\n\n");

    const prompt = `Answer the question using ONLY the context below.
If the answer is not in the context, say "I don't know based on the provided documents."

Context:
${context}

Question: ${message}

Answer:`;

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-flash-latest",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const res = await model.invoke(prompt);
    return NextResponse.json({ answer: res.content });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}