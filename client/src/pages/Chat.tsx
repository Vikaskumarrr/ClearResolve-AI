import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { filterByTitle } from "./chatSearch";

/* ---------------------------------- Types --------------------------------- */

type Citation = { source: string; snippet: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

/** Sidebar conversation entry as returned by the Conversation_Store. */
type SidebarConversation = {
  _id: string;
  title: string;
  updatedAt?: string;
};

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

const ICONS = {
  logo: (
    <>
      <path d="M12 3a7 7 0 0 1 7 7c0 2.5-1.4 4-3 5.5V18a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.5C6.4 14 5 12.5 5 10a7 7 0 0 1 7-7Z" />
      <path d="M9 22h6" />
    </>
  ),
  collapse: (
    <>
      <rect width="18" height="16" x="3" y="4" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </>
  ),
  library: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </>
  ),
  files: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  caret: <path d="m6 9 6 6 6-6" />,
  more: (
    <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
    </>
  ),
  gauge: (
    <>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </>
  ),
  send: <path d="m5 12 14-7-4 7 4 7-14-7Z" />,
  paperclip: (
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  ),
  pie: (
    <>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10Z" />
    </>
  ),
  check: (
    <>
      <path d="m9 11 3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  bot: (
    <>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
    </>
  ),
};

/* --------------------------------- Content -------------------------------- */

const NAV: { label: string; icon: React.ReactNode }[] = [
  { label: "Explore", icon: ICONS.globe },
  { label: "Library", icon: ICONS.library },
  { label: "Files", icon: ICONS.files },
  { label: "History", icon: ICONS.history },
];

const SUGGESTION_CARDS: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}[] = [
  {
    icon: ICONS.pie,
    title: "Summarize a Document",
    desc: "Summarize my uploaded document",
  },
  {
    icon: ICONS.bulb,
    title: "Key Takeaways",
    desc: "What are the key takeaways?",
  },
  {
    icon: ICONS.check,
    title: "Find in Docs",
    desc: "What does the doc say about security?",
  },
];

/* ---------------------------------- Page ---------------------------------- */

