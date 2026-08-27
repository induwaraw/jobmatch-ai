import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Container from "./ui/Container";

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
      ],
    },
    {
      heading: "Project",
      links: [
        { to: "/about", label: "About" },
        { to: "/contact", label: "Contact" },
        isAuthenticated
          ? { to: "/profile", label: "Your profile" }
          : { to: "/login", label: "Sign in" },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-line">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <p className="font-display text-lg font-semibold text-ink">JobMatch AI</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              CV matching, skill gap analysis and job market demand forecasting
              for the Sri Lankan IT industry.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <p className="text-sm font-medium text-ink">{column.heading}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Developed by Induwara Weerarathna</p>
          <p>BSc (Hons) Software Engineering final year project</p>
        </div>
      </Container>
    </footer>
  );
}
