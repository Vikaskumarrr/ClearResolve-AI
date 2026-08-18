import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

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

const BeeGlyph = (
  <>
    <path d="M12 3a7 7 0 0 1 7 7c0 2.5-1.4 4-3 5.5V18a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.5C6.4 14 5 12.5 5 10a7 7 0 0 1 7-7Z" />
    <path d="M9 22h6" />
  </>
);

const SparkleGlyph = (
  <path d="M12 3l1.6 4.9L18.5 9.5 13.6 11 12 16 10.4 11 5.5 9.5 10.4 7.9 12 3Z" />
);

function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`overflow-hidden rounded-xl shadow-lg shadow-indigo-500/25 ${className}`}
      >
        <img
          src="/logo.png"
          alt="ClearResolveAI logo"
          className="h-full w-full object-cover"
        />
      </div>
      <span className="text-lg font-semibold tracking-tight">ClearResolveAI</span>
    </div>
  );
}

/* --------------------------- Waving background ---------------------------- */

/* Two-color striped "flag" that ripples in the wind behind the hero. Strong
   diagonal violet/pink/indigo bands give the turbulence displacement crisp
   edges to distort, while a CSS horizontal slide makes the stripes visibly
   travel sideways like waving cloth. Degrades to a still striped wash under
   reduced-motion. */
function WavingBackground() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[760px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_60%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black_60%,transparent)]"
    >
      {/* Oversized ripple layer, wider than the viewport so the stripes can
          slide sideways and displaced edges never reveal gaps. */}
      <div
        className={`absolute -left-[20%] top-0 h-full w-[140%] opacity-60 blur-[1px] ${
          reducedMotion ? "" : "animate-flag-slide"
        }`}
      >
        <svg
          className="h-full w-full"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Diagonal two/three-color stripe pattern — hard edges make the
                displacement clearly visible. */}
            <pattern
              id="flagStripes"
              width="270"
              height="270"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(12)"
            >
              <rect width="270" height="270" fill="#8b5cf6" />
              <rect x="0" width="90" height="270" fill="#8b5cf6" />
              <rect x="90" width="90" height="270" fill="#ec4899" />
              <rect x="180" width="90" height="270" fill="#6366f1" />
            </pattern>
            <filter
              id="flagWave"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.008 0.016"
                numOctaves={2}
                seed={3}
                result="noise"
              >
                {!reducedMotion && (
                  <animate
                    attributeName="baseFrequency"
                    dur="12s"
                    values="0.008 0.016;0.014 0.024;0.008 0.016"
                    repeatCount="indefinite"
                  />
                )}
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={55}
                xChannelSelector="R"
                yChannelSelector="G"
              >
                {!reducedMotion && (
                  <animate
                    attributeName="scale"
                    dur="9s"
                    values="40;65;40"
                    repeatCount="indefinite"
                  />
                )}
              </feDisplacementMap>
            </filter>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#flagStripes)"
            filter="url(#flagWave)"
          />
        </svg>
      </div>

      {/* Soft fade at the very bottom so the flag blends into the page. */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-[#f3f2f6]" />
    </div>
  );
}

/* ------------------------- Card waving background ------------------------- */

/* Seamless, infinite waving sheen tuned for the dark violet "Boost
   Productivity" card. Reuses the hero's flag technique — a diagonal striped
   SVG pattern rippled by feTurbulence + feDisplacementMap — but with LIGHT,
   translucent stripe colors so the motion reads as a glossy moving sheen over
   the violet gradient (dark stripes would be invisible). The horizontal drift
   is done by animating the pattern itself by exactly one full tile (260),
   added on top of the static rotate via additive="sum", so the tiling returns
   to an identical state each cycle — the loop is perfectly seamless with no
   snap. Degrades to a static striped sheen under reduced-motion. */
function CardWave() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
    >
      {/* Slightly oversized wrapper so displaced edges never reveal gaps; the
          card clips it via overflow-hidden. mix-blend-screen makes the light
          stripes glow over the violet gradient. */}
      <div className="absolute -inset-x-[10%] top-0 h-full w-[120%] opacity-70 mix-blend-screen">
        <svg
          className="h-full w-full"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Diagonal translucent light-stripe pattern. The additive
                translate of one full 260 tile loops seamlessly on top of the
                static rotate(15). */}
            <pattern
              id="cardStripes"
              width="260"
              height="260"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(15)"
            >
              <rect x="0" width="86" height="260" fill="rgba(255,255,255,0.16)" />
              <rect x="86" width="86" height="260" fill="rgba(236,72,153,0.20)" />
              <rect x="172" width="88" height="260" fill="rgba(255,255,255,0.05)" />
              {!reducedMotion && (
                <animateTransform
                  attributeName="patternTransform"
                  attributeType="XML"
                  type="translate"
                  from="0 0"
                  to="260 0"
                  additive="sum"
                  dur="9s"
                  repeatCount="indefinite"
                />
              )}
            </pattern>
            <filter
              id="cardWave"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.01 0.02"
                numOctaves={2}
                seed={4}
                result="noise"
              >
                {!reducedMotion && (
                  <animate
                    attributeName="baseFrequency"
                    dur="11s"
                    values="0.01 0.02;0.016 0.028;0.01 0.02"
                    repeatCount="indefinite"
                  />
                )}
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={34}
                xChannelSelector="R"
                yChannelSelector="G"
              >
                {!reducedMotion && (
                  <animate
                    attributeName="scale"
                    dur="8s"
                    values="26;42;26"
                    repeatCount="indefinite"
                  />
                )}
              </feDisplacementMap>
            </filter>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#cardStripes)"
            filter="url(#cardWave)"
          />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------ useInView hook ---------------------------- */

