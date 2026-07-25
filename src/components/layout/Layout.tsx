import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";
import {
  TutorialHelpContext,
  type TutorialHelpButtonConfig,
} from "./TutorialHelpContext";

interface LayoutProps {
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

export const Layout: React.FC<LayoutProps> = ({ onLogout, userName, userEmail }) => {
  const [helpButton, setHelpButton] = useState<TutorialHelpButtonConfig | null>(null);

  return (
    <TutorialHelpContext.Provider value={{ helpButton, setHelpButton }}>
      <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0B]">
        <Sidebar onLogout={onLogout} userName={userName} userEmail={userEmail} />

        {/* Main Content */}
        <main className="
          md:ml-64 /* Desktop: offset for sidebar */
          pt-16 md:pt-0 /* Mobile: offset for header */
          min-h-screen
          transition-all duration-300
        ">
          {/* Desktop Header for Notifications */}
          <header className="hidden md:flex justify-end items-center p-4 pb-0 bg-zinc-50 dark:bg-[#0A0A0B] z-30 relative">
            <div className="flex items-center gap-2">
              {helpButton && (
                <button
                  onClick={helpButton.onClick}
                  data-tour={helpButton.dataTour}
                  title={helpButton.title}
                  aria-label={helpButton.ariaLabel}
                  className="flex w-8 h-8 rounded-full border border-zinc-300 dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 dark:hover:border-emerald-500 items-center justify-center shadow-sm transition-colors"
                >
                  ?
                </button>
              )}
              <NotificationBell />
            </div>
          </header>

          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </TutorialHelpContext.Provider>
  );
};
