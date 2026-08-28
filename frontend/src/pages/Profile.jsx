import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  Mail,
  Pencil,
  Shield,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import Reveal from "../components/Reveal";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Container from "../components/ui/Container";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { api, deleteCv, errorMessage } from "../lib/api";

function initials(name, email) {
  const source = (name || email || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(value, withTime = false) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export default function Profile() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const [pendingCv, setPendingCv] = useState(null);
  const [deletingCv, setDeletingCv] = useState(false);
  const [confirmAccount, setConfirmAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    setName(user?.full_name || "");
  }, [user?.full_name]);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/cv/mine")
      .then((response) => !cancelled && setCvs(response.data))
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Could not load your CVs."));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveName(event) {
    event.preventDefault();
    setSaveError("");
    if (!name.trim()) {
      setSaveError("Please enter your name.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(name.trim());
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    } catch (err) {
      setSaveError(errorMessage(err, "Could not save your name."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmCvDelete() {
    if (!pendingCv) return;
    setDeletingCv(true);
    try {
      await deleteCv(pendingCv.id);
      setCvs((current) => current.filter((cv) => cv.id !== pendingCv.id));
      setPendingCv(null);
    } catch (err) {
      setError(errorMessage(err, "Could not delete that CV."));
      setPendingCv(null);
    } finally {
      setDeletingCv(false);
    }
  }

  async function confirmAccountDelete() {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not delete your account."));
      setConfirmAccount(false);
    } finally {
      setDeletingAccount(false);
    }
  }

  const totalCharacters = cvs.reduce((sum, cv) => sum + cv.character_count, 0);

  return (
    <Container className="py-12 sm:py-14 lg:py-20">
      <Reveal>
        <Card className="grain relative overflow-hidden p-6 sm:p-8">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-soft/50 blur-2xl"
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[18px] bg-brand font-display text-2xl font-semibold text-surface shadow-[0_8px_24px_-10px_rgba(15,61,62,0.6)]">
              {initials(user?.full_name, user?.email)}
            </span>

            <div className="min-w-0 flex-1">
              {editing ? (
                <form onSubmit={saveName} className="max-w-sm">
                  <Input
                    label="Full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    error={saveError}
                    autoFocus
                  />
                  <div className="mt-3 flex gap-2">
                    <Button type="submit" size="sm" disabled={saving}>
                      <Check size={15} strokeWidth={2.25} aria-hidden="true" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(false);
                        setName(user?.full_name || "");
                        setSaveError("");
                      }}
                    >
                      <X size={15} strokeWidth={2.25} aria-hidden="true" />
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
                    <h1 className="min-w-0 wrap-anywhere font-display text-h1 font-semibold text-ink">
                      {user?.full_name || "Your account"}
                    </h1>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1.5 rounded-[8px] border border-line bg-panel px-2.5 py-1.5 text-micro font-medium text-muted transition-colors hover:border-line-strong hover:text-ink"
                    >
                      <Pencil size={12} strokeWidth={2.25} aria-hidden="true" />
                      Edit profile
                    </button>
                    {saved && (
                      <span className="animate-draw-in inline-flex items-center gap-1.5 text-micro font-medium text-brand">
                        <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                        Saved
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-start gap-x-5 gap-y-2 text-small text-muted">
                    <span className="inline-flex min-w-0 max-w-full items-start gap-1.5">
                      <Mail size={14} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" />
                      <span className="break-all">{user?.email}</span>
                    </span>
                    <span className="inline-flex items-start gap-1.5">
                      <Shield size={14} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" />
                      {user?.role === "admin" ? "Administrator" : "Standard account"}
                    </span>
                    {user?.created_at && (
                      <span className="inline-flex items-start gap-1.5">
                        <CalendarDays size={14} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" />
                        Joined {formatDate(user.created_at)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={70} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "CVs uploaded", value: cvs.length },
          { label: "Text extracted", value: `${totalCharacters.toLocaleString()} chars` },
          {
            label: "Most recent",
            value: cvs.length ? formatDate(cvs[0].uploaded_at) : "None yet",
          },
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-micro font-semibold uppercase tracking-[0.11em] text-muted">
              {item.label}
            </p>
            <p className="mt-2 break-words font-display text-h3 font-semibold text-ink">
              {item.value}
            </p>
          </Card>
        ))}
      </Reveal>

      <Reveal delay={90} as="section" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-h2 font-semibold text-ink">Your CVs</h2>
            <p className="mt-2 text-small text-muted">
              Every CV you have uploaded, newest first.
            </p>
          </div>
          <Button to="/upload" variant="secondary" size="sm">
            Upload another
          </Button>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            {[0, 1].map((row) => (
              <div key={row} className="h-20 animate-pulse rounded-[12px] bg-line/40" />
            ))}
          </div>
        ) : error ? (
          <p className="mt-6 rounded-[12px] border border-accent/30 bg-accent-soft px-4 py-3 text-small text-accent">
            {error}
          </p>
        ) : cvs.length === 0 ? (
          <Card tone="tint" className="mt-6 p-8">
            <h3 className="font-display text-h3 font-semibold text-ink">No CVs yet</h3>
            <p className="mt-2 max-w-lg text-small leading-relaxed text-muted">
              Upload a PDF or DOCX to see which open vacancies fit your skills.
            </p>
            <div className="mt-6">
              <Button to="/upload">Upload your CV</Button>
            </div>
          </Card>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cvs.map((cv) => (
              <li key={cv.id}>
                <Card className="lift flex h-full flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-line bg-brand-tint">
                      <FileText size={18} strokeWidth={1.9} className="text-brand" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="wrap-anywhere text-small font-semibold leading-snug text-ink">
                        {cv.filename}
                      </p>
                      <p className="mt-1.5 text-micro text-muted">
                        {formatDate(cv.uploaded_at, true)}
                      </p>
                      <p className="mt-0.5 text-micro text-faint">
                        {cv.character_count.toLocaleString()} characters
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4">
                    <Link
                      to={`/matches/${cv.id}`}
                      className="inline-flex items-center gap-1.5 text-small font-semibold text-brand underline underline-offset-4 hover:text-brand-hover"
                    >
                      See matches
                      <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingCv(cv)}
                      className="inline-flex items-center gap-1.5 text-micro font-medium text-faint transition-colors hover:text-accent"
                    >
                      <Trash2 size={13} strokeWidth={2.25} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Reveal>

      <Reveal delay={110} as="section" className="mt-14">
        <Card className="border-accent/25 p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <h2 className="inline-flex items-center gap-2 font-display text-h3 font-semibold text-ink">
                <TriangleAlert size={18} strokeWidth={2} className="text-accent" aria-hidden="true" />
                Delete your account
              </h2>
              <p className="mt-3 text-small leading-relaxed text-muted">
                This removes your account, every CV you have uploaded and all
                extracted skill data. It cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setConfirmAccount(true)}
            >
              <Trash2 size={15} strokeWidth={2.25} aria-hidden="true" />
              Delete account
            </Button>
          </div>
        </Card>
      </Reveal>

      <ConfirmDialog
        open={Boolean(pendingCv)}
        title="Delete this CV?"
        body={`"${pendingCv?.filename ?? ""}" and its data will be removed. This cannot be undone.`}
        confirmLabel="Delete CV"
        busy={deletingCv}
        onConfirm={confirmCvDelete}
        onCancel={() => setPendingCv(null)}
      />

      <ConfirmDialog
        open={confirmAccount}
        title="Delete your account?"
        body={`This permanently removes your account, ${cvs.length} uploaded ${cvs.length === 1 ? "CV" : "CVs"} and all extracted data. This cannot be undone.`}
        confirmLabel="Delete everything"
        busy={deletingAccount}
        onConfirm={confirmAccountDelete}
        onCancel={() => setConfirmAccount(false)}
      />
    </Container>
  );
}
