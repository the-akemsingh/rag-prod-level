"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/* ── Theme-aware palette ── */
type Palette = {
  shell: string;
  titleBar: string;
  titleBorder: string;
  titleText: string;
  sidebar: string;
  sidebarBorder: string;
  chat: string;
  chatBorder: string;
  text: string;
  textMuted: string;
  textFaint: string;
  inputBg: string;
  inputBorder: string;
  itemActive: string;
  divider: string;
  docBadgeBg: string;
  docBadgeBorder: string;
};

const DARK: Palette = {
  shell: "#0d0f1a",
  titleBar: "#0a0c16",
  titleBorder: "rgba(255,255,255,0.06)",
  titleText: "rgba(255,255,255,0.28)",
  sidebar: "#080a14",
  sidebarBorder: "rgba(255,255,255,0.06)",
  chat: "#0d0f1a",
  chatBorder: "rgba(255,255,255,0.06)",
  text: "rgba(255,255,255,0.85)",
  textMuted: "rgba(255,255,255,0.38)",
  textFaint: "rgba(255,255,255,0.22)",
  inputBg: "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.09)",
  itemActive: "rgba(255,255,255,0.07)",
  divider: "rgba(255,255,255,0.05)",
  docBadgeBg: "rgba(255,255,255,0.04)",
  docBadgeBorder: "rgba(255,255,255,0.07)",
};

const LIGHT: Palette = {
  shell: "#ffffff",
  titleBar: "#f8fafc",
  titleBorder: "rgba(0,0,0,0.06)",
  titleText: "#94a3b8",
  sidebar: "#f1f5f9",
  sidebarBorder: "rgba(0,0,0,0.07)",
  chat: "#fafafa",
  chatBorder: "rgba(0,0,0,0.06)",
  text: "#0f172a",
  textMuted: "#64748b",
  textFaint: "#94a3b8",
  inputBg: "rgba(0,0,0,0.03)",
  inputBorder: "rgba(0,0,0,0.08)",
  itemActive: "rgba(99,102,241,0.08)",
  divider: "rgba(0,0,0,0.07)",
  docBadgeBg: "rgba(99,102,241,0.06)",
  docBadgeBorder: "rgba(99,102,241,0.18)",
};

