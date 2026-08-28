import Reveal from "../components/Reveal";
import Card from "../components/ui/Card";
import Container from "../components/ui/Container";

export default function LegalPage({ eyebrow, title, intro, updated, sections, closing }) {
  return (
    <Container size="reading" className="py-12 sm:py-14 lg:py-20">
      <Reveal>
        <p className="text-micro font-semibold uppercase tracking-[0.16em] text-accent">
          {eyebrow}
        </p>
        <h1 className="mt-4 font-display text-h1 font-semibold text-ink">{title}</h1>
        <p className="mt-5 text-lead text-muted">{intro}</p>
        <p className="mt-4 text-small text-faint">Last updated {updated}</p>
      </Reveal>

      <Reveal delay={70} className="mt-10">
        <Card tone="tint" className="p-5">
          <p className="text-small leading-relaxed text-muted">
            JobMatch AI is a university research prototype, not a commercial
            service. This page sets out sensible baseline terms and should be
            reviewed before any public deployment.
          </p>
        </Card>
      </Reveal>

      <div className="mt-12 space-y-10">
        {sections.map((section, index) => (
          <Reveal key={section.heading} as="section" delay={index * 60}>
            <h2 className="font-display text-h3 font-semibold text-ink">
              <span className="mr-3 text-accent">{String(index + 1).padStart(2, "0")}</span>
              {section.heading}
            </h2>
            <div className="mt-3 space-y-3 text-body leading-relaxed text-muted">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {section.list && (
              <ul className="mt-4 space-y-2.5 border-l-2 border-brand-soft pl-5">
                {section.list.map((item) => (
                  <li key={item} className="text-body leading-relaxed text-muted">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        ))}
      </div>

      {closing && (
        <Reveal className="mt-12">
          <Card className="p-6">
            <p className="text-body leading-relaxed text-muted">{closing}</p>
          </Card>
        </Reveal>
      )}
    </Container>
  );
}
