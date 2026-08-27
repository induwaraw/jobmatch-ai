import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import AuthLayout, { AuthAside, AuthSwitch } from "./AuthLayout";

const MIN_PASSWORD = 8;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = "Please enter your name.";
    if (!form.email.trim()) errors.email = "Please enter your email address.";
    if (form.password.length < MIN_PASSWORD) {
      errors.password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register(form.fullName.trim(), form.email.trim(), form.password);
      navigate("/", { replace: true });
    } catch (error) {
      setFormError(errorMessage(error, "Could not create your account."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Create an account"
      title="Set up your JobMatch AI account"
      intro="You need an account so your CV and your match results stay attached to you. It takes three fields."
      aside={
        <AuthAside
          heading="What happens next"
          points={[
            {
              title: "Upload your CV",
              body: "A PDF or DOCX. The text is read out of it and stored against your account.",
            },
            {
              title: "See your matches",
              body: "Open IT vacancies ranked by how well your skills line up with each one.",
            },
            {
              title: "Check the forecast",
              body: "Demand for each area of IT work, projected six and twelve months out.",
            },
          ]}
        />
      }
      footer={
        <AuthSwitch prompt="Already have an account?" to="/login" label="Sign in" />
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input
          label="Full name"
          value={form.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          error={fieldErrors.fullName}
          autoComplete="name"
          required
        />

        <Input
          label="Email address"
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          error={fieldErrors.password}
          hint={`At least ${MIN_PASSWORD} characters.`}
          autoComplete="new-password"
          required
        />

        {formError && (
          <p
            role="alert"
            className="rounded-[8px] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
          >
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Creating your account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