function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

/* Reveal wrapper: fades + slides up when scrolled into view */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${className} reveal ${inView ? "reveal-visible" : ""}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ---------------------------------- Data ---------------------------------- */

const NAV = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const TECH = ["PDF", "Markdown", "HTML", "Websites", "JSON", "Notion"];

const ABOUT_TEXT =
  "ClearResolveAI Is A Retrieval-Powered Assistant That Turns Your Documents And Websites Into A Searchable Knowledge Base. Ask A Question And It Finds The Most Relevant Passages, Then Answers With Accurate, Cited Responses — So You Always Know Where The Answer Came From.";

const USE_CASES = [
  {
    title: "Support & Help Centers",
    desc: "Answer customer and teammate questions instantly from your help docs and knowledge base.",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
  },
  {
    title: "Research & Analysis",
    desc: "Summarize reports, compare documents, and surface insights across large sets of files.",
    icon: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
  },
  {
    title: "Internal Knowledge",
    desc: "Give your team one place to ask questions across all your internal docs and wikis.",
    icon: (
      <>
        <path d="M9 18h6M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
      </>
    ),
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    features: [
      "100 questions / month",
      "Up to 50 documents",
      "PDF & text ingestion",
      "Community support",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    features: [
      "Unlimited questions",
      "Website crawling",
      "Cited answers",
      "Priority processing",
      "Chat history & search",
    ],
    cta: "Start Pro",
    highlight: true,
  },
  {
    name: "Team",
    price: "$29",
    period: "/mo",
    features: [
      "Everything in Pro",
      "Shared knowledge bases",
      "Admin controls & SSO",
      "Dedicated support",
    ],
    cta: "Contact us",
    highlight: false,
  },
];

const FAQ = [
  {
    q: "What is ClearResolveAI?",
    a: "ClearResolveAI is a retrieval-augmented assistant that ingests your documents and websites, then answers your questions with accurate, cited responses.",
  },
  {
    q: "What sources can I add?",
    a: "Upload PDFs, Markdown, TXT, HTML, and JSON files, or point ClearResolveAI at a website to crawl and index its pages automatically.",
  },
  {
    q: "How does it stay accurate?",
    a: "Every answer is grounded in your indexed content and includes citations to the source. If the answer isn't in your documents, it tells you instead of guessing.",
  },
  {
    q: "Is my data safe with ClearResolveAI?",
    a: "Yes. Your content stays in your own database and is never shared or used to train third-party models.",
  },
  {
    q: "Is ClearResolveAI free to use?",
    a: "You can start for free with a generous monthly limit, then upgrade for unlimited questions, website crawling, and team features.",
  },
  {
    q: "Do I need any setup?",
    a: "No installation required. Add your documents or a website URL and start asking questions right away in your browser.",
  },
];

/* Footer link columns */
const FOOTER_COLUMNS: { heading: string; items: string[] }[] = [
  {
    heading: "Product",
    items: [
      "Document Q&A",
      "Website Crawling",
      "Cited Answers",
      "Summaries",
      "Search API",
      "Integrations",
    ],
  },
  {
    heading: "Solutions",
    items: [
      "Support Teams",
      "Research",
      "Internal Knowledge",
      "Developers",
      "Startups",
    ],
  },
  {
    heading: "Resources",
    items: [
      "Docs",
      "Help Center",
      "Guides",
      "API Reference",
      "Changelog",
    ],
  },
  {
    heading: "Company",
    items: ["About Us", "Careers", "Contact", "Partners"],
  },
];

/* Social tiles with brand colors + inline-SVG glyphs */
const SOCIALS: { label: string; tile: string; glyph: React.ReactNode }[] = [
  {
    label: "LinkedIn",
    tile: "bg-[#0a66c2]",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.3c0-1.26-.02-2.9-1.77-2.9-1.77 0-2.04 1.38-2.04 2.8V21H9z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    tile: "bg-[#ff0000]",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M8 6.5v11l9-5.5-9-5.5Z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    tile: "bg-gradient-to-br from-fuchsia-500 to-orange-400",
    glyph: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="h-3.5 w-3.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "X",
    tile: "bg-zinc-900",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M17.5 3h3l-6.6 7.6L22 21h-5.9l-4.2-5.5L6.9 21H3.8l7.1-8.1L2.5 3h6l3.8 5 5.2-5Zm-1 16h1.6L8.6 4.7H6.9L16.5 19Z" />
      </svg>
    ),
  },
];

