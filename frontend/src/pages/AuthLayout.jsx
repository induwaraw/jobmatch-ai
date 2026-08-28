import { Link } from "react-router-dom";

import Card from "../components/ui/Card";
import Container from "../components/ui/Container";

export default function AuthLayout({ eyebrow, title, intro, aside, footer, children }) {
  return (
    <Container className="py-14 lg:py-20">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-20">
        <div className="max-w-md">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
            {title}
          </h1>
          {intro && (
            <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">{intro}</p>
          )}

          <div className="mt-9">{children}</div>

          {footer && <div className="mt-8 text-sm text-muted">{footer}</div>}
        </div>

        {aside && (
          <div className="lg:pt-16">
            <Card className="p-6 sm:p-7">{aside}</Card>
          </div>
        )}
      </div>
    </Container>
  );
}

export function AuthAside({ heading, points }) {
  return (
    <>
      <h2 className="font-display text-lg font-semibold text-ink">{heading}</h2>
      <ul className="mt-4 space-y-4">
        {points.map((point) => (
          <li key={point.title}>
            <p className="text-sm font-medium text-ink">{point.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{point.body}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AuthSwitch({ prompt, to, label }) {
  return (
    <>
      {prompt}{" "}
      <Link to={to} className="font-medium text-brand underline underline-offset-4">
        {label}
      </Link>
    </>
  );
}
