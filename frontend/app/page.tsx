"use client";

import { useEffect, useState } from "react";
import ChatComponent from "./components/ChatComponent";
import GoogleSignupButton from "./components/LoginButton";
import ChatMockup from "./components/ChatMockup";
import Navbar from "./components/Navbar";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        setIsAuthenticated(!!(token && user));
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
    window.addEventListener("auth-changed", checkAuth);
    return () => {
      window.removeEventListener("auth-changed", checkAuth);
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0b0d17] transition-colors">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 dark:border-white/10 border-t-slate-800 dark:border-t-indigo-500" />
      </div>
    );

  }

  if (isAuthenticated) {
    return <ChatComponent />;
  }

  return (
    <div className="hero-root">
      <Navbar />
      <div className="hero-bg" />

      <main className="relative z-10 flex flex-col items-center px-6 pt-32 pb-0">

        {/* ── Hero text block ── */}
        <div className="w-full max-w-3xl text-center space-y-7">

          <h1 className="hero-heading">
            Chat with your documents
          </h1>

          <p className="hero-description">
            Extract insights, summarize complex papers, and find answers in seconds with
            our advanced RAG engine. Designed for sophisticated intelligence and{" "}
            <span className="hero-description-accent">professional clarity.</span>
          </p>

          {/* CTA */}
          <div className="hero-cta-wrapper">
            <GoogleSignupButton onLoginSuccess={() => {
              const token = localStorage.getItem("token");
              const user = localStorage.getItem("user");
              setIsAuthenticated(!!(token && user));
            }} />
          </div>

          {/* Supported formats badge */}
          <div className="hero-formats">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="hero-format-icon">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="hero-format-icon">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 8h10M7 12h10M7 16h6" />
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="hero-format-icon">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className="hero-formats-text">Supports PDF, DOCX etc.</span>
          </div>
        </div>

        {/* ── RAG Chat Mockup ── */}
        <ChatMockup />
      </main>
    </div>
  );
}
