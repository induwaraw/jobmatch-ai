import { FileSearch, Gauge, LineChart } from "lucide-react";

import ForecastTeaser from "../components/ForecastTeaser";
import JobSearch from "../components/JobSearch";
import MatchPreview from "../components/MatchPreview";
import Reveal from "../components/Reveal";
import Button from "../components/ui/Button";
import Container from "../components/ui/Container";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  {
    number: "01",
    title: "Your CV, scored against real vacancies",
    body:
      "Upload a PDF or DOCX. The system reads the skills out of it, works out which " +
      "area of IT you sit in, and scores you against IT jobs scraped from Sri Lankan " +
      "job boards. Every score shows its working, so you can see why a role ranked " +
      "where it did.",
    detail: "Scored on skill overlap and field match, not keyword stuffing.",
  },
  {
    number: "02",
    title: "The specific skills you are missing",
    body:
      "For each role you see two lists: the skills you already have, and the ones the " +
      "advert asks for that your CV does not mention. No vague advice about being a " +
      "team player, just the named tools and technologies that stand between you and " +
      "the job.",
    detail: "Drawn from a curated taxonomy of 582 IT skills.",
  },
  {
    number: "03",
    title: "Where demand is heading",
    body:
      "Software engineering, data science, cyber security, DevOps, QA and UI/UX are " +
      "tracked as separate demand series. The forecast projects each one six and " +
      "twelve months out, so you can weigh a skill that is useful now against one " +
      "that will still be useful next year.",
    detail: "Forecasts are estimates, and the dashboard says how confident each is.",
  },
];

const DIFFERENTIATORS = [
  {
    icon: FileSearch,
    title: "It reads your CV, not your keywords",
    body:
      "Most job sites match on the words you typed into a search box. JobMatch AI " +
      "extracts the actual skills from your CV document and compares them against " +
      "the skills each advert asks for.",
  },
  {
    icon: Gauge,
    title: "It tells you exactly what is missing",
    body:
      "A percentage on its own is useless. Every match lists the named tools and " +
      "technologies you already have and the specific ones you do not, so you know " +
      "what to learn next rather than guessing.",
  },
  {
    icon: LineChart,
    title: "It is built on the Sri Lankan market",
    body:
      "Vacancies are scraped from Sri Lankan job boards, and the six subcategory " +
      "proportions come from those real listings. The demand forecast then projects " +
      "each area six and twelve months ahead.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <Container className="py-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <Reveal>
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-accent">
                For IT professionals in Sri Lanka
              </p>

              <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[3.25rem]">
                Find the roles your CV
                <br className="hidden sm:block" /> actually fits.
              </h1>

              <p className="mt-6 max-w-xl text-[1.0625rem] leading-[1.7] text-muted">
                Search open IT vacancies from Sri Lankan job boards. Upload your
                CV and JobMatch AI scores every role against your actual skills,
                names the ones you are missing, and shows where demand is
                heading.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" to={isAuthenticated ? "/upload" : "/register"}>
                  Get started
                </Button>
                {!isAuthenticated && (
                  <Button size="lg" variant="secondary" to="/login">
                    Sign in
                  </Button>
                )}
              </div>
            </Reveal>

            <Reveal delay={120} className="lg:pl-4">
              <MatchPreview />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Live vacancy search, the thing that makes this a product */}
      <section className="border-b border-line bg-panel/40">
        <Container className="py-14 lg:py-16">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-[1.85rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
              Browse what is open right now
            </h2>
            <p className="mt-3 text-[1.0625rem] leading-[1.7] text-muted">
              Every vacancy below is currently open and was scraped from a Sri
              Lankan job board. Sign in to see how well each one matches you.
            </p>
          </Reveal>

          <Reveal delay={80} className="mt-8">
            <JobSearch />
          </Reveal>
        </Container>
      </section>

      {/* Why it is different */}
      <section className="border-b border-line">
        <Container className="py-16 lg:py-20">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
              Why JobMatch AI is different
            </h2>
            <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">
              Three things a keyword job search cannot do.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8 lg:gap-12">
            {DIFFERENTIATORS.map((item, index) => (
              <Reveal key={item.title} delay={index * 90}>
                <item.icon
                  size={22}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="text-accent"
                />
                <h3 className="mt-4 font-display text-[1.2rem] font-semibold leading-snug text-ink">
                  {item.title}
                </h3>
                <p className="mt-3 text-[0.975rem] leading-[1.7] text-muted">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Forecast teaser */}
      <section className="border-b border-line">
        <Container className="py-16 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
            <Reveal>
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-accent">
                The second model
              </p>
              <h2 className="mt-4 font-display text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
                Learn the skill that will still matter next year
              </h2>
              <p className="mt-4 max-w-xl text-[1.0625rem] leading-[1.7] text-muted">
                Knowing your gap is half the answer. The other half is knowing
                which gaps are worth closing. JobMatch AI models demand for each
                of the six areas of IT work and projects it six and twelve
                months ahead, so you can pick what to learn with the direction
                of the market in mind.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
                Modelled from historical IT employment trends used as a demand
                proxy. The dashboard explains how to read it.
              </p>
            </Reveal>

            <Reveal delay={100}>
              <ForecastTeaser />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section>
        <Container className="py-16 lg:py-20">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
              What it does
            </h2>
            <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">
              Three things, each grounded in your own CV and in vacancies that
              are actually open.
            </p>
          </Reveal>

          <div className="mt-12 divide-y divide-line border-t border-line">
            {STEPS.map((step, index) => (
              <Reveal
                key={step.number}
                as="article"
                delay={index * 80}
                className="grid gap-x-10 gap-y-4 py-10 md:grid-cols-[auto_1fr] lg:gap-x-16"
              >
                <div className="font-display text-[1.75rem] font-semibold leading-none text-accent md:w-16">
                  {step.number}
                </div>

                <div className="max-w-2xl">
                  <h3 className="font-display text-[1.4rem] font-semibold leading-snug text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[1.0625rem] leading-[1.75] text-muted">
                    {step.body}
                  </p>
                  <p className="mt-4 border-l-2 border-brand-soft pl-4 text-sm text-muted">
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
            <Reveal className="rounded-[10px] bg-brand px-8 py-12 sm:px-12 sm:py-14">
              <div className="max-w-2xl">
                <h2 className="font-display text-[1.85rem] font-semibold leading-tight text-surface sm:text-[2.1rem]">
                  Upload your CV and see where you stand.
                </h2>
                <p className="mt-4 text-[1.0625rem] leading-[1.7] text-surface/75">
                  Creating an account takes a name, an email and a password.
                  Your CV is stored against your account and is not shared.
                </p>
                <div className="mt-8">
                  <Button size="lg" variant="accent" to="/register">
                    Create an account
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
