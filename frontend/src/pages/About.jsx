import { Brain, Database, GraduationCap, MapPin } from "lucide-react";

import Reveal from "../components/Reveal";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Container from "../components/ui/Container";

const MODELS = [
  {
    icon: Brain,
    name: "CV subcategory classifier",
    body:
      "A DistilBERT transformer fine tuned to place a CV or a job advert into one of " +
      "six IT areas: software engineering, data science, cyber security, DevOps, QA " +
      "and UI/UX. It was trained on job posting text rather than CVs, because the " +
      "public CV datasets available did not contain enough distinct IT roles to " +
      "learn six classes from.",
    detail: "Held out test accuracy 90.2%, macro F1 0.884.",
  },
  {
    icon: Database,
    name: "Demand forecaster",
    body:
      "A Prophet time series model projecting demand for each of the six areas six " +
      "and twelve months ahead. Each area is mapped to a monthly employment series " +
      "as a demand proxy, and an LSTM was evaluated against it before Prophet was " +
      "selected.",
    detail: "139 monthly observations, 2015 to 2026.",
  },
];

const STACK = [
  ["Backend", "Python 3.10, FastAPI, SQLAlchemy, Alembic, MySQL 8"],
  ["Frontend", "React 18, Vite, Tailwind CSS, Recharts"],
  ["Skill extraction", "spaCy PhraseMatcher over a curated taxonomy of 582 IT skills"],
  ["Data sources", "XpressJobs and TopJobs vacancies, LinkedIn postings, FRED employment series"],
];

export default function About() {
  return (
    <Container className="py-14 lg:py-20">
      <Reveal className="max-w-3xl">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-accent">
          About the project
        </p>
        <h1 className="mt-4 font-display text-[2.4rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
          A CV matching and demand forecasting system for the Sri Lankan IT industry
        </h1>
        <p className="mt-6 text-[1.0625rem] leading-[1.75] text-muted">
          JobMatch AI is a final year research project. It exists because the
          gap between a candidate and a role is usually specific and knowable,
          and because most job platforms will not tell you what it is. You get
          a list of vacancies and no sense of which ones you are close to, or
          what would move you closer.
        </p>
      </Reveal>

      <Reveal delay={80} className="mt-14 max-w-3xl">
        <h2 className="font-display text-[1.6rem] font-semibold leading-tight text-ink">
          Who it is for
        </h2>
        <div className="mt-5 space-y-4 text-[1.0625rem] leading-[1.75] text-muted">
          <p>
            Software engineering graduates and early career IT professionals in
            Sri Lanka, who can see the job adverts but cannot tell which ones
            are realistic, and who are deciding what to learn next with no
            evidence about which skills the local market is actually asking for.
          </p>
          <p>
            It is equally useful to someone mid career who is considering
            moving between areas, for example from QA into DevOps, and wants to
            see how far that move really is in terms of named skills.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80} className="mt-14">
        <h2 className="font-display text-[1.6rem] font-semibold leading-tight text-ink">
          The approach
        </h2>
        <p className="mt-4 max-w-3xl text-[1.0625rem] leading-[1.75] text-muted">
          Two trained models, plus a rule based skill extractor. The extraction
          is deliberately not a trained model: the skill vocabulary is fixed and
          known, so matching a curated list is both more accurate and fully
          explainable, which matters when the system is telling someone what
          they are missing.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {MODELS.map((model, index) => (
            <Reveal key={model.name} delay={index * 90}>
              <Card className="h-full p-6">
                <model.icon
                  size={22}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="text-accent"
                />
                <h3 className="mt-4 font-display text-[1.2rem] font-semibold text-ink">
                  {model.name}
                </h3>
                <p className="mt-3 text-[0.975rem] leading-[1.7] text-muted">
                  {model.body}
                </p>
                <p className="mt-4 border-l-2 border-brand-soft pl-4 text-sm text-muted">
                  {model.detail}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Reveal>

      <Reveal delay={80} className="mt-14 max-w-3xl">
        <h2 className="flex items-center gap-2 font-display text-[1.6rem] font-semibold leading-tight text-ink">
          <MapPin size={20} strokeWidth={2} aria-hidden="true" className="text-accent" />
          Why Sri Lanka specifically
        </h2>
        <div className="mt-5 space-y-4 text-[1.0625rem] leading-[1.75] text-muted">
          <p>
            International job platforms model an international market. The mix
            of roles advertised in Colombo is not the mix advertised in London
            or Bangalore, and advice built on the wrong market sends people
            towards the wrong skills.
          </p>
          <p>
            Vacancies here are scraped from Sri Lankan job boards, and the
            proportions used across the six areas are taken from those real
            listings rather than assumed.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80} className="mt-14 max-w-3xl">
        <h2 className="font-display text-[1.6rem] font-semibold leading-tight text-ink">
          Built with
        </h2>
        <dl className="mt-6 divide-y divide-line border-y border-line">
          {STACK.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
              <dt className="text-sm font-medium text-ink">{label}</dt>
              <dd className="text-[0.975rem] leading-relaxed text-muted">{value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal delay={80} className="mt-14 max-w-3xl">
        <Card className="p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-[1.2rem] font-semibold text-ink">
            <GraduationCap size={20} strokeWidth={2} aria-hidden="true" className="text-accent" />
            Honest limitations
          </h2>
          <ul className="mt-4 space-y-3 text-[0.975rem] leading-[1.7] text-muted">
            <li>
              Match scores are a guide for prioritising applications. They are
              not an assessment of whether you would do the job well.
            </li>
            <li>
              The demand forecast is modelled from historical IT employment
              trends used as a proxy, not from counts of Sri Lankan vacancies.
              Some of the six proxies are closer than others.
            </li>
            <li>
              Skills are matched against a fixed taxonomy, so a technology that
              is not in it will not be detected in your CV.
            </li>
            <li>
              Some job adverts are published as images, which contain no text to
              read, so they cannot be matched and are excluded from browsing.
            </li>
          </ul>
        </Card>
      </Reveal>

      <Reveal delay={80} className="mt-14">
        <div className="flex flex-wrap gap-3">
          <Button to="/register">Create an account</Button>
          <Button to="/contact" variant="secondary">
            Get in touch
          </Button>
        </div>
      </Reveal>
    </Container>
  );
}
