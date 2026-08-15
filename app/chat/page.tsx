"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What is this document about?",
  "Summarize the key points",
  "What database is used for vectors?",
  "Which embedding model is used?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg(null);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();

      setUploadMsg(
        data.ok
          ? `Indexed "${data.file}" (${data.chunks} chunks). Ask away!`
          : data.error ?? "Upload failed"
      );
    } catch {
      setUploadMsg("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = ""; // allow re-uploading same file
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer ?? data.error ?? "No response",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Error contacting the server." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen flex-col bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(99,102,241,0.14),transparent)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5">
          <Link href="/" className="flex items-center gap-3" aria-label="Back to home">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a7 7 0 0 1 7 7c0 2.5-1.4 4-3 5.5V18a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.5C6.4 14 5 12.5 5 10a7 7 0 0 1 7-7Z" />
                <path d="M9 22h6" />
              </svg>
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold tracking-tight">
                DocMind Assistant
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Grounded in your documents
              </p>
            </div>
          </Link>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
          {uploadMsg && (
  <p className="mx-auto max-w-3xl px-4 py-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
    {uploadMsg}
  </p>
)}
        </div>
      </header>

      {/* Messages */}
      <main
        ref={scrollRef}
        className="scroll-area flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-4 py-6">
          {!hasMessages ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                How can I help you today?
              </h2>
              <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                Ask a question and I&apos;ll answer using only the content from
                your indexed documents.
              </p>
              <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="group rounded-xl border border-black/5 bg-white/70 px-4 py-3 text-left text-sm text-zinc-700 shadow-sm transition hover:border-indigo-300 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-indigo-500/50 dark:hover:bg-white/[0.07]"
                  >
                    <span className="text-zinc-400 transition group-hover:text-indigo-500">
                      ✦
                    </span>{" "}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))}
              {loading && <TypingIndicator />}
            </div>
          )}
        </div>
        {uploading && (
  <div className="flex items-center justify-center gap-2 border-b border-black/5 bg-indigo-500/5 py-2 text-sm text-indigo-600 dark:border-white/10 dark:text-indigo-400">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    Indexing your document…
  </div>
)}
      </main>

      {/* Composer */}
      <div className="border-t border-black/5 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-sm transition focus-within:border-indigo-400 focus-within:shadow-md dark:border-white/10 dark:bg-white/[0.05] dark:focus-within:border-indigo-500/60"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask about your document…"
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
            />
            <input
  ref={fileRef}
  id="pdf-upload"
  type="file"
  accept="application/pdf"
  onChange={uploadFile}
  disabled={uploading}
  className="hidden"
/>
<label
  htmlFor="pdf-upload"
  className="flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200"
>
  {uploading ? (
    <>
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      Indexing…
    </>
  ) : (
    "Upload PDF"
  )}
</label>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Answers are generated from your indexed documents. Press Enter to
            send.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex animate-msg-in items-start gap-3 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
          isUser
            ? "bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
            : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20"
        }`}
      >
        {isUser ? (
          "You"
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
          </svg>
        )}
      </div>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
            : "rounded-tl-sm border border-black/5 bg-white text-zinc-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-100"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex animate-msg-in items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
        </svg>
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-black/5 bg-white px-4 py-3.5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
        <span className="typing-dot h-2 w-2 rounded-full bg-zinc-400" />
        <span
          className="typing-dot h-2 w-2 rounded-full bg-zinc-400"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="typing-dot h-2 w-2 rounded-full bg-zinc-400"
          style={{ animationDelay: "0.3s" }}
        />
      </div>
    </div>
  );
}
