"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Check initial stored theme or document root class
    const savedTheme = localStorage.getItem("callcraft-theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("light", savedTheme === "light");
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("callcraft-theme", nextTheme);

    if (nextTheme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${theme === "dark" ? "Light Parchment" : "Dark Darkwood"} Mode`}
      className="relative p-2 rounded-xl glass-panel hover:bg-[#e1b329]/15 border border-[#edd6bb]/20 hover:border-[#e1b329]/40 text-[#edd6bb] transition-all flex items-center justify-center gap-1.5 group"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-4 h-4 text-[#ffb443] group-hover:rotate-45 transition-transform" />
          <span className="text-[11px] font-semibold hidden sm:inline text-[#edd6bb]">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-[#e1b329] group-hover:-rotate-12 transition-transform" />
          <span className="text-[11px] font-semibold hidden sm:inline text-[#2c241d]">Dark</span>
        </>
      )}
    </button>
  );
}
