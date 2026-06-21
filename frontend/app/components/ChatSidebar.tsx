"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type ChatSession = {
  id: string;
  title: string | null;
  created_at: string;
  isTemp?: boolean;
};

type Props = {
  activeChat: ChatSession | null;
  onSelectChat: (chat: ChatSession) => void;
  onNewChat: (chat: ChatSession) => void;
  onDeleteChat: (chat: ChatSession) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
};

type StoredUser = { name: string | null; email: string };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ChatSidebar({ activeChat, onSelectChat, onNewChat, onDeleteChat, isOpen, onClose }: Props) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }

    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    fetch("/api/chats", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setChats(data); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  function handleNewChat() {
    const tempChat: ChatSession = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: "New Chat",
      created_at: new Date().toISOString(),
      isTemp: true,
    };
    onNewChat(tempChat);
  }

  const displayedChats = [...chats];
  if (activeChat && activeChat.isTemp && !chats.some((c) => c.id === activeChat.id)) {
    displayedChats.unshift(activeChat);
  }

  const isDark = mounted && theme === "dark";

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 shrink-0 flex-col border-r border-slate-200/80 dark:border-white/8 bg-white/95 dark:bg-[#0a0c18]/95 backdrop-blur-sm transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:bg-white/70 md:dark:bg-[#0a0c18]/80 ${isOpen ? "translate-x-0" : "-translate-x-full"
        }`}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 dark:border-white/8">
          <span
            style={{ fontFamily: "var(--font-cal-sans), var(--font-geist-sans), sans-serif" }}
            className="text-base font-semibold text-slate-800 dark:text-zinc-100 tracking-tight transition-colors"
          >
            AskDocs
          </span>
          <div className="flex items-center gap-1.5">
            <button
              id="new-chat-btn"
              onClick={handleNewChat}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-zinc-400 transition hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              title="New chat"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/8 transition cursor-pointer"
              title="Close sidebar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Section label ── */}
        <div className="px-5 pt-5 pb-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
            Recent
          </span>
        </div>

        {/* ── Chat list ── */}
        <div className="flex-1 overflow-y-auto py-1 px-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 dark:border-white/10 border-t-indigo-500" />
            </div>
          ) : displayedChats.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-400 dark:text-zinc-500">
              No chats yet. Create one to get started.
            </p>
          ) : (
            displayedChats.map((chat) => (
              <div
                key={chat.id}
                id={`chat-item-${chat.id}`}
                onClick={() => onSelectChat(chat)}
                className={`group relative flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors cursor-pointer mb-1 ${activeChat?.id === chat.id
                    ? "bg-indigo-50 dark:bg-indigo-500/12 border border-indigo-100 dark:border-indigo-500/20"
                    : "hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent"
                  }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-8">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${activeChat?.id === chat.id ? "bg-indigo-500" : "bg-slate-300 dark:bg-zinc-600"
                    }`} />
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-medium transition-colors ${activeChat?.id === chat.id
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-slate-700 dark:text-zinc-300"
                      }`}>
                      {chat.title || "Untitled Chat"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-zinc-500">{timeAgo(chat.created_at)}</p>
                  </div>
                </div>

                {deletingId === chat.id ? (
                  <div className="absolute right-2 flex h-6 w-6 items-center justify-center">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                  </div>
                ) : (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm("Delete this chat and all its embeddings?")) {
                        setDeletingId(chat.id);
                        try { await onDeleteChat(chat); }
                        catch (err) { alert(err instanceof Error ? err.message : "Error deleting chat"); }
                        finally { setDeletingId(null); }
                      }
                    }}
                    title="Delete chat"
                    className="absolute right-2 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-md hover:bg-red-50 dark:hover:bg-red-500/15 text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 dark:border-white/8 flex flex-col">

          {/* Row 1: Theme toggle */}
          {mounted && (
            <div className="px-4 pt-3 pb-2">
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label="Toggle theme"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all duration-200 cursor-pointer"
              >
                <span className="shrink-0">{isDark ? <SunIcon /> : <MoonIcon />}</span>
                <span className="text-sm font-medium">{isDark ? "Light mode" : "Dark mode"}</span>
              </button>
            </div>
          )}

          {/* Row 2: User avatar + name + logout */}
          {user && (
            <div className="px-4 pb-4 flex items-center gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-sm font-semibold text-white">
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700 dark:text-zinc-200">
                  {user.name || "User"}
                </p>
                <p className="truncate text-xs text-slate-400 dark:text-zinc-500">{user.email}</p>
              </div>
              {/* Logout button */}
              <button
                type="button"
                title="Sign out"
                onClick={() => setShowSignOutConfirm(true)}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* ── Sign Out Confirmation Modal ── */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#131526] border border-slate-200 dark:border-white/10 p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{ fontFamily: "var(--font-cal-sans), var(--font-geist-sans), sans-serif" }}
              className="text-lg font-semibold text-slate-950 dark:text-white"
            >
              Sign out
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to sign out?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignOutConfirm(false);
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  window.dispatchEvent(new Event("auth-changed"));
                }}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 border border-transparent dark:border-red-500/30 rounded-xl transition cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
