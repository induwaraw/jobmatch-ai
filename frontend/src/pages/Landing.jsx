import { ArrowRight, FileSearch, Gauge, LineChart, ShieldCheck } from "lucide-react";

import ForecastTeaser from "../components/ForecastTeaser";
import JobSearch from "../components/JobSearch";
import MatchPreview from "../components/MatchPreview";
import Reveal from "../components/Reveal";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Container from "../components/ui/Container";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  {
    number: "01",
    title: "Your CV, scored against real vacancies",
    body:
      "Upload a PDF or DOCX. The system reads the skills out of it, works out which " +
      "area of IT you sit in, and scores you against vacancies scraped from Sri Lankan " +
      "job boards. Every score shows its working.",
    detail: "Scored on skill overlap and field match, not keyword stuffing.",
  },
  {
    number: "02",
    title: "The specific skills you are missing",
    body:
      "For each role you see two lists: the skills you already have, and the ones the " +
      "advert asks for that your CV does not mention. Named tools and technologies, " +
      "not vague advice about being a team player.",
    detail: "Drawn from a curated taxonomy of 582 IT skills.",
  },
  {
    number: "03",
    title: "Where demand is heading",
    body:
      "The six areas of IT work are tracked as separate demand series and projected " +
      "six and twelve months out, so you can weigh a skill that is useful now against " +
      "one that will still be useful next year.",
    detail: "Forecasts are estimates, and the dashboard explains how to read them.",
  },
];

