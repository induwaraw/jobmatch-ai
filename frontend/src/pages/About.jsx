import {
  ArrowRight,
  Brain,
  Compass,
  Database,
  Layers,
  MapPin,
  ScanSearch,
  Target,
} from "lucide-react";

import Reveal from "../components/Reveal";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Container from "../components/ui/Container";

const MODELS = [
  {
    icon: Brain,
    name: "CV subcategory classifier",
    body:
      "A DistilBERT transformer fine tuned to place a CV or a job advert into one of six " +
      "IT areas. It was trained on job posting text rather than CVs, because the public " +
      "CV datasets available did not contain enough distinct IT roles to learn six " +
      "classes from.",
    stat: "90.2% test accuracy, 0.884 macro F1",
  },
  {
    icon: Database,
    name: "Demand forecaster",
    body:
      "A Prophet time series model projecting demand for each of the six areas six and " +
      "twelve months ahead. Each area maps to a monthly employment series used as a " +
      "demand proxy. An LSTM was evaluated against it before Prophet was selected.",
    stat: "139 monthly observations, 2015 to 2026",
  },
  {
    icon: ScanSearch,
    name: "Skill extractor",
    body:
      "Deliberately not a trained model. The skill vocabulary is fixed and known, so " +
      "matching a curated taxonomy with spaCy is both more accurate and fully " +
      "explainable, which matters when the system is telling someone what they lack.",
    stat: "582 skills, 1,348 recognised surface forms",
  },
];

const SCOPE = [
  {
    icon: Target,
    heading: "What a match score is",
    body:
      "A prioritisation aid based on overlap between the skills named in your CV and " +
      "those named in an advert, weighted by whether the role sits in your area of IT. " +
      "It is not an assessment of how well you would perform the job, and it cannot see " +
      "experience, judgement or the things a CV does not say.",
  },
  {
    icon: Compass,
    heading: "What the forecast represents",
    body:
      "Demand is modelled from historical IT employment series used as a proxy, not from " +
      "counts of Sri Lankan vacancies over time, because no multi-year local series was " +
      "available. Two of the six proxies are close matches, two are moderate and two are " +
      "weak, and the dashboard says which.",
  },
  {
    icon: Layers,
    heading: "Where the vacancy data stops",
    body:
      "Skills are matched against a fixed taxonomy, so a technology outside it will not " +
      "be detected. A large share of adverts on one source are published as images with " +
      "no readable text, so they cannot be matched and are excluded from browsing while " +
      "still counting toward vacancy volume.",
  },
];

export default function About() {
  return (
    <>
      <section className="grain relative overflow-hidden border-b border-line">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-brand-soft/50 blur-3xl"
        />
        <Container className="relative py-14 sm:py-18 lg:py-24">
          <Reveal className="max-w-3xl">
            <p className="text-micro font-semibold uppercase tracking-[0.16em] text-accent">
              About the project
            </p>
            <h1 className="mt-5 font-display text-h1 font-semibold text-ink">
              A CV matching and demand forecasting system for the Sri Lankan IT industry
            </h1>
            <p className="mt-6 text-lead text-muted">
              JobMatch AI exists because the gap between a candidate and a role
              is usually specific and knowable, and because most job platforms
              will not tell you what it is. You get a list of vacancies, no
              sense of which ones you are close to, and no evidence about what
              would move you closer.
            </p>
          </Reveal>
        </Container>
      </section>

      <Container className="py-14 lg:py-18">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <Reveal>
            <h2 className="font-display text-h2 font-semibold text-ink">Who it is for</h2>
          </Reveal>
          <Reveal delay={80} className="space-y-4 text-lead text-muted">
            <p>
              Software engineering graduates and early career IT professionals
              in Sri Lanka, who can see the job adverts but cannot tell which
              ones are realistic, and who are deciding what to learn next with
              no evidence about which skills the local market is asking for.
            </p>
            <p>
              It is equally useful mid career. Someone considering a move from
              QA into DevOps can see how far that move actually is, measured in
              named skills rather than intuition.
            </p>
          </Reveal>
        </div>
      </Container>

      <section className="border-y border-line bg-panel/40">
        <Container className="py-14 lg:py-18">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-h2 font-semibold text-ink">The approach</h2>
            <p className="mt-4 text-lead text-muted">
              Two trained models and one deliberately rule based component.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {MODELS.map((model, index) => (
              <Reveal key={model.name} delay={index * 100}>
                <Card className="flex h-full flex-col p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-[12px] border border-line bg-panel">
                    <model.icon size={19} strokeWidth={1.9} className="text-brand" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-display text-h3 font-semibold text-ink">
                    {model.name}
                  </h3>
                  <p className="mt-3 flex-1 text-body leading-relaxed text-muted">
                    {model.body}
                  </p>
                  <p className="mt-5 rounded-[10px] bg-brand-tint px-3.5 py-2.5 text-micro font-medium text-brand">
                    {model.stat}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <Container className="py-14 lg:py-18">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <Reveal>
            <h2 className="inline-flex items-center gap-2.5 font-display text-h2 font-semibold text-ink">
              <MapPin size={22} strokeWidth={2} className="text-accent" aria-hidden="true" />
              Why Sri Lanka specifically
            </h2>
          </Reveal>
          <Reveal delay={80} className="space-y-4 text-lead text-muted">
            <p>
              International job platforms model an international market. The mix
              of roles advertised in Colombo is not the mix advertised in London
              or Bangalore, and advice built on the wrong market sends people
              towards the wrong skills.
            </p>
            <p>
              Vacancies here are scraped from Sri Lankan job boards, and the
              proportions used across the six areas come from those real
              listings rather than being assumed.
            </p>
          </Reveal>
        </div>
      </Container>

      <section className="border-t border-line">
        <Container className="py-14 lg:py-18">
          <Reveal className="max-w-2xl">
            <p className="text-micro font-semibold uppercase tracking-[0.16em] text-accent">
              Set deliberately
            </p>
            <h2 className="mt-4 font-display text-h2 font-semibold text-ink">
              Scope and limitations
            </h2>
            <p className="mt-4 text-lead text-muted">
              Every modelling decision here narrowed the problem in a specific
              way. These are the boundaries that follow from those choices, and
              knowing them is part of using the system properly.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {SCOPE.map((item, index) => (
              <Reveal key={item.heading} delay={index * 100}>
                <Card tone="tint" className="h-full p-6">
                  <span className="inline-flex items-center gap-2.5">
                    <item.icon size={18} strokeWidth={2} className="text-accent" aria-hidden="true" />
                    <h3 className="font-display text-h3 font-semibold text-ink">
                      {item.heading}
                    </h3>
                  </span>
                  <p className="mt-3.5 text-body leading-relaxed text-muted">{item.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <Container className="pb-16">
        <Reveal className="flex flex-col gap-3 sm:flex-row">
          <Button to="/register">
            Create an account
            <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
          </Button>
          <Button to="/contact" variant="secondary">
            Get in touch
          </Button>
        </Reveal>
      </Container>
    </>
  );
}
