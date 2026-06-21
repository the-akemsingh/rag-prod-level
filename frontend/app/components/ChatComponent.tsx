"use client";

import { useEffect, useRef, useState } from "react";
import AssistantMessage from "@/app/components/AssistantMessage";
import ChatSidebar, { ChatSession } from "@/app/components/ChatSidebar";
import {
  getDocumentAcceptAttribute,
  getDocumentRejectionMessage,
  isAllowedDocument,
} from "@/lib/allowed-documents";

type ChatEntry = {
  id: string;
  role: "user" | "assistant" | "document";
  content: string;
};

type UploadPhase = "idle" | "uploading" | "ready" | "error";

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getBackendWsUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? "ws://localhost:8000";
}

function QuestionNavigator({ messages }: { messages: ChatEntry[] }) {
  const userMsgs = messages.filter((m) => m.role === "user");
  if (userMsgs.length === 0) return null;

  function scrollTo(id: string) {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col items-end gap-1.5 pointer-events-auto">
      {userMsgs.map((msg, i) => (
        <div key={msg.id} className="group relative flex items-center justify-end py-1">
          {/* Tooltip on hover */}
          <div className="absolute right-8 bg-slate-900/95 dark:bg-[#1a1b2d]/95 backdrop-blur-sm text-slate-100 dark:text-zinc-200 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 shadow-xl border border-slate-700/30 dark:border-white/5 max-w-xs truncate">
            {msg.content}
          </div>
          {/* Dash line */}
          <button
            onClick={() => scrollTo(msg.id)}
            title={msg.content}
            className="flex h-3 items-center justify-end pl-4 cursor-pointer focus:outline-none"
          >
            <div className="h-[2px] w-6 bg-slate-300 dark:bg-zinc-600 group-hover:w-10 group-hover:bg-indigo-500 dark:group-hover:bg-indigo-400 transition-all duration-200 rounded-full" />
          </button>
        </div>
      ))}
    </div>
  );
}


