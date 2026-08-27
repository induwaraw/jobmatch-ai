import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import AuthLayout, { AuthAside, AuthSwitch } from "./AuthLayout";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Send people back where they were headed before being asked to sign in
  const redirectTo = location.state?.from || "/";

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(errorMessage(error, "Could not sign you in."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Sign in"
      title="Welcome back"
      intro="Sign in to see your matches, your skill gaps and the current demand forecast."
      aside={
        <AuthAside
          heading="About your account"
          points={[
            {
              title: "Your CV stays yours",
              body: "Uploaded CVs are stored against your account only and are not shared with employers.",
            },
            {
              title: "Sessions last an hour",
              body: "You will be asked to sign in again after that.",
            },
          ]}
        />
      }
      footer={
        <AuthSwitch
          prompt="Do not have an account yet?"
          to="/register"
          label="Create one"
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email address"
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          autoComplete="current-password"
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
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
