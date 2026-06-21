"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import GoogleSignupButton from "./LoginButton";

type LoggedInUser = {
    id: string;
    email: string;
    name: string | null;
    image?: string | null;
};

export default function Navbar() {
    const [user, setUser] = useState<LoggedInUser | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [mounted, setMounted] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const { theme, setTheme } = useTheme();

    // Avoid hydration mismatch — only render theme-dependent UI after mount
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const updateAuth = () => {
            try {
                const storedUser = localStorage.getItem("user");
                setUser(storedUser ? JSON.parse(storedUser) : null);
            } catch {
                setUser(null);
            }
        };
        updateAuth();
        window.addEventListener("auth-changed", updateAuth);
        return () => window.removeEventListener("auth-changed", updateAuth);
    }, []);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!showMenu) return;
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [showMenu]);

    const handleLoginSuccess = (loggedInUser: LoggedInUser) => setUser(loggedInUser);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-changed"));
        setUser(null);
        setShowMenu(false);
    };

    const isDark = mounted && theme === "dark";

    return (
        <header className="fixed inset-x-0 top-5 z-50 flex justify-center px-4">
            <nav className="navbar-pill flex items-center gap-4 px-5 py-2.5">
                {/* Brand */}
                <span className="navbar-brand">AskDocs</span>

                {/* Divider */}
                <div className="h-5 w-px bg-slate-200 dark:bg-white/10" />

                {/* Theme toggle */}
                {mounted && (
                    <button
                        type="button"
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        aria-label="Toggle theme"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200 cursor-pointer"
                    >
                        {isDark ? (
                            /* Sun icon */
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            /* Moon icon */
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                )}

                {/* Divider */}
                <div className="h-5 w-px bg-slate-200 dark:bg-white/10" />

                {/* Auth */}
                {user ? (
                    <div ref={menuRef} className="relative flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowMenu((prev) => !prev)}
                            className="flex items-center gap-2 cursor-pointer"
                            aria-label="Open user menu"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-sm font-semibold text-white dark:text-slate-900 shadow-sm">
                                {(user.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 hidden sm:inline">
                                {user.name?.split(" ")[0]}
                            </span>
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-11 z-20 min-w-44 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#111]/95 backdrop-blur-xl p-1.5 shadow-xl shadow-slate-200/60 dark:shadow-black/40">
                                <div className="px-3 py-2 border-b border-slate-100 dark:border-white/8 mb-1">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{user.name}</p>
                                    <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">{user.email}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <GoogleSignupButton onLoginSuccess={handleLoginSuccess} />
                )}
            </nav>
        </header>
    );
}