export default function ChatMockup() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Use dark colors until mounted (SSR), then switch based on theme
  const p: Palette = mounted && resolvedTheme === "light" ? LIGHT : DARK;
  const isDark = !mounted || resolvedTheme === "dark";

  const aiBubbleBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(99,102,241,0.05)";
  const aiBubbleBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.15)";
  const aiBubbleText = isDark ? "rgba(255,255,255,0.73)" : "#334155";
  const strongColor = isDark ? "rgba(255,255,255,0.9)" : "#0f172a";
  const sourceBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const sourceColor = isDark ? "rgba(255,255,255,0.26)" : "#94a3b8";
  const userBg = "#4f46e5";
  const hlColor = isDark ? "#a5b4fc" : "#6366f1";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "960px",
        marginTop: "3.5rem",
        padding: "0 0.5rem",
        WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
        transition: "all 0.3s ease",
      }}
    >
      {/* ── App Shell ── */}
      <div
        style={{
          background: p.shell,
          // borderRadius: "12px 12px 0 0",
          // border: `1px solid ${p.titleBorder}`,
          // borderBottom: "none",
          boxShadow: isDark
            ? "0 -8px 60px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 -8px 40px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.02)",
          overflow: "hidden",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          transition: "background 0.3s ease, box-shadow 0.3s ease",
        }}
        className="border-t-4 border-x-4 border-b-0 border-gray-700 rounded-t-3xl dark:border-white"
      >
        {/* Title bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.55rem 1rem",
            background: p.titleBar,
            borderBottom: `1px solid ${p.titleBorder}`,
            transition: "background 0.3s ease",
          }}
        >
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <span style={{ display: "block", width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", opacity: 0.85 }} />
            <span style={{ display: "block", width: 10, height: 10, borderRadius: "50%", background: "#febc2e", opacity: 0.85 }} />
            <span style={{ display: "block", width: 10, height: 10, borderRadius: "50%", background: "#28c840", opacity: 0.85 }} />
          </div>
          <span style={{ fontSize: "0.68rem", color: p.titleText, letterSpacing: "0.03em", transition: "color 0.3s ease" }}>
            AskDocs — workspace
          </span>
          <div style={{ width: 64 }} />
        </div>

        {/* Body: Sidebar + Chat */}
        <div style={{ display: "flex", height: 370 }}>

          {/* ── Sidebar ── */}
          <aside
            style={{
              width: 186,
              flexShrink: 0,
              background: p.sidebar,
              borderRight: `1px solid ${p.sidebarBorder}`,
              flexDirection: "column",
              padding: "0.75rem 0.6rem",
              gap: "0.45rem",
              transition: "background 0.3s ease",
            }}
            className="hidden md:flex"
          >
            {/* Logo + new chat */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0.2rem 0.35rem" }}>
              <span style={{ fontFamily: "var(--font-cal-sans), var(--font-geist-sans), sans-serif", fontSize: "0.78rem", fontWeight: 600, color: p.text, letterSpacing: "-0.01em", transition: "color 0.3s ease" }}>
                AskDocs
              </span>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: p.inputBg, border: `1px solid ${p.inputBorder}`, color: p.textMuted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </div>
            </div>

            {/* Upload pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.32rem 0.55rem", borderRadius: 6, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", fontSize: "0.67rem", fontWeight: 500 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Upload document
            </div>

            {/* Recent label */}
            <span style={{ fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: p.textFaint, padding: "0.25rem 0.2rem 0.05rem", transition: "color 0.3s ease" }}>Recent</span>

            {/* Chat list */}
            {[
              { label: "Q2 Financial Report", active: true },
              { label: "Research Paper: LLMs", active: false },
              { label: "Legal Contract v3", active: false },
            ].map(({ label, active }, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "0.35rem 0.5rem", borderRadius: 6,
                  fontSize: "0.68rem",
                  background: active ? p.itemActive : "transparent",
                  color: active ? (isDark ? "rgba(255,255,255,0.8)" : "#4f46e5") : p.textMuted,
                  transition: "background 0.3s ease, color 0.3s ease",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                {label}
              </div>
            ))}

            {/* Footer doc badge */}
            <div style={{ marginTop: "auto", paddingTop: "0.5rem", borderTop: `1px solid ${p.divider}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.32rem 0.5rem", borderRadius: 6, background: p.docBadgeBg, border: `1px solid ${p.docBadgeBorder}`, fontSize: "0.63rem", color: p.textMuted, transition: "background 0.3s ease" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                q2_report.pdf
                <span style={{ marginLeft: "auto", fontSize: "0.54rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#34d399", background: "rgba(52,211,153,0.12)", padding: "0.1rem 0.3rem", borderRadius: 4 }}>indexed</span>
              </div>
            </div>
          </aside>

          {/* ── Chat Panel ── */}
          <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: p.chat, transition: "background 0.3s ease" }}>

            {/* Chat header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 1rem", borderBottom: `1px solid ${p.chatBorder}`, flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--font-cal-sans), var(--font-geist-sans), sans-serif", fontSize: "0.76rem", fontWeight: 600, color: p.text, letterSpacing: "-0.01em", transition: "color 0.3s ease" }}>
                Q2 Financial Report
              </span>
              <div style={{ display: "flex", gap: 5 }}>
                {["PDF", "● Indexed"].map((t, i) => (
                  <span key={i} style={{ fontSize: "0.58rem", fontWeight: 500, padding: "0.12rem 0.42rem", borderRadius: 4, background: i === 1 ? "rgba(52,211,153,0.1)" : p.inputBg, border: `1px solid ${i === 1 ? "rgba(52,211,153,0.2)" : p.inputBorder}`, color: i === 1 ? "#34d399" : p.textMuted }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: "hidden", padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>

              {/* AI greeting */}
              <MsgRow role="ai" aiBubbleBg={aiBubbleBg} aiBubbleBorder={aiBubbleBorder} aiBubbleText={aiBubbleText} userBg={userBg} hlColor={hlColor}>
                Hello! I&apos;ve indexed your <Hl color={hlColor}>Q2 Financial Report</Hl>. Ask me anything — revenue, growth, or comparisons.
              </MsgRow>

              {/* User */}
              <MsgRow role="user" aiBubbleBg={aiBubbleBg} aiBubbleBorder={aiBubbleBorder} aiBubbleText={aiBubbleText} userBg={userBg} hlColor={hlColor}>
                What was the net revenue growth from Q1 to Q2?
              </MsgRow>

              {/* AI answer */}
              <MsgRow role="ai" aiBubbleBg={aiBubbleBg} aiBubbleBorder={aiBubbleBorder} aiBubbleText={aiBubbleText} userBg={userBg} hlColor={hlColor}>
                <>
                  <span>Net revenue grew by <Hl color={hlColor}>18.4%</Hl> — from <strong style={{ color: strongColor }}>$4.2M</strong> to <strong style={{ color: strongColor }}>$4.97M</strong>. Enterprise led at +31%.</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "0.32rem", paddingTop: "0.32rem", borderTop: `1px solid ${sourceBorder}`, color: sourceColor, fontSize: "0.58rem" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    q2_report.pdf · page 7
                  </div>
                </>
              </MsgRow>

              {/* User follow-up */}
              <MsgRow role="user" aiBubbleBg={aiBubbleBg} aiBubbleBorder={aiBubbleBorder} aiBubbleText={aiBubbleText} userBg={userBg} hlColor={hlColor}>
                Summarize the key risks mentioned.
              </MsgRow>

              {/* Typing */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <AiAvatar />
                <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "0.5rem 0.65rem", background: aiBubbleBg, border: `1px solid ${aiBubbleBorder}`, borderRadius: 10, minWidth: 48 }}>
                  <TypingDots />
                </div>
              </div>
            </div>

            {/* Input bar */}
            <div style={{ padding: "0.55rem 0.9rem 0.75rem", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: p.inputBg, border: `1px solid ${p.inputBorder}`, borderRadius: 8, padding: "0.42rem 0.6rem", transition: "background 0.3s ease" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={p.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                <span style={{ flex: 1, fontSize: "0.67rem", color: p.textFaint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "color 0.3s ease" }}>
                  Ask something about your document…
                </span>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(79,70,229,0.4)" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Typing animation */}
      <style>{`
        @keyframes _typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30%            { transform: translateY(-4px); opacity: 1; }
        }
        ._td { display:block; width:5px; height:5px; border-radius:50%; background:rgba(99,102,241,0.6); animation: _typing 1.2s infinite ease-in-out; }
        ._td:nth-child(2){ animation-delay:0.18s; }
        ._td:nth-child(3){ animation-delay:0.36s; }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */

function AiAvatar() {
  return (
    <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
    </div>
  );
}

function TypingDots() {
  return (
    <>
      <span className="_td" />
      <span className="_td" />
      <span className="_td" />
    </>
  );
}

function Hl({ children, color }: { children: React.ReactNode; color: string }) {
  return <span style={{ color, fontWeight: 600 }}>{children}</span>;
}

type MsgRowProps = {
  role: "ai" | "user";
  children: React.ReactNode;
  aiBubbleBg: string;
  aiBubbleBorder: string;
  aiBubbleText: string;
  userBg: string;
  hlColor: string;
};

function MsgRow({ role, children, aiBubbleBg, aiBubbleBorder, aiBubbleText, userBg }: MsgRowProps) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: isUser ? "row-reverse" : "row" }}>
      {isUser ? (
        <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.58rem", fontWeight: 700, color: "white", marginBottom: 2 }}>A</div>
      ) : (
        <AiAvatar />
      )}
      <div
        style={{
          maxWidth: "72%",
          borderRadius: 10,
          padding: "0.45rem 0.65rem",
          fontSize: "0.68rem",
          lineHeight: 1.55,
          transition: "background 0.3s ease, border-color 0.3s ease, color 0.3s ease",
          ...(isUser
            ? { background: userBg, color: "rgba(255,255,255,0.92)", border: "1px solid rgba(255,255,255,0.1)" }
            : { background: aiBubbleBg, border: `1px solid ${aiBubbleBorder}`, color: aiBubbleText }
          ),
        }}
      >
        {children}
      </div>
    </div>
  );
}