export default function Chat() {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Conversation history sidebar state.
  const [conversations, setConversations] = useState<SidebarConversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openingConv, setOpeningConv] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Load the user's conversation list on mount (Requirements 4.1–4.5).
  useEffect(() => {
    let mounted = true;
    (async () => {
      setConvLoading(true);
      setConvError(null);
      try {
        const res = await fetch("/api/conversations", {
          credentials: "include",
        });
        const data = await res.json();
        if (!mounted) return;
        if (res.ok) {
          setConversations(
            Array.isArray(data.conversations) ? data.conversations : []
          );
        } else {
          setConvError(
            data?.error?.message ?? "Failed to load conversations."
          );
        }
      } catch {
        if (mounted) setConvError("Failed to reach the server.");
      } finally {
        if (mounted) setConvLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg(null);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();

      if (res.ok) {
        setUploadMsg("Indexing started…");
      } else {
        setUploadMsg(data?.error?.message ?? "Upload failed");
      }
    } catch {
      setUploadMsg("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = ""; // allow re-uploading same file
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Lazily create a conversation on the first send (Requirement 3.2/3.3).
      let convId = activeId;
      if (!convId) {
        const createRes = await fetch("/api/conversations", {
          method: "POST",
          credentials: "include",
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content:
                createData?.error?.message ?? "Something went wrong.",
            },
          ]);
          return;
        }
        convId = createData.conversation._id as string;
        setActiveId(convId);
      }

      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();

      if (res.ok) {
        const assistant = data.assistantMessage;
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: assistant?.content ?? "No response",
            citations: Array.isArray(assistant?.citations)
              ? assistant.citations
              : [],
          },
        ]);

        // Update the sidebar item's title and move it to the top
        // (most-recently-updated first — Requirements 6.3, 4.1).
        const finalId = convId;
        setConversations((list) => {
          const existing = list.find((c) => c._id === finalId);
          const updated: SidebarConversation = {
            _id: finalId,
            title: data.title ?? existing?.title ?? "",
            updatedAt: new Date().toISOString(),
          };
          const rest = list.filter((c) => c._id !== finalId);
          return [updated, ...rest];
        });
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data?.error?.message ?? "Something went wrong.",
          },
        ]);
      }
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

  // Open a past conversation and render its full message history with saved
  // citations (Requirements 5.1–5.5).
  async function openConversation(id: string) {
    if (openingConv) return;
    setActiveId(id);
    setUploadMsg(null);
    setActionError(null);
    setOpeningConv(true);
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        const mapped: Message[] = Array.isArray(data.messages)
          ? data.messages.map(
              (m: {
                role: "user" | "assistant";
                content: string;
                citations?: Citation[];
              }) => ({
                role: m.role,
                content: m.content,
                citations: Array.isArray(m.citations) ? m.citations : [],
              })
            )
          : [];
        setMessages(mapped);
      } else {
        setMessages([
          {
            role: "assistant",
            content:
              data?.error?.message ?? "Failed to open conversation.",
          },
        ]);
      }
    } catch {
      setMessages([
        { role: "assistant", content: "Error contacting the server." },
      ]);
    } finally {
      setOpeningConv(false);
    }
  }

  function startRename(id: string, currentTitle: string) {
    setActionError(null);
    setRenamingId(id);
    setRenameValue(currentTitle);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  // Rename a conversation (Requirements 8.1, 8.2, 8.3).
  async function submitRename(id: string) {
    const title = renameValue.trim();
    // Reject blank titles client-side before sending (Requirement 8.2).
    if (!title) {
      cancelRename();
      return;
    }
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (res.ok) {
        const newTitle = data.conversation?.title ?? title;
        setConversations((list) =>
          list.map((c) => (c._id === id ? { ...c, title: newTitle } : c))
        );
      } else {
        setActionError(
          data?.error?.message ?? "Failed to rename conversation."
        );
      }
    } catch {
      setActionError("Failed to reach the server.");
    } finally {
      cancelRename();
    }
  }

  // Delete a conversation and clear the view if it was open
  // (Requirements 9.1, 9.2, 9.3).
  async function removeConversation(id: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setConversations((list) => list.filter((c) => c._id !== id));
        if (activeId === id) {
          setActiveId(null);
          setMessages([]);
        }
      } else {
        const data = await res.json().catch(() => null);
        setActionError(
          data?.error?.message ?? "Failed to delete conversation."
        );
      }
    } catch {
      setActionError("Failed to reach the server.");
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

  function newChat() {
    setMessages([]);
    setInput("");
    setUploadMsg(null);
    setActiveId(null);
    setActionError(null);
    inputRef.current?.focus();
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors — navigate home regardless.
    } finally {
      navigate("/");
    }
  }

  const hasMessages = messages.length > 0;

  // Client-side title search (Requirements 10.1, 10.2, 10.3).
  const filteredConversations = filterByTitle(conversations, search);
  const showNoMatch =
    !convLoading &&
    !convError &&
    conversations.length > 0 &&
    filteredConversations.length === 0 &&
    search.trim() !== "";

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f3f1fb] text-zinc-900">
      {/* Ambient blurred purple glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-[-12%] h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.35),transparent)] blur-3xl" />
        <div className="absolute right-[-8%] top-[35%] h-[440px] w-[440px] rounded-full bg-[radial-gradient(closest-side,rgba(196,181,253,0.35),transparent)] blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/4 h-[360px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(216,180,254,0.3),transparent)] blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="hidden w-[272px] shrink-0 flex-col border-r border-black/5 bg-white/50 backdrop-blur-xl lg:flex">
        {/* Brand row */}
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-indigo-500/25">
            <img
              src="/logo.png"
              alt="ClearResolveAI logo"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-base font-semibold tracking-tight">
            ClearResolveAI
          </span>
          <button
            type="button"
            aria-label="Collapse panel"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-black/5 hover:text-zinc-600"
          >
            <Icon className="h-4.5 w-4.5" path={ICONS.collapse} />
          </button>
        </div>

        {/* New chat */}
        <div className="px-4">
          <button
            type="button"
            onClick={newChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-black/10 transition hover:bg-zinc-800"
          >
            <Icon className="h-4 w-4" path={ICONS.plus} />
            New chat
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 rounded-lg border border-black/5 bg-white/70 px-3 py-2">
            <Icon className="h-4 w-4 text-zinc-400" path={ICONS.search} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
            />
            <span className="flex h-5 items-center rounded-md border border-black/10 bg-white px-1.5 text-[10px] font-medium text-zinc-400">
              ⌘K
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-2 pt-3">
          {NAV.map((n) => (
            <button
              key={n.label}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-black/5 hover:text-zinc-900"
            >
              <Icon className="h-4.5 w-4.5" path={n.icon} />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="mx-4 my-3 border-t border-black/5" />

        {/* History */}
        <div className="scroll-area flex-1 overflow-y-auto px-2 pb-2">
          {actionError && (
            <div className="mx-1 mb-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600">
              {actionError}
            </div>
          )}

          {convLoading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-zinc-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              Loading conversations…
            </div>
          ) : convError ? (
            <div className="mx-1 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600">
              {convError}
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-4 text-sm text-zinc-400">
              No conversations yet. Start a new chat.
            </p>
          ) : showNoMatch ? (
            <p className="px-3 py-4 text-sm text-zinc-400">
              No conversations match “{search.trim()}”.
            </p>
          ) : (
            <div className="mb-3">
              {filteredConversations.map((c) => (
                <div key={c._id} className="group relative flex items-center">
                  {renamingId === c._id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void submitRename(c._id);
                        } else if (e.key === "Escape") {
                          cancelRename();
                        }
                      }}
                      onBlur={() => void submitRename(c._id)}
                      className="w-full rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-sm text-zinc-800 focus:outline-none"
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void openConversation(c._id)}
                        title={c.title || "Untitled"}
                        className={`block w-full truncate rounded-lg px-3 py-1.5 pr-14 text-left text-sm transition hover:bg-black/5 ${
                          activeId === c._id
                            ? "bg-black/5 text-zinc-900"
                            : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        {c.title || "Untitled"}
                      </button>
                      <div className="absolute right-1 hidden items-center gap-0.5 group-hover:flex">
                        <button
                          type="button"
                          aria-label="Rename conversation"
                          onClick={() => startRename(c._id, c.title)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-black/5 hover:text-zinc-700"
                        >
                          <Icon className="h-4 w-4" path={ICONS.pencil} />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete conversation"
                          onClick={() => void removeConversation(c._id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-500/10 hover:text-red-600"
                        >
                          <Icon className="h-4 w-4" path={ICONS.trash} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User card */}
        <div className="border-t border-black/5 px-3 py-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500 text-xs font-semibold text-white">
              ES
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-zinc-800">
                Emerson Sterling
              </p>
              <p className="truncate text-[11px] text-zinc-400">
                sterlingpr@clearresolve.ai
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Log out"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-black/5 hover:text-zinc-600"
            >
              <Icon className="h-4.5 w-4.5" path={ICONS.logout} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3.5 sm:px-6">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600">
              <Icon className="h-3 w-3 text-white" path={ICONS.logo} />
            </span>
            ClearResolveAI
            <Icon className="h-3.5 w-3.5 text-zinc-400" path={ICONS.caret} />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="More"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-black/5 hover:text-zinc-700"
            >
              <Icon className="h-5 w-5" path={ICONS.more} />
            </button>
            <button
              type="button"
              aria-label="Copy link"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-black/5 hover:text-zinc-700"
            >
              <Icon className="h-5 w-5" path={ICONS.link} />
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              <Icon className="h-4 w-4" path={ICONS.download} />
              Export chat
            </button>
            <button
              type="button"
              className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
            >
              Upgrade
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main ref={scrollRef} className="scroll-area flex-1 overflow-y-auto">
          {openingConv ? (
            <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <p className="text-sm text-zinc-500">Loading conversation…</p>
            </div>
          ) : !hasMessages ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center px-4 pb-10 pt-6">
              {/* Orb */}
              <div className="relative mt-4 mb-8 flex h-40 w-40 items-center justify-center">
                <div className="animate-orb-glow absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.65),transparent)] blur-2xl" />
                <div className="animate-orb h-28 w-28 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff,rgba(196,181,253,0.9)_45%,rgba(139,92,246,0.85))] shadow-[0_20px_60px_-15px_rgba(139,92,246,0.6)] ring-1 ring-white/60" />
              </div>

              {/* Greeting */}
              <h2 className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-2xl font-medium text-transparent sm:text-3xl">
                Hello there
              </h2>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
                What can I help you find in your docs?
              </p>

              {/* Composer */}
              <div className="mt-10 w-full">
                <Composer
                  input={input}
                  setInput={setInput}
                  onSubmit={handleSubmit}
                  onKeyDown={handleKeyDown}
                  inputRef={inputRef}
                  loading={loading}
                  uploading={uploading}
                  fileRef={fileRef}
                  onFileChange={uploadFile}
                />
                {uploadMsg && (
                  <p className="mt-2 px-1 text-center text-xs text-zinc-500">
                    {uploadMsg}
                  </p>
                )}
              </div>

              {/* Suggestion cards */}
              <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                {SUGGESTION_CARDS.map((c) => (
                  <button
                    key={c.title}
                    type="button"
                    onClick={() => send(c.desc)}
                    className="group rounded-2xl border border-black/5 bg-white/70 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-md"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 text-violet-600 ring-1 ring-violet-500/15">
                      <Icon className="h-5 w-5" path={c.icon} />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {c.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      {c.desc}
                    </p>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <p className="mt-10 text-center text-xs text-zinc-400">
                Answers are grounded in your indexed documents and cited to the
                source.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-6">
              <div className="space-y-5">
                {messages.map((m, i) => (
                  <MessageBubble key={i} message={m} />
                ))}
                {loading && <TypingIndicator />}
              </div>
            </div>
          )}
        </main>

        {/* Docked composer when a conversation exists */}
        {hasMessages && (
          <div className="border-t border-black/5 bg-white/50 backdrop-blur-xl">
            <div className="mx-auto max-w-3xl px-4 py-4">
              <Composer
                input={input}
                setInput={setInput}
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                inputRef={inputRef}
                loading={loading}
                uploading={uploading}
                fileRef={fileRef}
                onFileChange={uploadFile}
              />
              {uploadMsg && (
                <p className="mt-2 text-center text-xs text-zinc-500">
                  {uploadMsg}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Composer -------------------------------- */

function Composer({
  input,
  setInput,
  onSubmit,
  onKeyDown,
  inputRef,
  loading,
  uploading,
  fileRef,
  onFileChange,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  loading: boolean;
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-black/5 bg-white shadow-sm transition focus-within:shadow-md"
    >
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        autoFocus
        placeholder="Ask anything about your documents…"
        className="max-h-48 w-full resize-none bg-transparent px-4 pt-4 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
      />

      {/* Control row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-600 transition hover:bg-violet-50"
        >
          <Icon className="h-3.5 w-3.5" path={ICONS.sparkle} />
          Deeper Research
        </button>
        <button
          type="button"
          aria-label="Layers"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-black/5 hover:text-zinc-600"
        >
          <Icon className="h-4.5 w-4.5" path={ICONS.layers} />
        </button>
        <button
          type="button"
          aria-label="Ideas"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-black/5 hover:text-zinc-600"
        >
          <Icon className="h-4.5 w-4.5" path={ICONS.bulb} />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-black/5 hover:text-zinc-600"
          >
            <Icon className="h-4.5 w-4.5" path={ICONS.gauge} />
          </button>
          <button
            type="button"
            aria-label="Web"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-black/5 hover:text-zinc-600"
          >
            <Icon className="h-4.5 w-4.5" path={ICONS.globe} />
          </button>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white shadow-md shadow-violet-500/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="pointer-events-none absolute inset-x-1 top-1 h-2 rounded-full bg-white/30 blur-[1px]" />
            <Icon className="relative h-4 w-4" path={ICONS.send} />
          </button>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="flex items-center justify-between border-t border-black/5 px-4 py-2.5 text-xs text-zinc-500">
        <button
          type="button"
          className="flex items-center gap-1.5 transition hover:text-zinc-700"
        >
          <Icon className="h-3.5 w-3.5" path={ICONS.sparkle} />
          Saved prompts
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.md,.txt,.html,.json,application/pdf"
          onChange={onFileChange}
          disabled={uploading}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 transition hover:text-zinc-700 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              Indexing…
            </>
          ) : (
            <>
              <Icon className="h-3.5 w-3.5" path={ICONS.paperclip} />
              Attach file
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ----------------------------- Message bubble ----------------------------- */

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
            ? "bg-zinc-200 text-zinc-600"
            : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20"
        }`}
      >
        {isUser ? "You" : <Icon className="h-4 w-4" path={ICONS.bot} />}
      </div>
      <div
        className={`flex max-w-[80%] flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? "rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
              : "rounded-tl-sm border border-black/5 bg-white text-zinc-800"
          }`}
        >
          {message.content}
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <Citations citations={message.citations} />
        )}
      </div>
    </div>
  );
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function Citations({ citations }: { citations: Citation[] }) {
  // Collapse to distinct sources, keeping the first snippet seen for each so we
  // can surface it as a tooltip.
  const bySource = new Map<string, string>();
  for (const { source, snippet } of citations) {
    if (!bySource.has(source)) bySource.set(source, snippet);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pl-1">
      <span className="text-xs font-medium text-zinc-400">Sources:</span>
      {[...bySource.entries()].map(([source, snippet]) => {
        const pillClass =
          "inline-flex max-w-[16rem] items-center gap-1 truncate rounded-full border border-black/5 bg-zinc-100/80 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200/80";
        return isHttpUrl(source) ? (
          <a
            key={source}
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            title={snippet}
            className={`${pillClass} text-violet-600 hover:text-violet-700`}
          >
            <span className="text-[0.65rem]">🔗</span>
            <span className="truncate">{source}</span>
          </a>
        ) : (
          <span key={source} title={snippet} className={pillClass}>
            <span className="text-[0.65rem]">📄</span>
            <span className="truncate">{source}</span>
          </span>
        );
      })}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex animate-msg-in items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
        <Icon className="h-4 w-4" path={ICONS.bot} />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-black/5 bg-white px-4 py-3.5 shadow-sm">
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
