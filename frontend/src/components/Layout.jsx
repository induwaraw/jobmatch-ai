import { Outlet } from "react-router-dom";

import Footer from "./Footer";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