const DIFFERENTIATORS = [
  {
    icon: FileSearch,
    kicker: "Reads the document",
    title: "It reads your CV, not your keywords",
    body:
      "Most job sites match the words you typed into a search box. JobMatch AI extracts " +
      "the actual skills from your CV file and compares them against what each advert " +
      "asks for.",
  },
  {
    icon: Gauge,
    kicker: "Names the gap",
    title: "It tells you exactly what is missing",
    body:
      "A percentage on its own is useless. Every match lists the technologies you have " +
      "and the specific ones you do not, so you know what to learn next rather than " +
      "guessing.",
  },
  {
    icon: LineChart,
    kicker: "Local market",
    title: "It is built on the Sri Lankan market",
    body:
      "Vacancies come from Sri Lankan job boards and the six area proportions come from " +
      "those real listings, then demand for each is projected forward.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <section className="grain relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-brand-soft/60 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-40 h-[22rem] w-[22rem] rounded-full bg-accent-soft/50 blur-3xl"
        />

        <Container className="relative py-14 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:gap-16">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/80 px-3 py-1.5 text-micro font-semibold uppercase tracking-[0.13em] text-accent backdrop-blur">
                <ShieldCheck size={13} strokeWidth={2.5} aria-hidden="true" />
                For IT professionals in Sri Lanka
              </span>

              <h1 className="mt-6 font-display text-display font-semibold text-ink">
                Find the roles your CV{" "}
                <span className="relative whitespace-nowrap">
                  actually fits
                  <span
                    aria-hidden="true"
                    className="rule-accent absolute -bottom-1.5 left-0 h-[3px] w-full rounded-full opacity-80"
                  />
                </span>
                .
              </h1>

              <p className="mt-7 max-w-xl text-lead text-muted">
                Search open IT vacancies from Sri Lankan job boards. Upload your
                CV and JobMatch AI scores every role against your real skills,
                names the ones you are missing, and shows where demand is
                heading.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" to={isAuthenticated ? "/upload" : "/register"}>
                  Get started
                  <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
                </Button>
                {!isAuthenticated && (
                  <Button size="lg" variant="secondary" to="/login">
                    Sign in
                  </Button>
                )}
              </div>

              <dl className="mt-11 grid max-w-lg grid-cols-3 gap-5 border-t border-line pt-7">
                {[
                  ["6", "IT areas tracked"],
                  ["582", "skills recognised"],
                  ["12", "months forecast"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="font-display text-h3 font-semibold text-ink">{value}</dt>
                    <dd className="mt-1 text-micro leading-snug text-muted">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="animate-fade-up lg:pl-4" style={{ animationDelay: "140ms" }}>
              <MatchPreview />
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-panel/40">
        <Container className="py-14 lg:py-18">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-h2 font-semibold text-ink">
              Browse what is open right now
            </h2>
            <p className="mt-3 text-lead text-muted">
              Every vacancy below is currently open and was scraped from a Sri
              Lankan job board. Sign in to see how well each one matches you.
            </p>
          </Reveal>

          <Reveal delay={80} className="mt-8">
            <JobSearch />
          </Reveal>
        </Container>
      </section>

      <section className="relative overflow-hidden border-b border-line">
        <Container className="py-16 lg:py-20">
          <Reveal className="max-w-2xl">
            <p className="text-micro font-semibold uppercase tracking-[0.16em] text-accent">
              Why it is different
            </p>
            <h2 className="mt-4 font-display text-h2 font-semibold text-ink">
              Three things a keyword search cannot do
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {DIFFERENTIATORS.map((item, index) => (
              <Reveal key={item.title} delay={index * 110}>
                <Card
                  className={`group relative h-full overflow-hidden p-6 sm:p-7 ${
                    index === 1 ? "lg:-translate-y-5" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-soft/50 transition-transform duration-500 group-hover:scale-125"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 h-full w-[3px] rounded-r-full bg-accent/0 transition-colors duration-300 group-hover:bg-accent/70"
                  />

                  <div className="relative">
                    <span className="grid h-11 w-11 place-items-center rounded-[12px] border border-line bg-panel shadow-[0_1px_2px_rgba(18,33,31,0.05)]">
                      <item.icon size={20} strokeWidth={1.9} className="text-brand" aria-hidden="true" />
                    </span>

                    <p className="mt-5 text-micro font-semibold uppercase tracking-[0.13em] text-accent">
                      {item.kicker}
                    </p>
                    <h3 className="mt-2 font-display text-h3 font-semibold leading-snug text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-body leading-relaxed text-muted">{item.body}</p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-16 lg:py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] lg:items-center lg:gap-16">
            <Reveal>
              <p className="text-micro font-semibold uppercase tracking-[0.16em] text-accent">
                The second model
              </p>
              <h2 className="mt-4 font-display text-h2 font-semibold text-ink">
                Learn the skill that will still matter next year
              </h2>
              <p className="mt-5 max-w-xl text-lead text-muted">
                Knowing your gap is half the answer. The other half is knowing
                which gaps are worth closing. Demand for each of the six areas
                is modelled and projected six and twelve months ahead.
              </p>
              <p className="mt-4 max-w-xl text-small leading-relaxed text-faint">
                Modelled from historical IT employment trends used as a demand
                proxy. The dashboard explains how to read it.
              </p>
              <div className="mt-8">
                <Button to="/forecast" variant="secondary">
                  Open the forecast
                  <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </Button>
              </div>
            </Reveal>

            <Reveal delay={110}>
              <ForecastTeaser />
            </Reveal>
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-16 lg:py-20">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-h2 font-semibold text-ink">What it does</h2>
            <p className="mt-4 text-lead text-muted">
              Three things, each grounded in your own CV and in vacancies that
              are actually open.
            </p>
          </Reveal>

          <div className="mt-12 divide-y divide-line border-t border-line">
            {STEPS.map((step, index) => (
              <Reveal
                key={step.number}
                as="article"
                delay={index * 90}
                className="grid grid-cols-1 gap-x-10 gap-y-4 py-10 md:grid-cols-[auto_minmax(0,1fr)] lg:gap-x-16"
              >
                <div className="font-display text-h2 font-semibold leading-none text-accent/85 md:w-20">
                  {step.number}
                </div>
                <div className="max-w-2xl">
                  <h3 className="font-display text-[1.35rem] font-semibold leading-snug text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-lead text-muted">{step.body}</p>
                  <p className="mt-4 border-l-2 border-brand-soft pl-4 text-small text-faint">
                    {step.detail}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {!isAuthenticated && (
        <section>
          <Container>
            <Reveal className="grain relative overflow-hidden rounded-[18px] bg-brand px-6 py-12 sm:px-12 sm:py-16">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5"
              />
              <div className="relative max-w-2xl">
                <h2 className="font-display text-h2 font-semibold text-surface">
                  Upload your CV and see where you stand.
                </h2>
                <p className="mt-4 text-lead text-surface/75">
                  Creating an account takes a name, an email and a password.
                  Your CV is stored against your account and is not shared.
                </p>
                <div className="mt-8">
                  <Button size="lg" variant="accent" to="/register">
                    Create an account
                    <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Reveal>
          </Container>
        </section>
      )}
    </>
  );
}
