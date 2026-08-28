import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ChevronDown,
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
import Logo from "./Logo";

const PUBLIC_LINKS = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/about", label: "About", icon: Info },
  { to: "/contact", label: "Contact", icon: Mail },
];

const SIGNED_IN_LINKS = [
  { to: "/", label: "Vacancies", icon: Home, end: true },
  { to: "/upload", label: "Your CVs", icon: FileText },
  { to: "/forecast", label: "Forecast", icon: TrendingUp },
  { to: "/about", label: "About", icon: Info },
];

function initials(name, email) {
  const source = (name || email || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => {
    function onDocClick(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function openNow() {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-line bg-panel py-1 pl-1 pr-2.5 shadow-[0_1px_2px_rgba(18,33,31,0.04)] transition-colors hover:border-line-strong hover:bg-brand-tint"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-[0.72rem] font-semibold tracking-wide text-surface">
          {initials(user?.full_name, user?.email)}
        </span>
        <ChevronDown
          size={15}
          strokeWidth={2.25}
          aria-hidden="true"
          className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-draw-in absolute right-0 top-[calc(100%+10px)] w-60 overflow-hidden rounded-[14px] border border-line bg-panel shadow-[0_24px_56px_-24px_rgba(18,33,31,0.32)]"
        >
          <div className="border-b border-line px-4 py-3.5">
            <p className="truncate text-small font-semibold text-ink">
              {user?.full_name || "Your account"}
            </p>
            <p className="mt-0.5 truncate text-micro text-muted">{user?.email}</p>
            {user?.role === "admin" && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-[6px] bg-accent-soft px-2 py-0.5 text-micro font-medium text-accent">
                Administrator
              </span>
            )}
          </div>

          <div className="p-1.5">
            <Link
              to="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-small text-ink transition-colors hover:bg-brand-soft/70"
            >
              <UserRound size={16} strokeWidth={2} aria-hidden="true" className="text-muted" />
              Profile and CVs
            </Link>

            {user?.role === "admin" && (
              <Link
                to="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-small text-ink transition-colors hover:bg-brand-soft/70"
              >
                <Shield size={16} strokeWidth={2} aria-hidden="true" className="text-muted" />
                Admin panel
              </Link>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-small text-ink transition-colors hover:bg-accent-soft"
            >
              <LogOut size={16} strokeWidth={2} aria-hidden="true" className="text-accent" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  const links = isAuthenticated ? SIGNED_IN_LINKS : PUBLIC_LINKS;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleLogout() {
    logout();
    setOpen(false);
    navigate("/");
  }

  function handleSearch(event) {
    event.preventDefault();
    const value = term.trim();
    navigate(value ? `/?q=${encodeURIComponent(value)}` : "/");
    setTerm("");
    setOpen(false);
  }

  const linkClass = ({ isActive }) =>
    `relative inline-flex items-center gap-1.5 py-1 text-small transition-colors ${
      isActive
        ? "font-semibold text-ink after:absolute after:-bottom-0.5 after:left-0 after:h-[2px] after:w-full after:rounded-full after:bg-accent"
        : "text-muted hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
      <Container>
        <div className="flex h-[68px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-6 lg:flex">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                  <link.icon size={15} strokeWidth={2} aria-hidden="true" />
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
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                id="nav-search"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search roles"
                className="h-10 w-40 rounded-full border border-line bg-panel pl-8.5 pr-3 text-small text-ink placeholder:text-faint transition-[width,border-color,box-shadow] duration-250 focus:w-56 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 lg:w-44"
                style={{ paddingLeft: "2.1rem" }}
              />
            </form>

            {isAuthenticated ? (
              <ProfileMenu user={user} onLogout={handleLogout} />
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-small text-muted transition-colors hover:text-ink"
                >
                  Sign in
                </Link>
                <Button to="/register" size="sm">
                  Get started
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="-mr-1 grid h-10 w-10 place-items-center rounded-[10px] border border-line bg-panel text-ink transition-colors hover:bg-brand-tint md:hidden"
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            {open ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
          </button>
        </div>
      </Container>

      {open && (
        <div className="fixed inset-x-0 top-[68px] z-40 max-h-[calc(100dvh-68px)] overflow-y-auto border-t border-line bg-surface md:hidden">
          <Container className="py-5">
            <form onSubmit={handleSearch} className="relative">
              <Search
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search roles"
                aria-label="Search vacancies"
                className="h-12 w-full rounded-[10px] border border-line bg-panel pl-10 pr-3.5 text-body text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
              />
            </form>

            {isAuthenticated && (
              <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-line bg-panel p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-small font-semibold text-surface">
                  {initials(user?.full_name, user?.email)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-small font-semibold text-ink">
                    {user?.full_name}
                  </p>
                  <p className="truncate text-micro text-muted">{user?.email}</p>
                </div>
              </div>
            )}

            <nav className="mt-5 flex flex-col">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-body text-ink transition-colors hover:bg-brand-soft/70"
                >
                  <link.icon size={17} strokeWidth={2} aria-hidden="true" className="text-muted" />
                  {link.label}
                </NavLink>
              ))}

              {isAuthenticated && (
                <NavLink
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-body text-ink transition-colors hover:bg-brand-soft/70"
                >
                  <UserRound size={17} strokeWidth={2} aria-hidden="true" className="text-muted" />
                  Profile
                </NavLink>
              )}

              {isAuthenticated && user?.role === "admin" && (
                <NavLink
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-body text-ink transition-colors hover:bg-brand-soft/70"
                >
                  <Shield size={17} strokeWidth={2} aria-hidden="true" className="text-muted" />
                  Admin
                </NavLink>
              )}

              {!isAuthenticated && (
                <NavLink
                  to="/contact"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-body text-ink transition-colors hover:bg-brand-soft/70"
                >
                  <Mail size={17} strokeWidth={2} aria-hidden="true" className="text-muted" />
                  Contact
                </NavLink>
              )}
            </nav>

            <div className="mt-5 border-t border-line pt-5">
              {isAuthenticated ? (
                <Button variant="secondary" className="w-full" onClick={handleLogout}>
                  <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                  Sign out
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button to="/register" onClick={() => setOpen(false)}>
                    Get started
                  </Button>
                  <Button variant="secondary" to="/login" onClick={() => setOpen(false)}>
                    Sign in
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