export default function ChatComponent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    setMessages([]);
    setUploadPhase("idle");
    setUploadedFileName(null);
    setUploadError(null);
    setChatError(null);
    wsRef.current?.close();
    wsRef.current = null;
    setWsConnected(false);
    if (activeChat.isTemp) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`/api/chats/${activeChat.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: { id: string; role: "user" | "assistant" | "document"; content: string }[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data.map((m) => ({ id: m.id, role: m.role, content: m.content })));
          const firstDoc = data.find((m) => m.role === "document");
          if (firstDoc) {
            setUploadPhase("ready");
            setUploadedFileName(firstDoc.content);
            connectWs(activeChat.id, token);
          }
        }
      })
      .catch(() => { });
  }, [activeChat?.id]);

  function connectWs(chatId: string, token: string) {
    const ws = new WebSocket(`${getBackendWsUrl()}/ws/chat/${chatId}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) { setChatError(data.error); setIsSending(false); return; }
      setMessages((prev) => [...prev, { id: createId(), role: "assistant", content: data.response ?? "" }]);
      setIsSending(false);
      scrollChatToBottom();
    };
    ws.onerror = () => { setChatError("Connection error. Please refresh."); setIsSending(false); };
  }

  function scrollChatToBottom() {
    requestAnimationFrame(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); });
  }

  async function uploadFilesDirectly(files: File[]) {
    if (files.length === 0 || uploadPhase === "uploading" || !activeChat) return;
    setUploadError(null);
    setUploadPhase("uploading");
    const formData = new FormData();
    for (const file of files) formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const uploadChatId = activeChat.isTemp ? "new" : activeChat.id;
      const response = await fetch(`/api/chats/${uploadChatId}/upload-doc`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (response.status !== 201) {
        const data = await response.json().catch(() => ({}));
        const detail =
          typeof data?.error === "string" ? data.error
            : typeof data?.detail === "string" ? data.detail
              : `Upload failed (${response.status}).`;
        throw new Error(detail);
      }
      const resData = await response.json();
      const returnedChatId = resData.chat_id || activeChat.id;
      const returnedChatTitle = resData.chat_title || activeChat.title;
      const updatedChat: ChatSession = { id: returnedChatId, title: returnedChatTitle, created_at: new Date().toISOString() };
      setUploadedFileName(files.map((f) => f.name).join(", "));
      setUploadPhase("ready");
      setMessages((prev) => [...prev, ...files.map((f) => ({ id: createId(), role: "document" as const, content: f.name }))]);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowUploadPanel(false);
      scrollChatToBottom();
      if (activeChat.isTemp) setActiveChat(updatedChat);
      setSidebarKey((k) => k + 1);
      connectWs(returnedChatId, token!);
    } catch (error) {
      setUploadPhase("error");
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setUploadError(null);
    if (files.length === 0) { setSelectedFiles([]); return; }
    const validFiles: File[] = [];
    for (const file of files) {
      if (!isAllowedDocument(file)) {
        setUploadError(`"${file.name}" is not allowed. ${getDocumentRejectionMessage()}`);
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      validFiles.push(file);
    }
    // Auto-upload valid files directly
    uploadFilesDirectly(validFiles);
  }

  async function handleUpload() {
    await uploadFilesDirectly(selectedFiles);
  }

  function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || isSending || uploadPhase !== "ready" || !wsRef.current || !wsConnected) return;
    setMessages((prev) => [...prev, { id: createId(), role: "user", content: trimmed }]);
    setChatInput("");
    setChatError(null);
    setIsSending(true);
    scrollChatToBottom();
    wsRef.current.send(JSON.stringify({ message: trimmed }));
  }

  async function handleDeleteChat(chat: ChatSession) {
    if (chat.isTemp) { setActiveChat(null); return; }
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/chats/${chat.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to delete chat.");
    if (activeChat?.id === chat.id) setActiveChat(null);
    setSidebarKey((k) => k + 1);
  }

  const showChat = uploadPhase === "ready";

  return (
    /* No pt-20 — navbar is gone for authenticated users */
    <div className="flex h-screen bg-white dark:bg-[#0b0d17] text-slate-800 dark:text-zinc-100 transition-colors duration-300">
      <ChatSidebar
        key={sidebarKey}
        activeChat={activeChat}
        onSelectChat={(chat) => {
          setActiveChat(chat);
          setIsSidebarOpen(false);
        }}
        onNewChat={(chat) => {
          setActiveChat(chat);
          setIsSidebarOpen(false);
        }}
        onDeleteChat={handleDeleteChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col min-w-0 bg-slate-50/60 dark:bg-[#0d0f1c] transition-colors duration-300">
        {/* Mobile Top Header */}
        <div className="flex md:hidden h-14 shrink-0 items-center justify-between px-4 border-b border-slate-200/80 dark:border-white/8 bg-white/80 dark:bg-[#0a0c18]/80 backdrop-blur-md z-30 transition-colors">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            title="Open sidebar"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span
            style={{ fontFamily: "var(--font-cal-sans), var(--font-geist-sans), sans-serif" }}
            className="font-semibold text-sm truncate max-w-[180px] text-slate-800 dark:text-zinc-100"
          >
            {activeChat ? (activeChat.title || "Untitled Chat") : "AskDocs"}
          </span>
          <button
            type="button"
            onClick={() => {
              const tempChat: ChatSession = {
                id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                title: "New Chat",
                created_at: new Date().toISOString(),
                isTemp: true,
              };
              setActiveChat(tempChat);
              setIsSidebarOpen(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer"
            title="New chat"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {/* No chat selected */}
        {!activeChat ? (
          <div className="flex flex-1 items-center justify-center flex-col gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <div className="text-center">
              <p style={{ fontFamily: "var(--font-cal-sans), var(--font-geist-sans), sans-serif" }} className="text-base font-semibold text-slate-700 dark:text-zinc-300 tracking-tight">
                No conversation selected
              </p>
              <p className="mt-1 text-sm text-slate-400 dark:text-zinc-500">Select a chat or start a new one</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col min-h-0">

            {/* ── Upload panel ── */}
            {(!showChat || showUploadPanel) && (
              <div className="mx-auto w-full max-w-xl px-6 py-10">
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141626] p-6 shadow-sm dark:shadow-none transition-colors duration-300">
                  <h3 style={{ fontFamily: "var(--font-cal-sans), var(--font-geist-sans), sans-serif" }} className="mb-5 text-base font-semibold text-slate-800 dark:text-zinc-100 tracking-tight">
                    Upload a document
                  </h3>
                  <label
                    htmlFor="document-upload"
                    className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/3 px-6 py-10 transition hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/8"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/25">
                      <svg className="h-5 w-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <span className="text-center text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                      {selectedFiles.length > 0
                        ? <span className="font-medium text-indigo-700 dark:text-indigo-300">{selectedFiles.map((f) => f.name).join(", ")}</span>
                        : "Choose PDFs, DOCXs, XLSXs or similar files"}
                    </span>
                    <span className="rounded-full border border-slate-200 dark:border-white/12 bg-white dark:bg-white/8 px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 shadow-sm hover:bg-slate-50 dark:hover:bg-white/12 transition">
                      Browse files
                    </span>
                  </label>
                  <input ref={fileInputRef} id="document-upload" type="file" accept={getDocumentAcceptAttribute()} className="sr-only" disabled={uploadPhase === "uploading"} onChange={handleFileChange} multiple />
                  {uploadError && <p className="mt-3 text-sm text-red-500 dark:text-red-400" role="alert">{uploadError}</p>}
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={selectedFiles.length === 0 || uploadPhase === "uploading"}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-slate-900 dark:bg-white px-6 text-sm font-medium text-white dark:text-slate-900 transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      {uploadPhase === "uploading" ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 animate-spin rounded-full border border-white dark:border-slate-900 border-t-transparent" />
                          Uploading…
                        </span>
                      ) : "Upload"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Messages + Question Navigator ── */}
            {showChat && (
              <div className="flex flex-1 min-h-0 relative">
                {/* Messages column */}
                <div className="flex flex-1 flex-col min-h-0 min-w-0 relative">

                  {/* Scrollable messages container */}
                  <div className="flex-1 overflow-y-auto pt-8 pb-32">
                    {/* Narrow centered message area */}
                    <div className="mx-auto w-full max-w-3xl px-8 space-y-6">

                      {messages.length === 0 && (
                        <p className="text-center text-base text-slate-400 dark:text-zinc-500 mt-12">
                          Ask a question about{" "}
                          <span className="font-medium text-slate-600 dark:text-zinc-300">{uploadedFileName}</span>
                        </p>
                      )}

                      {messages.map((entry) => (
                        <div
                          key={entry.id}
                          id={`msg-${entry.id}`}
                          className={`flex ${entry.role === "assistant" ? "justify-start" : "justify-end"}`}
                        >
                          {/* Document badge */}
                          {entry.role === "document" ? (
                            <div className="flex items-center gap-2.5 rounded-xl border border-indigo-100 dark:border-indigo-500/25 bg-indigo-50 dark:bg-indigo-500/10 px-3.5 py-2.5 text-sm text-indigo-700 dark:text-indigo-300 max-w-[80%] transition-colors">
                              <svg className="h-4 w-4 shrink-0 text-indigo-400 dark:text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                              </svg>
                              <span className="truncate font-medium text-xs">{entry.content}</span>
                              <span className="shrink-0 text-xs text-indigo-500 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded-full">indexed</span>
                            </div>

                            /* User bubble */
                          ) : entry.role === "user" ? (
                            <div className="max-w-[85%] md:max-w-[72%] rounded-2xl rounded-br-sm bg-slate-900 dark:bg-indigo-600 px-4 py-3 md:px-5 md:py-4 text-sm md:text-base leading-relaxed text-white shadow-sm">
                              {entry.content}
                            </div>

                            /* Assistant bubble */
                          ) : (
                            <div className="max-w-[85%] md:max-w-[72%] rounded-2xl rounded-bl-sm border border-slate-200/80 dark:border-white/8 bg-white dark:bg-[#161828] px-4 py-3 md:px-5 md:py-4 text-sm md:text-base leading-relaxed shadow-sm transition-colors">
                              <AssistantMessage content={entry.content} />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Typing indicator */}
                      {isSending && (
                        <div className="flex justify-start">
                          <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200/80 dark:border-white/8 bg-white dark:bg-[#161828] px-5 py-4 shadow-sm transition-colors">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-zinc-500 [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-zinc-500 [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-zinc-500" />
                          </div>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>
                  </div>

                  {chatError && <p className="px-6 pb-2 text-sm text-red-500 dark:text-red-400 text-center" role="alert">{chatError}</p>}

                  {/* ── Floating Input Bar ── */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-50 dark:from-[#0d0f1c] via-slate-50/80 dark:via-[#0d0f1c]/80 to-transparent px-4 pb-4 pt-8 md:px-8 md:pb-8 md:pt-12 pointer-events-none z-10">
                    <div className="mx-auto w-full max-w-3xl relative pointer-events-auto">

                      {/* Plus Button Menu Popover */}
                      {showMenu && (
                        <div
                          ref={menuRef}
                          className="absolute bottom-16 left-0 z-30 w-64 bg-slate-900 text-slate-100 dark:bg-[#1e2030] dark:text-zinc-100 border border-slate-800 dark:border-white/8 rounded-2xl p-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 text-left"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setShowMenu(false);
                              fileInputRef.current?.click();
                            }}
                            className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm font-medium rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <svg className="h-4.5 w-4.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                              </svg>
                              <span>Add photos & files</span>
                            </div>
                            <span className="text-[10px] opacity-50 font-normal">Ctrl + U</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowMenu(false)}
                            className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm font-medium rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <svg className="h-4.5 w-4.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                              <span>Recent files</span>
                            </div>
                            <span className="text-xs opacity-50 font-normal">&gt;</span>
                          </button>

                          <div className="h-px bg-white/10 dark:bg-white/5 my-1" />

                          <button
                            type="button"
                            onClick={() => setShowMenu(false)}
                            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-sm font-medium rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition text-left cursor-pointer group"
                          >
                            <svg className="h-4.5 w-4.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                            <span>Create image</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowMenu(false)}
                            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-sm font-medium rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition text-left cursor-pointer group"
                          >
                            <svg className="h-4.5 w-4.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25V4.5m0 15v2.25M4.22 4.22l1.59 1.59m12.38 12.38 1.59 1.59M2.25 12h2.25m15 0h2.25m-18.38 6.19 1.59-1.59M18.19 5.81l1.59-1.59" />
                            </svg>
                            <span>Thinking</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowMenu(false)}
                            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-sm font-medium rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition text-left cursor-pointer group"
                          >
                            <svg className="h-4.5 w-4.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75 20.25 20.25M17.25 10.75a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
                            </svg>
                            <span>Deep research</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowMenu(false)}
                            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-sm font-medium rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition text-left cursor-pointer group"
                          >
                            <svg className="h-4.5 w-4.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A11.952 11.952 0 0 1 12 16.5c-2.998 0-5.74-1.1-7.843-2.918m0 0A8.959 8.959 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
                            </svg>
                            <span>Web search</span>
                          </button>

                          <div className="h-px bg-white/10 dark:bg-white/5 my-1" />

                          <button
                            type="button"
                            onClick={() => setShowMenu(false)}
                            className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm font-medium rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <svg className="h-4.5 w-4.5 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                              </svg>
                              <span>More</span>
                            </div>
                            <span className="text-xs opacity-50 font-normal">&gt;</span>
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-white dark:bg-[#161828] border border-slate-200 dark:border-white/10 rounded-full px-4 py-2.5 shadow-lg hover:shadow-xl dark:shadow-black/40 dark:hover:shadow-black/50 transition-all duration-300 w-full">

                        {/* Plus Add Button */}
                        <button
                          type="button"
                          onClick={() => setShowMenu((prev) => !prev)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/15 transition cursor-pointer"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>

                        <input
                          id="chat-input"
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask anything…"
                          disabled={isSending || !wsConnected}
                          className="flex-1 bg-transparent border-0 outline-none text-base px-2 py-1 placeholder-slate-400 dark:placeholder-zinc-500 text-slate-800 dark:text-zinc-100 focus:ring-0 focus:outline-none"
                        />

                        {/* Connection status indicator */}
                        <span
                          title={wsConnected ? "Connected" : "Reconnecting..."}
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"
                            }`}
                        />

                        {/* Sparkle Button */}
                        <button type="button" title="Create" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l5.096-.813a2 2 0 001.077-.543l5.824-5.824a2.002 2.002 0 00-2.83-2.83l-5.824 5.824a2 2 0 00-.543 1.077L9.813 15.904z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11.5l2-2m-10.5 8L12 16" />
                          </svg>
                        </button>

                        {/* Mic Button */}
                        <button type="button" title="Voice input" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3z" />
                          </svg>
                        </button>

                        {/* Direct File Attachment button */}
                        <button
                          type="button"
                          title="Attach file"
                          onClick={() => fileInputRef.current?.click()}
                          className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition cursor-pointer"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                          </svg>
                        </button>

                        {/* Send Button */}
                        <button
                          id="send-btn"
                          type="submit"
                          disabled={!chatInput.trim() || isSending || !wsConnected}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-indigo-600 text-white hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 transition cursor-pointer"
                        >
                          <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                {/* ── Question Navigator (right panel, hover to expand) ── */}
                <QuestionNavigator messages={messages} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
