import { Outlet } from "react-router-dom";

import Footer from "./Footer";
import Navbar from "./Navbar";

/**
 * The frame every page sits in. Routes render into the Outlet.
 */
export default function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
