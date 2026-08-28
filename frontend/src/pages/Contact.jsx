import { useState } from "react";
import { CheckCircle2, GraduationCap, Mail, MapPin } from "lucide-react";

import Reveal from "../components/Reveal";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Container from "../components/ui/Container";
import Input from "../components/ui/Input";

const DETAILS = [
  { icon: Mail, label: "Email", value: "your.email@example.com" },
  { icon: GraduationCap, label: "Institution", value: "Cardiff Metropolitan University / ICBT" },
  { icon: MapPin, label: "Location", value: "Colombo, Sri Lanka" },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!form.email.trim()) next.email = "Please enter your email address.";
    if (form.message.trim().length < 10) {
      next.message = "Please write at least a sentence.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSent(true);
  }

  return (
    <Container className="py-14 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-20">
        <Reveal className="max-w-xl">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-accent">
            Contact
          </p>
          <h1 className="mt-4 font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
            Get in touch
          </h1>
          <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">
            Questions about the project, the methodology or the data sources are
            welcome, as is feedback on how the matching performed against your
            own CV.
          </p>

          {sent ? (
            <Card className="mt-9 p-6 sm:p-7">
              <CheckCircle2
                size={24}
                strokeWidth={2}
                aria-hidden="true"
                className="text-brand"
              />
              <h2 className="mt-4 font-display text-xl font-semibold text-ink">
                Thanks, {form.name.split(" ")[0]}
              </h2>
              <p className="mt-3 text-[0.975rem] leading-relaxed text-muted">
                Your message has been recorded. Note that this form does not yet
                send email, so nothing has left your browser.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setForm({ name: "", email: "", message: "" });
                    setSent(false);
                  }}
                >
                  Send another
                </Button>
                <Button to="/" variant="ghost">
                  Back to the homepage
                </Button>
              </div>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-9 space-y-5">
              <Input
                label="Your name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                error={errors.name}
                autoComplete="name"
              />
              <Input
                label="Email address"
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                error={errors.email}
                autoComplete="email"
              />

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-ink"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={6}
                  value={form.message}
                  onChange={(event) => update("message", event.target.value)}
                  className={`mt-2 w-full rounded-[8px] border bg-panel px-3 py-2.5 text-[0.95rem]
                    leading-relaxed text-ink placeholder:text-muted/60 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-brand/25
                    ${errors.message ? "border-accent focus:border-accent" : "border-line focus:border-brand"}`}
                  placeholder="What would you like to ask?"
                />
                {errors.message && (
                  <p className="mt-2 text-sm text-accent">{errors.message}</p>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Send message
              </Button>
            </form>
          )}
        </Reveal>

        <Reveal delay={100} className="lg:pt-16">
          <Card className="p-6 sm:p-7">
            <h2 className="font-display text-lg font-semibold text-ink">Details</h2>
            <dl className="mt-5 space-y-5">
              {DETAILS.map((item) => (
                <div key={item.label}>
                  <dt className="flex items-center gap-2 text-sm text-muted">
                    <item.icon size={15} strokeWidth={2} aria-hidden="true" />
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-[0.975rem] text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-7 border-t border-line pt-5 text-sm leading-relaxed text-muted">
              JobMatch AI is a final year BSc Software Engineering project by
              Induwara Weerarathna. It is a research prototype, not a commercial
              service.
            </p>
          </Card>
        </Reveal>
      </div>
    </Container>
  );
}
