import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";

interface LayoutProps {
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

export const Layout: React.FC<LayoutProps> = ({ onLogout, userName, userEmail }) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0B0F19]">
      <Sidebar onLogout={onLogout} userName={userName} userEmail={userEmail} />
      
      {/* Main Content */}
      <main className="
        md:ml-64 /* Desktop: offset for sidebar */
        pt-16 md:pt-0 /* Mobile: offset for header */
        min-h-screen
        transition-all duration-300
      ">
        {/* Desktop Header for Notifications */}
        <header className="hidden md:flex justify-end items-center p-4 pb-0 bg-gray-100 dark:bg-[#0B0F19] z-30 relative">
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