/* Floating chat-bubble cards for the FAQ illustration panel */
const FAQ_BUBBLES = [
  {
    text: "Can I ask questions across all my PDFs?",
    avatar: "from-indigo-400 to-violet-500",
    className: "left-[6%] top-[8%] w-[62%] -rotate-3",
  },
  {
    text: "Can it crawl my whole documentation site?",
    avatar: "from-violet-400 to-pink-500",
    className: "left-[4%] top-[40%] w-[60%] rotate-2",
  },
  {
    text: "Do answers include citations to the source?",
    avatar: "from-sky-400 to-blue-500",
    className: "right-[5%] top-[30%] w-[58%] rotate-3",
  },
  {
    text: "What file types can I upload?",
    avatar: "from-amber-400 to-orange-500",
    className: "left-[10%] bottom-[8%] w-[60%] -rotate-2",
  },
];

/* ---------------------------------- Page ---------------------------------- */

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f3f2f6] text-zinc-900">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* soft lavender glow top-left */}
        <div className="absolute left-[-6%] top-[-6%] h-[460px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.30),transparent)] blur-3xl" />
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(129,140,248,0.24),transparent)] blur-2xl" />
        {/* faint warm pink/peach glow on the right behind the preview */}
        <div className="absolute right-[-8%] top-[22%] h-[520px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(251,146,120,0.20),transparent)] blur-3xl" />
        <div className="absolute right-[4%] top-[36%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(244,114,182,0.16),transparent)] blur-2xl" />
        <div className="absolute left-[-8%] top-[62%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.16),transparent)] blur-2xl" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#f3f2f6]/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />

          <div className="hidden items-center gap-2 text-sm md:flex">
            {NAV.map((n) => {
              const active = n.label === "Home";
              return (
                <a
                  key={n.label}
                  href={n.href}
                  className={
                    active
                      ? "rounded-full bg-white/70 px-3 py-1 font-medium text-violet-600 transition"
                      : "px-3 py-1 text-zinc-500 transition hover:text-zinc-900"
                  }
                >
                  {n.label}
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/chat"
              className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Sign in
            </Link>
            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-700 transition hover:bg-zinc-50 md:hidden"
            >
              <Icon
                path={
                  menuOpen ? (
                    <path d="M18 6 6 18M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )
                }
              />
            </button>
          </div>
        </nav>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="border-t border-black/5 bg-[#f3f2f6]/95 px-5 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((n) => (
                <a
                  key={n.label}
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-700 transition hover:bg-white"
                >
                  {n.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section
        id="home"
        className="relative isolate mx-auto max-w-6xl px-5 pb-8 pt-16 text-center sm:pt-24"
      >
        {/* Ambient waving-flag wash behind the hero */}
        <WavingBackground />

        <div className="relative z-10">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-sm">
          <Icon
            className="h-3.5 w-3.5 text-zinc-400"
            path={
              <>
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
                <path d="M14 3v5h5" />
              </>
            }
          />
          Introducing ClearResolveAI
          <span className="rounded-md border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-orange-500">
            New
          </span>
        </div>

        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight text-[#2e2a5e] sm:text-7xl">
          Answers Grounded In
          <br />
          <span className="font-serif italic leading-[1.1] text-[#2e2a5e]">
            Your Docs & Websites
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-white">
          ClearResolveAI turns your documents and websites into a searchable
          knowledge base, then answers your questions with accurate, cited
          responses.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/chat"
            className="rounded-lg bg-gradient-to-r from-violet-700 to-[#211d3f] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:opacity-95"
          >
            Get started
          </Link>
          <Link
            to="/chat"
            className="rounded-lg border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Try a Demo
          </Link>
        </div>

        {/* Product preview */}
        <Reveal className="mx-auto mt-16 max-w-4xl">
          <AppPreview />
        </Reveal>
        </div>
      </section>

      {/* Tech strip */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="text-center text-sm font-medium text-zinc-500">
          Ingests From The Sources You Already Use.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-zinc-400">
          {TECH.map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="inline-flex items-center gap-1.5 text-base font-semibold text-zinc-400"
            >
              <Icon className="h-4 w-4" path={SparkleGlyph} />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* About: word-by-word scroll reveal */}
      <AboutSection />

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <Reveal className="text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-[#2e2a5e] sm:text-4xl">
            Powerful Features That Make Every Answer Smarter
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-500">
            Designed to help you find accurate answers, cite your sources, and
            search your knowledge base effortlessly.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <article className="group h-full rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative mb-5 flex h-48 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#f6f5fc] to-white p-4">
                  <div
                    className={`pointer-events-none absolute inset-0 ${f.glow}`}
                  />
                  <div className="relative flex h-full w-full items-center justify-center">
                    {f.illustration}
                  </div>
                </div>
                <h3 className="text-base font-semibold text-[#2e2a5e]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {f.desc}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="mx-auto max-w-6xl px-5 py-16">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built For Teams That Rely On Their Docs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-500">
            However your team works, ClearResolveAI turns your content into
            answers.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {USE_CASES.map((u, i) => (
            <Reveal key={u.title} delay={i * 80}>
              <article className="h-full rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-600/10 text-indigo-600 ring-1 ring-indigo-500/15">
                  <Icon path={u.icon} />
                </div>
                <h3 className="text-base font-semibold">{u.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {u.desc}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Boost productivity band */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 px-8 py-14 text-center shadow-2xl shadow-indigo-500/30">
            {/* Seamless waving sheen behind the text */}
            <CardWave />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
            <div className="relative z-10">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Boost Productivity With Every Answer
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-indigo-100">
                We built ClearResolveAI to be more than a chatbot — it's your
                team's knowledge, instantly searchable and always cited.
              </p>
              <Link
                to="/chat"
                className="mt-8 inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
              >
                Get started
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-500">
            Start free and upgrade when you're ready. No hidden fees.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PRICING.map((p, i) => (
            <Reveal key={p.name} delay={i * 80}>
              <article
                className={`flex h-full flex-col rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                  p.highlight
                    ? "border-indigo-300 bg-white ring-2 ring-indigo-500/30"
                    : "border-black/5 bg-white"
                }`}
              >
                {p.highlight && (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-bold tracking-tight">
                    {p.price}
                  </span>
                  <span className="pb-1 text-sm text-zinc-400">{p.period}</span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm text-zinc-600">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Icon
                        className="mt-0.5 h-4 w-4 text-indigo-600"
                        path={<path d="m5 12 5 5 9-11" />}
                      />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/chat"
                  className={`mt-6 rounded-full px-5 py-2.5 text-center text-sm font-semibold transition ${
                    p.highlight
                      ? "bg-[#2e2a63] text-white hover:bg-indigo-950"
                      : "border border-black/10 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {p.cta}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}

/* --------------------------------- Footer --------------------------------- */

const EnvelopeGlyph = (
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </>
);

function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-black/5">
      {/* Top area */}
      <div className="relative mx-auto max-w-6xl px-5 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              ClearResolveAI turns your documents and websites into a
              searchable knowledge base with accurate, cited answers — so your
              team always finds what it needs.
            </p>

            {/* Email pill */}
            <a
              href="mailto:hi@clearresolve.ai"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              <Icon className="h-4 w-4 text-zinc-400" path={EnvelopeGlyph} />
              hi@clearresolve.ai
              <Icon
                className="h-4 w-4 text-zinc-400"
                path={<path d="M5 12h14M13 6l6 6-6 6" />}
              />
            </a>

            {/* Social icons */}
            <div className="mt-6 flex items-center gap-2.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-white shadow-sm transition hover:opacity-90 ${s.tile}`}
                >
                  {s.glyph}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading} className="lg:col-span-1">
              <h3 className="text-sm font-bold text-[#2e2a5e]">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-zinc-500 transition hover:text-violet-600"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Giant watermark */}
        <span className="pointer-events-none absolute right-[8%] top-2 select-none text-sm font-semibold text-[#2e2a5e]/[0.10]">
          2025
        </span>
        <span className="pointer-events-none absolute -bottom-[1.5vw] left-1/2 -z-0 -translate-x-1/2 select-none whitespace-nowrap text-[11vw] font-extrabold leading-none tracking-tight text-[#2e2a5e]/[0.06]">
          ClearResolve
        </span>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-5 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md shadow-sm">
              <img
                src="/logo.png"
                alt="ClearResolveAI logo"
                className="h-full w-full object-cover"
              />
            </span>
            © 2025 ClearResolveAI. All Rights Reserved.
          </div>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Go Back To Top
            <Icon
              className="h-4 w-4 text-zinc-500"
              path={<path d="M12 19V5M5 12l7-7 7 7" />}
            />
          </button>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------ About section ----------------------------- */

function AboutSection() {
  return (
    <section
      id="about"
      className="relative mx-auto max-w-4xl px-5 py-24 text-center"
    >
      {/* Label with flanking sparkle glyphs */}
      <div className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#2e2a5e]">
        <Icon className="h-4 w-4 text-zinc-400" path={SparkleGlyph} />
        About ClearResolveAI
        <Icon className="h-4 w-4 text-zinc-400" path={SparkleGlyph} />
      </div>

      {/* Paragraph + orb overlay, orb vertically centered on the text */}
      <div className="relative mx-auto flex max-w-3xl items-center justify-center">
        {/* Full paragraph, all words solid deep indigo (z-0) */}
        <p className="relative z-0 text-3xl font-semibold leading-relaxed tracking-tight text-[#2e2a5e] sm:text-4xl sm:leading-[1.35]">
          {ABOUT_TEXT}
        </p>

        {/* Animated frosted-glass orb overlay, centered over the paragraph */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {/* Soft blurred glow halo behind the orb */}
          <div className="animate-orb-glow absolute h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(147,197,253,0.55),transparent)] blur-2xl sm:h-96 sm:w-96" />

          {/* The frosted glass sphere sitting on top of the text (z-10) */}
          <div
            className="animate-orb relative z-10 h-72 w-72 overflow-hidden rounded-full shadow-[inset_0_1px_20px_rgba(255,255,255,0.6)] backdrop-blur-md sm:h-80 sm:w-80"
            style={{
              backgroundImage:
                "radial-gradient(circle at 34% 30%, rgba(255,255,255,0.92), rgba(191,219,254,0.8) 26%, rgba(165,180,252,0.7) 55%, rgba(129,140,248,0.5) 82%)",
            }}
          >
            {/* Slowly rotating glossy sheen */}
            <div
              className="animate-orb-spin absolute inset-0 rounded-full"
              style={{
                backgroundImage:
                  "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.5), transparent 40%)",
              }}
            />
            {/* Upper-left glossy highlight */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 24%, rgba(255,255,255,0.85), rgba(255,255,255,0) 40%)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- FAQ section ----------------------------- */

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="faq" className="mx-auto max-w-6xl px-5 py-16">
      <Reveal className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-[#2e2a5e] sm:text-4xl">
          Everything You Want
          <br />
          To Know About ClearResolveAI
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-500">
          Find clear answers about ingestion, citations, privacy, and setup.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT: decorative illustration panel */}
        <Reveal>
          <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-violet-100 via-indigo-50 to-orange-100/60 shadow-inner ring-1 ring-black/5">
            {/* faint decorative folded-paper / envelope shape, lower-center */}
            <div className="pointer-events-none absolute bottom-6 left-1/2 h-40 w-56 -translate-x-1/2">
              <div className="absolute inset-0 rotate-6 rounded-2xl bg-white/40 shadow-[0_20px_40px_rgba(99,102,241,0.12)]" />
              <div
                className="absolute inset-x-4 top-3 h-16 bg-white/50"
                style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
              />
            </div>

            {/* floating chat-bubble cards */}
            {FAQ_BUBBLES.map((b, i) => (
              <div
                key={`${b.text}-${i}`}
                className={`animate-orb absolute flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2 shadow-lg shadow-indigo-500/10 ${b.className}`}
                style={{ animationDelay: `${i * 0.6}s` }}
              >
                <span
                  className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-br ${b.avatar}`}
                />
                <span className="text-[11px] leading-snug text-zinc-600">
                  {b.text}
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* RIGHT: controlled accordion */}
        <Reveal>
          <div className="space-y-3">
            {FAQ.map((item, i) => {
              const open = openIndex === i;
              return (
                <div
                  key={item.q}
                  className={
                    open
                      ? "rounded-2xl bg-violet-50/60 ring-1 ring-violet-200"
                      : "rounded-2xl border border-black/5 bg-white shadow-sm"
                  }
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-bold text-[#2e2a5e]">
                      {item.q}
                    </span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black/10 text-zinc-400">
                      <Icon
                        className="h-3.5 w-3.5"
                        path={
                          open ? (
                            <path d="M12 5v14M5 12h14" />
                          ) : (
                            <path d="M5 12h14" />
                          )
                        }
                      />
                    </span>
                  </button>
                  <div
                    className={`grid px-5 transition-all duration-300 ease-out ${
                      open
                        ? "grid-rows-[1fr] pb-4 opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm leading-relaxed text-zinc-500">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ App preview ------------------------------- */

const SearchGlyph = (
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>
);

function AppPreview() {
  const sidebarItems = [
    { label: "Home", icon: <path d="M3 10.5 12 3l9 7.5M5 9v11h14V9" /> },
    {
      label: "Explore",
      icon: (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m15 9-2 6-4 2 2-6 4-2Z" />
        </>
      ),
    },
    {
      label: "Library",
      icon: (
        <>
          <path d="M4 5h4v14H4zM10 5h4v14h-4z" />
          <path d="m16 6 3 .8L16 20" />
        </>
      ),
    },
    {
      label: "Files",
      icon: (
        <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      ),
    },
    {
      label: "History",
      icon: (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      ),
    },
  ];

  const historyGroups = [
    {
      label: "Today",
      items: [
        "Summarize the Q3 report…",
        "What's our refund policy…",
        "Find the API rate limits…",
      ],
    },
    {
      label: "7 Days Ago",
      items: [
        "Where does onboarding start…",
        "Compare v1 and v2 docs…",
      ],
    },
  ];

  const tools = [
    { label: "Search Docs", icon: SearchGlyph },
    {
      label: "Cite Sources",
      icon: (
        <>
          <path d="M9 18h6M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
        </>
      ),
    },
    {
      label: "Summarize",
      icon: (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m4 19 5-5 4 4 3-3 4 4" />
        </>
      ),
    },
    {
      label: "Deep Research",
      icon: (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
        </>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-2xl shadow-indigo-500/10">
      {/* browser chrome bar */}
      <div className="flex items-center justify-between gap-2 border-b border-black/5 bg-zinc-100 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-zinc-400">
          <span className="h-4 w-4 shrink-0 rounded-[5px] bg-gradient-to-br from-indigo-400 via-violet-500 to-pink-400" />
          <span className="hidden items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] text-zinc-400 shadow-sm sm:inline-flex">
            <Icon className="h-3 w-3" path={SearchGlyph} />
            Search
          </span>
          <span className="hidden text-[11px] text-zinc-400 sm:inline">
            + New Tab
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] text-zinc-600 shadow-sm">
            <img
              src="/logo.png"
              alt="ClearResolveAI logo"
              className="h-3 w-3 rounded-[3px] object-cover"
            />
            <span className="truncate">clearresolve.ai</span>
            <Icon className="h-3 w-3 text-zinc-300" path={<path d="M18 6 6 18M6 6l12 12" />} />
          </span>
          <span className="text-zinc-400">…</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-zinc-400">
          <Icon className="h-3.5 w-3.5" path={<path d="M5 12h14" />} />
          <Icon className="h-3 w-3" path={<rect x="5" y="5" width="14" height="14" rx="1.5" />} />
          <Icon className="h-3.5 w-3.5" path={<path d="M18 6 6 18M6 6l12 12" />} />
        </div>
      </div>

      <div className="flex min-h-[420px]">
        {/* Sidebar (hidden on very small screens) */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-black/5 bg-[#faf9fc] p-4 sm:flex">
          <Logo className="h-7 w-7" />
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-black/5 bg-white px-3 py-1.5 text-xs text-zinc-400">
            <Icon className="h-3.5 w-3.5" path={SearchGlyph} />
            <span className="flex-1">Search</span>
            <span className="rounded border border-black/5 bg-zinc-50 px-1 text-[10px] text-zinc-400">
              ⌘
            </span>
          </div>
          <nav className="mt-3 flex flex-col gap-0.5">
            {sidebarItems.map((s, i) => (
              <span
                key={s.label}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                  i === 0
                    ? "bg-indigo-500/10 font-medium text-indigo-600"
                    : "text-zinc-500"
                }`}
              >
                <Icon className="h-4 w-4" path={s.icon} />
                {s.label}
              </span>
            ))}
          </nav>

          <div className="mt-4 flex flex-col gap-1 overflow-hidden">
            {historyGroups.map((group) => (
              <div key={group.label} className="mt-2">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {group.label}
                </p>
                {group.items.map((item, idx) => (
                  <p
                    key={item}
                    className={`truncate px-3 py-1 text-xs text-zinc-400 ${
                      idx === group.items.length - 1 ? "opacity-50" : ""
                    }`}
                  >
                    {item}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Main pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* top row */}
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm">
              <Icon className="h-3 w-3 text-violet-500" path={BeeGlyph} />
              ClearResolve 4o
              <span className="text-zinc-400">▾</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
                <Icon className="h-3 w-3" path={<path d="M12 5v14M5 12h14" />} />
                New Chat
              </span>
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 via-violet-500 to-pink-400" />
            </div>
          </div>

          {/* centered greeting with glowing orb */}
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="relative mb-5 flex items-center justify-center">
              <span className="animate-orb-glow absolute h-16 w-16 rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.55),transparent)] blur-md" />
              <span
                className="animate-orb relative h-11 w-11 rounded-full shadow-lg shadow-violet-500/30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), rgba(255,255,255,0) 42%), conic-gradient(from 210deg, #60a5fa, #8b5cf6, #ec4899, #60a5fa)",
                }}
              />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
              Good Morning, Alex
            </h3>
            <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              How Can I{" "}
              <span className="text-violet-600">Help With Your Docs?</span>
            </p>
          </div>

          {/* composer */}
          <div className="px-4 pb-5">
            <div className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-2 text-sm text-zinc-400">
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  path={
                    <>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </>
                  }
                />
                <span>Ask a question about your documents…</span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-zinc-400">
                  {tools.map((t) => (
                    <span
                      key={t.label}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-400"
                    >
                      <Icon className="h-3.5 w-3.5" path={t.icon} />
                      {t.label}
                    </span>
                  ))}
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-violet-700 to-[#211d3f] text-white shadow-md shadow-violet-600/30">
                  <Icon className="h-4 w-4" path={<path d="M5 12h14M13 6l6 6-6 6" />} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Feature illustrations -------------------------- */

const ChatBubble = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-black/5 bg-white px-2.5 py-1.5 text-[10px] leading-snug text-zinc-600 shadow-sm ${className}`}
  >
    {children}
  </div>
);

const FEATURE_CARDS = [
  {
    title: "Grounded Answers",
    desc: "ClearResolveAI answers using only your indexed content, so responses stay accurate and are never made up.",
    glow: "bg-[radial-gradient(closest-side,rgba(139,92,246,0.14),transparent)]",
    illustration: (
      <div className="relative flex w-full max-w-[15rem] flex-col items-center gap-2">
        <div className="flex w-full justify-start">
          <ChatBubble>What's our refund policy?</ChatBubble>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-white shadow-md shadow-violet-500/40">
          <Icon className="h-2.5 w-2.5" path={SparkleGlyph} />
          Grounded Answer
        </div>
        <div className="flex w-full justify-start">
          <ChatBubble className="max-w-[90%]">
            Per the docs: refunds within 30 days.
          </ChatBubble>
        </div>
        <span className="text-[10px] text-zinc-300">Cited from policy.pdf</span>
      </div>
    ),
  },
  {
    title: "Docs & Website Ingestion",
    desc: "Upload PDFs, Markdown, HTML, or JSON, or crawl entire websites — everything is chunked and indexed automatically.",
    glow: "bg-[radial-gradient(closest-side,rgba(96,165,250,0.18),transparent)]",
    illustration: (
      <div className="relative h-40 w-full max-w-[15rem]">
        {/* faint tilted perspective grid backdrop */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full opacity-[0.07]"
        >
          <path
            d="M10 68 L50 54 L90 68 M28 84 L50 54 L72 84 M50 54 L50 22 M22 44 L78 44"
            fill="none"
            stroke="#4338ca"
            strokeWidth="0.6"
          />
        </svg>
        {/* dotted connector lines */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <g stroke="#c4b5fd" strokeWidth="0.8" strokeDasharray="2 3" fill="none">
            <line x1="50" y1="50" x2="18" y2="20" />
            <line x1="50" y1="50" x2="16" y2="76" />
            <line x1="50" y1="50" x2="52" y2="14" />
            <line x1="50" y1="50" x2="84" y2="34" />
            <line x1="50" y1="50" x2="82" y2="72" />
          </g>
        </svg>
        {/* central glowing node */}
        <div className="animate-orb-glow absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.5),transparent)]" />
        <div className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-blue-500/50 ring-4 ring-blue-400/20">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>
        {/* tiny cursor near the node */}
        <Icon
          className="absolute left-[60%] top-[60%] h-3 w-3 text-zinc-500"
          path={<path d="M4 3l7 17 2.5-7L20 10 4 3Z" />}
        />
        {/* chat tile (top-left) */}
        <div className="absolute left-[18%] top-[20%] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-md">
          <Icon
            className="h-4 w-4"
            path={
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
            }
          />
        </div>
        {/* sun/asterisk tile (lower-left) */}
        <div className="absolute left-[16%] top-[76%] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-md">
          <Icon
            className="h-4 w-4"
            path={
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
              </>
            }
          />
        </div>
        {/* dark window/grid tile (top) */}
        <div className="absolute left-[52%] top-[14%] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 text-white shadow-md">
          <Icon
            className="h-4 w-4"
            path={
              <>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 9h18" />
              </>
            }
          />
        </div>
        {/* faint grid tile (right) */}
        <div className="absolute left-[84%] top-[34%] flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-black/5 bg-white/70 text-zinc-300 shadow-sm">
          <Icon
            className="h-4 w-4"
            path={
              <>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </>
            }
          />
        </div>
        {/* faint sparkle tile (right-lower) */}
        <div className="absolute left-[82%] top-[72%] flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-black/5 bg-white/60 text-violet-200 shadow-sm">
          <Icon className="h-4 w-4" path={SparkleGlyph} />
        </div>
      </div>
    ),
  },
  {
    title: "Instant, Cited Responses",
    desc: "Get fast answers with citations back to the exact source, perfect for quick lookups and research.",
    glow: "bg-[radial-gradient(closest-side,rgba(129,140,248,0.12),transparent)]",
    illustration: (
      <div className="relative h-full w-full max-w-[15rem]">
        {/* faint dotted grid backdrop */}
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle,rgba(99,102,241,0.12)_1px,transparent_1px)] opacity-70 [background-size:12px_12px]" />
        <div className="relative flex flex-col gap-1.5">
          <div className="flex items-center justify-end gap-1.5">
            <ChatBubble>Where's the API rate limit?</ChatBubble>
            <span className="h-4 w-4 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500" />
          </div>
          <div className="flex justify-start">
            <ChatBubble>Which product?</ChatBubble>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <ChatBubble>The billing API</ChatBubble>
            <span className="h-4 w-4 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-blue-500" />
          </div>
          <div className="flex items-center justify-start gap-1.5">
            <span className="h-4 w-4 shrink-0 rounded-full bg-gradient-to-br from-pink-400 to-rose-500" />
            <ChatBubble>Okay, 100 req/min</ChatBubble>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Always Available",
    desc: "Your knowledge base is online 24/7, ready to answer whenever your team needs it.",
    glow: "bg-[radial-gradient(closest-side,rgba(139,92,246,0.18),transparent)]",
    illustration: (
      <div className="relative flex items-center justify-center gap-2.5">
        <div className="animate-orb-glow absolute h-28 w-28 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.28),transparent)]" />
        {/* left clock button */}
        <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-violet-500/40">
          <Icon
            className="h-4 w-4"
            path={
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </>
            }
          />
        </div>
        {/* dashed ring gauge */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#ring247)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="3 4.6"
            />
            <defs>
              <linearGradient id="ring247" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute flex items-baseline">
            <span className="text-2xl font-bold text-violet-600">24</span>
            <span className="text-xs font-semibold text-violet-400">hr</span>
          </div>
        </div>
        {/* right sun button */}
        <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-violet-500/40">
          <Icon
            className="h-4 w-4"
            path={
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" />
              </>
            }
          />
        </div>
      </div>
    ),
  },
  {
    title: "Research & Summaries",
    desc: "Summarize long documents, compare sources, and pull out the key points in seconds.",
    glow: "bg-[radial-gradient(closest-side,rgba(139,92,246,0.14),transparent)]",
    illustration: (
      <div className="relative h-40 w-full max-w-[15rem]">
        {/* connector lines from orb to pills */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <g stroke="#c4b5fd" strokeWidth="0.8" fill="none">
            <line x1="50" y1="16" x2="22" y2="46" />
            <line x1="50" y1="16" x2="78" y2="46" />
            <line x1="50" y1="16" x2="50" y2="82" />
          </g>
        </svg>
        {/* glowing gradient orb (top center) */}
        <div className="animate-orb-glow absolute left-1/2 top-[16%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.4),transparent)]" />
        <div className="absolute left-1/2 top-[16%] h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-400 via-violet-500 to-pink-400 shadow-lg shadow-violet-500/40" />
        {/* IDEAS pill */}
        <div className="absolute left-[22%] top-[46%] inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-violet-600 shadow-sm">
          <Icon
            className="h-2.5 w-2.5"
            path={
              <>
                <path d="M9 18h6M10 22h4" />
                <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
              </>
            }
          />
          Search
        </div>
        {/* DRAFTS pill */}
        <div className="absolute left-[78%] top-[46%] inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-violet-600 shadow-sm">
          <Icon
            className="h-2.5 w-2.5"
            path={
              <>
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
                <path d="M14 3v5h5" />
              </>
            }
          />
          Summarize
        </div>
        {/* CONCEPTS pill */}
        <div className="absolute left-1/2 top-[82%] inline-flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[8px] font-semibold uppercase tracking-wide text-violet-600 shadow-sm">
          Sources
        </div>
      </div>
    ),
  },
  {
    title: "Private & Secure",
    desc: "Your documents stay in your own database and are never shared or used to train third-party models.",
    glow: "bg-[radial-gradient(closest-side,rgba(139,92,246,0.16),transparent)]",
    illustration: (
      <div className="relative flex h-40 w-full max-w-[15rem] items-center justify-center">
        {/* faint blurred code/text lines in the background */}
        <div className="pointer-events-none absolute inset-x-8 top-3 flex flex-col gap-1.5 opacity-30 blur-[1px]">
          <span className="h-1 w-3/4 rounded-full bg-zinc-300" />
          <span className="h-1 w-1/2 rounded-full bg-zinc-300" />
          <span className="h-1 w-2/3 rounded-full bg-zinc-300" />
          <span className="h-1 w-2/5 rounded-full bg-zinc-300" />
        </div>
        {/* podium radial glow */}
        <div className="animate-orb-glow absolute bottom-5 h-14 w-32 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.45),transparent)] blur-md" />
        {/* concentric podium rings */}
        <div className="absolute bottom-6 h-4 w-28 rounded-[50%] border border-violet-300/40" />
        <div className="absolute bottom-7 h-3 w-20 rounded-[50%] border border-violet-300/50" />
        {/* glowing 3D shield with keyhole */}
        <svg
          viewBox="0 0 64 72"
          className="relative h-28 w-28 drop-shadow-[0_10px_18px_rgba(139,92,246,0.5)]"
        >
          <defs>
            <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <path
            d="M32 5 L57 15 L57 34 C57 50 46 61 32 66 C18 61 7 50 7 34 L7 15 Z"
            fill="url(#shieldGrad)"
          />
          {/* glossy highlight */}
          <path
            d="M32 5 L57 15 L57 34 C57 45 52 53 45 58 C40 40 36 22 32 5 Z"
            fill="rgba(255,255,255,0.14)"
          />
          {/* keyhole */}
          <circle cx="32" cy="30" r="5" fill="#ffffff" />
          <path d="M29.5 33 L27.8 44 L36.2 44 L34.5 33 Z" fill="#ffffff" />
        </svg>
      </div>
    ),
  },
];
