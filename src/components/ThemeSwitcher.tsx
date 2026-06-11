import React, { useState, useEffect, useRef } from "react";
import { Sun, Moon, Sunset } from "lucide-react";

interface ThemeSwitcherProps {
  theme: "day" | "sunset" | "night";
  setTheme: (theme: "day" | "sunset" | "night") => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, setTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-close menu after 4 seconds of inactivity
  useEffect(() => {
    if (isOpen) {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 4000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen]);

  const handleSelect = (newTheme: "day" | "sunset" | "night") => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  // Reset auto-close timer on hover interaction
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (isOpen) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 4000);
    }
  };

  const getThemeButton = (t: "day" | "sunset" | "night") => {
    switch (t) {
      case "day":
        return (
          <button
            key="day"
            onClick={() => handleSelect("day")}
            className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 ${
              theme === "day"
                ? "bg-sky-500 text-white shadow-md shadow-sky-200"
                : "theme-text-muted hover:bg-white/40 hover:theme-text-primary"
            }`}
            title="Day Mode"
          >
            <Sun className="w-5 h-5" />
          </button>
        );
      case "sunset":
        return (
          <button
            key="sunset"
            onClick={() => handleSelect("sunset")}
            className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 ${
              theme === "sunset"
                ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                : "theme-text-muted hover:bg-white/40 hover:theme-text-primary"
            }`}
            title="Sunset Mode"
          >
            <Sunset className="w-5 h-5" />
          </button>
        );
      case "night":
        return (
          <button
            key="night"
            onClick={() => handleSelect("night")}
            className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 ${
              theme === "night"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "theme-text-muted hover:bg-white/10 hover:theme-text-primary"
            }`}
            title="Cosmic Night Mode"
          >
            <Moon className="w-5 h-5" />
          </button>
        );
    }
  };

  const currentIcon = () => {
    switch (theme) {
      case "day":
        return <Sun className="w-5 h-5" />;
      case "sunset":
        return <Sunset className="w-5 h-5" />;
      case "night":
        return <Moon className="w-5 h-5" />;
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed bottom-6 right-6 z-50 flex items-center"
    >
      <div
        className={`flex items-center backdrop-blur-md rounded-full p-1.5 border theme-border shadow-2xl gap-1 transition-all duration-300 ease-out ${
          isOpen
            ? "bg-white/90 dark:bg-slate-900/90 scale-100 opacity-100 border-slate-200 dark:border-slate-800"
            : "bg-white/30 dark:bg-slate-900/30 hover:scale-105 active:scale-95"
        }`}
      >
        {isOpen ? (
          <>
            {getThemeButton("day")}
            {getThemeButton("sunset")}
            {getThemeButton("night")}
          </>
        ) : (
          <button
            onClick={toggleOpen}
            className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer hover:rotate-12 ${
              theme === "day"
                ? "bg-sky-500 text-white shadow-md shadow-sky-200"
                : theme === "sunset"
                ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                : "bg-indigo-600 text-white shadow-md shadow-indigo-200"
            }`}
            title="Change Theme"
          >
            {currentIcon()}
          </button>
        )}
      </div>
    </div>
  );
};
