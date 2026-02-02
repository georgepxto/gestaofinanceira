import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

export const Layout: React.FC<LayoutProps> = ({ onLogout, userName, userEmail }) => {
  return (
    <div className="min-h-screen bg-gray-900">
      <Sidebar onLogout={onLogout} userName={userName} userEmail={userEmail} />
      
      {/* Main Content */}
      <main className="
        md:ml-64 /* Desktop: offset for sidebar */
        pt-16 md:pt-0 /* Mobile: offset for header */
        min-h-screen
        transition-all duration-300
      ">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
