import Link from "next/link";

/* ---------------------------------- Icons --------------------------------- */

function Icon({
  path,
  className = "h-5 w-5",
}: {
  path: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}

const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
      <Icon
        className="h-4 w-4 text-white"
        path={
          <>
            <path d="M12 3a7 7 0 0 1 7 7c0 2.5-1.4 4-3 5.5V18a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.5C6.4 14 5 12.5 5 10a7 7 0 0 1 7-7Z" />
            <path d="M9 22h6" />
          </>
        }
      />
    </div>
    <span className="text-lg font-semibold tracking-tight">DocMind</span>
  </div>
);

/* --------------------------------- Content -------------------------------- */

const NAV = ["Features", "Use Cases", "How it works", "FAQ"];

const FEATURES = [
  {
    title: "Contextual Understanding",
    desc: "Answers are grounded in your own documents using semantic vector retrieval, not guesswork.",
    icon: (
      <>
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
      </>
    ),
  },
  {
    title: "PDF & URL Ingestion",
    desc: "Drop in PDFs or point at a web page. Everything is chunked, embedded and indexed automatically.",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 15h6M9 11h2" />
      </>
    ),
  },
  {
    title: "Instant Responses",
    desc: "Powered by Gemini for fast, accurate answers with citations back to the source text.",
    icon: (
      <>
        <path d="m13 2-3 7h5l-3 7" />
        <path d="M5.5 12a6.5 6.5 0 1 1 13 0" />
      </>
    ),
  },
  {
    title: "Vector Search",
    desc: "MongoDB Atlas Vector Search finds the most relevant passages across thousands of chunks in milliseconds.",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
  },
  {
    title: "Private by Design",
    desc: "Your data stays in your own database and API keys. Nothing is shared or used for training.",
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    title: "Always Available",
    desc: "A 24/7 assistant ready to answer questions about your knowledge base whenever you need it.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
];

const STEPS = [
  {
    step: "01",
    title: "Add your documents",
    desc: "Run the seed script to ingest PDFs or URLs. They're split, embedded with Gemini, and stored in Atlas.",
  },
  {
    step: "02",
    title: "Ask anything",
    desc: "Type a question. We embed it, run a vector search, and pull the most relevant chunks as context.",
  },
  {
    step: "03",
    title: "Get grounded answers",
    desc: "Gemini answers using only your retrieved context, so responses stay accurate and on-topic.",
  },
];

const FAQ = [
  {
    q: "What documents can I use?",
    a: "Any PDF today, with web page URLs supported through the ingestion script. More loaders can be added easily.",
  },
  {
    q: "Where is my data stored?",
    a: "In your own MongoDB Atlas cluster. Embeddings are generated with your Gemini API key and never leave your infrastructure.",
  },
  {
    q: "How does it stay accurate?",
    a: "The model is instructed to answer only from the retrieved context. If the answer isn't in your documents, it says so.",
  },
  {
    q: "Do I need to know how it works?",
    a: "No. Just seed your documents and start chatting. The retrieval and prompting happen behind the scenes.",
  },
];

/* ---------------------------------- Page ---------------------------------- */

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(129,140,248,0.28),transparent)] blur-2xl" />
        <div className="absolute right-[-10%] top-[30%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.22),transparent)] blur-2xl" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-background/70 backdrop-blur-xl dark:border-white/10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <div className="hidden items-center gap-8 text-sm text-zinc-600 md:flex dark:text-zinc-300">
            {NAV.map((n) => (
              <a
                key={n}
                href={`#${n.toLowerCase().replace(/\s+/g, "-")}`}
                className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {n}
              </a>
            ))}
          </div>
          <Link
            href="/chat"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Open App
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-16 text-center sm:pt-24">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300">
          <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
            NEW
          </span>
          Retrieval-Augmented answers from your own docs
        </div>

        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Smarter Conversations
          <br />
          <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text font-serif italic text-transparent">
            Grounded in Your Documents
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
          DocMind turns your PDFs and web pages into a knowledge base you can
          chat with. Accurate, cited, and always on-topic.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/chat"
            className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:opacity-90"
          >
            Get started
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/[0.08]"
          >
            See how it works
          </a>
        </div>

        {/* Product preview */}
        <div className="mx-auto mt-16 max-w-4xl">
          <AppPreview />
        </div>
      </section>

      {/* Integrations strip */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-zinc-400">
          Built on a modern AI stack
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-zinc-400">
          {["Next.js", "Gemini", "MongoDB Atlas", "LangChain", "Vector Search"].map(
            (t) => (
              <span
                key={t}
                className="text-sm font-semibold text-zinc-500 dark:text-zinc-400"
              >
                {t}
              </span>
            )
          )}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Powerful features that make
            <br /> every chat smarter
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
            Everything you need to build accurate, document-grounded
            conversations, without the hallucinations.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-black/5 bg-white/70 p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-500/40"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-600/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-400">
                <Icon path={f.icon} />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Boost productivity with
            <br /> every conversation
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
            Three steps from a pile of documents to a chatbot that actually
            knows your content.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="relative rounded-2xl border border-black/5 bg-white/70 p-7 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <span className="bg-gradient-to-br from-indigo-500 to-violet-600 bg-clip-text text-4xl font-bold text-transparent">
                {s.step}
              </span>
              <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-black/5 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                {item.q}
                <span className="ml-4 text-zinc-400 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 px-8 py-14 text-center shadow-2xl shadow-indigo-500/30">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
          <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Ready to chat with your documents?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-indigo-100">
            Open the app and start asking questions about your knowledge base.
          </p>
          <Link
            href="/chat"
            className="relative mt-8 inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
          >
            Launch DocMind
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-zinc-500 sm:flex-row dark:text-zinc-400">
          <Logo />
          <p>Built with Next.js, Gemini & MongoDB Atlas Vector Search.</p>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------ App preview ------------------------------- */

function AppPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl shadow-indigo-500/10 dark:border-white/10 dark:bg-zinc-900">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-black/5 bg-zinc-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-yellow-400" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
        <span className="ml-3 rounded-md bg-white px-3 py-1 text-xs text-zinc-400 shadow-sm dark:bg-white/[0.06]">
          docmind.app/chat
        </span>
      </div>

      {/* fake chat */}
      <div className="space-y-4 p-6 text-left">
        <div className="flex justify-end">
          <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2.5 text-sm text-white">
            What database does this project use for vectors?
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Icon
              className="h-4 w-4"
              path={
                <>
                  <path d="M12 8V4H8" />
                  <rect width="16" height="12" x="4" y="8" rx="2" />
                  <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
                </>
              }
            />
          </div>
          <div className="max-w-[75%] rounded-2xl rounded-tl-sm border border-black/5 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200">
            It uses MongoDB Atlas Vector Search to store and query the embedding
            vectors, with cosine similarity over 3072-dimensional Gemini
            embeddings.
          </div>
        </div>
      </div>
    </div>
  );
}
