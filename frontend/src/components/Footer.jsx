import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Container from "./ui/Container";
import Logo from "./Logo";

export default function Footer() {
  const { isAuthenticated } = useAuth();

  const columns = [
    {
      heading: "Product",
      links: [
        { to: "/", label: "Browse vacancies" },
        { to: "/forecast", label: "Demand forecast" },
        isAuthenticated
          ? { to: "/upload", label: "Upload your CV" }
          : { to: "/register", label: "Create an account" },
        isAuthenticated
          ? { to: "/profile", label: "Your profile" }
          : { to: "/login", label: "Sign in" },
      ],
    },
    {
      heading: "Company",
      links: [
        { to: "/about", label: "About" },
        { to: "/contact", label: "Contact" },
        { to: "/privacy", label: "Privacy policy" },
        { to: "/terms", label: "Terms and conditions" },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-line bg-panel/50">
      <Container className="py-14 lg:py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-16">
          <div className="max-w-sm">
            <Logo size="lg" />
            <p className="mt-5 text-small leading-relaxed text-muted">
              CV matching, skill gap analysis and job market demand forecasting
              for the Sri Lankan IT industry.
            </p>
            <p className="mt-5 text-micro leading-relaxed text-faint">
              A final year BSc Software Engineering research project. Not a
              commercial service.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="text-micro font-semibold uppercase tracking-[0.13em] text-ink">
                {column.heading}
              </p>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link
                      to={link.to}
                      className="text-small text-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-7 text-small text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Developed by Induwara Weerarathna</p>
          <p className="text-faint">
            Cardiff Metropolitan University and ICBT, {new Date().getFullYear()}
          </p>
        </div>
      </Container>
    </footer>
  );
}
