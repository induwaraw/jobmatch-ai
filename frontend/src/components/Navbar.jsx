import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  FileText,
  Home,
  Info,
  LogOut,
  Mail,
  Menu,
  Search,
  Shield,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import Button from "./ui/Button";
import Container from "./ui/Container";
import Wordmark from "./Wordmark";

const PUBLIC_LINKS = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/about", label: "About", icon: Info },
  { to: "/contact", label: "Contact", icon: Mail },
];

const SIGNED_IN_LINKS = [
  { to: "/upload", label: "Your CVs", icon: FileText },
  { to: "/forecast", label: "Forecast", icon: TrendingUp },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/about", label: "About", icon: Info },
];

const ADMIN_LINK = { to: "/admin", label: "Admin", icon: Shield };

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  const links = isAuthenticated
    ? [...SIGNED_IN_LINKS, ...(user?.role === "admin" ? [ADMIN_LINK] : [])]
    : PUBLIC_LINKS;

  function handleLogout() {
    logout();
    setOpen(false);
    navigate("/");
  }

  /** Universal search: jumps to the homepage vacancy search with the query. */
  function handleSearch(event) {
    event.preventDefault();
    const value = term.trim();
    navigate(value ? `/?q=${encodeURIComponent(value)}` : "/");
    setTerm("");
    setOpen(false);
  }

  const linkClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 text-[0.95rem] transition-colors ${
      isActive ? "text-ink font-medium" : "text-muted hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-7">
            <Wordmark />
            <nav className="hidden items-center gap-5 lg:flex">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                  <link.icon size={16} strokeWidth={2} aria-hidden="true" />
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <form onSubmit={handleSearch} className="relative">
              <label htmlFor="nav-search" className="sr-only">
                Search vacancies
              </label>
              <Search
                size={15}
                strokeWidth={2}
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="nav-search"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search vacancies"
                className="h-9 w-44 rounded-[8px] border border-line bg-panel pl-8 pr-2.5 text-sm
                           text-ink placeholder:text-muted/60 transition-[width,border-color] duration-200
                           focus:w-56 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </form>

            {isAuthenticated ? (
              <>
                <span className="hidden text-sm text-muted xl:inline">
                  {user?.full_name || user?.email}
                </span>
                <Button variant="secondary" size="sm" onClick={handleLogout}>
                  <LogOut size={15} strokeWidth={2} aria-hidden="true" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-[0.95rem] text-muted transition-colors hover:text-ink"
                >
                  Sign in
                </Link>
                <Button to="/register" size="sm">
                  Create account
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="-mr-2 grid h-10 w-10 place-items-center rounded-[8px] text-ink lg:hidden"
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
          </button>
        </div>
      </Container>

      {open && (
        <div className="border-t border-line bg-surface lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            <form onSubmit={handleSearch} className="relative mb-3">
              <Search
                size={15}
                strokeWidth={2}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search vacancies"
                aria-label="Search vacancies"
                className="h-11 w-full rounded-[8px] border border-line bg-panel pl-9 pr-3 text-[0.95rem]
                           text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none"
              />
            </form>

            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-[8px] px-2 py-2.5 text-ink hover:bg-brand-soft/60"
              >
                <link.icon size={16} strokeWidth={2} aria-hidden="true" />
                {link.label}
              </NavLink>
            ))}

            {!isAuthenticated && (
              <NavLink
                to="/contact"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-[8px] px-2 py-2.5 text-ink hover:bg-brand-soft/60"
              >
                <Mail size={16} strokeWidth={2} aria-hidden="true" />
                Contact
              </NavLink>
            )}

            <div className="mt-3 border-t border-line pt-4">
              {isAuthenticated ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted">
                    {user?.full_name || user?.email}
                  </span>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    <LogOut size={15} strokeWidth={2} aria-hidden="true" />
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    to="/login"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Button>
                  <Button size="sm" to="/register" onClick={() => setOpen(false)}>
                    Create account
                  </Button>
                </div>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
