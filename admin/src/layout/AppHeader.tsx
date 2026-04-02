import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import UserDropdown from "../components/header/UserDropdown";

const AppHeader = () => {
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleAppMenu = () => setIsAppMenuOpen((prev) => !prev);

  useEffect(() => {
    const handleCmdK = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleCmdK);
    return () => document.removeEventListener("keydown", handleCmdK);
  }, []);

  return (
    <header className="sticky top-0 z-[999] w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:px-6">
        {/* Left section - Logo + Toggle + Search (mobile) */}
        <div className="flex w-full items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800 lg:border-b-0 lg:px-0 lg:py-4">
          <button
            onClick={handleToggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 lg:h-11 lg:w-11"
            aria-label="Toggle sidebar"
          >
            {isMobileOpen ? (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.22 7.28a.75.75 0 0 1 0-1.06l4.72 4.72 4.72-4.72a.75.75 0 1 1 1.06 1.06l-5 5a.75.75 0 0 1-1.06 0l-5-5Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M.58 1A.75.75 0 0 1 1.33.25h13.33a.75.75 0 0 1 0 1.5H1.33a.75.75 0 0 1-.75-.75Zm0 10a.75.75 0 0 1 .75-.75h13.33a.75.75 0 0 1 0 1.5H1.33a.75.75 0 0 1-.75-.75ZM1.33 5.25a.75.75 0 0 0 0 1.5h6.67a.75.75 0 0 0 0-1.5H1.33Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          <Link to="/" className="lg:hidden">
            <img
              src="/images/logo/logo.png"
              alt="Logo"
              className="h-10 w-auto dark:hidden"
            />
            <img
              src="/images/logo/logo.png"
              alt="Logo"
              className="hidden h-10 w-auto dark:block"
            />
          </Link>

          <button
            onClick={toggleAppMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm12 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
                fill="currentColor"
              />
            </svg>
          </button>

          {/* Desktop Search */}
          <div className="hidden lg:block lg:flex-1">
            <div className="relative max-w-xl">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                <svg
                  className="h-5 w-5 fill-gray-500 dark:fill-gray-400"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.04 9.37a6.33 6.33 0 1 1 12.67 0 6.33 6.33 0 0 1-12.67 0Zm6.33-7.83a7.83 7.83 0 1 0 5.1 13.9l2.82 2.82a.75.75 0 1 0 1.06-1.06l-2.82-2.82a7.83 7.83 0 0 0-6.16-13.84Z"
                    fill="currentColor"
                  />
                </svg>
              </span>

              <input
                ref={inputRef}
                type="text"
                placeholder="Search or type command..."
                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-16 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 xl:max-w-md"
              />

              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right section - Actions + User */}
        <div
          className={`${
            isAppMenuOpen ? "flex" : "hidden"
          } w-full items-center justify-end gap-4 px-5 py-4 lg:flex lg:px-0 lg:py-0`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggleButton />
            {/* Add NotificationDropdown here later if needed */}
          </div>

          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;