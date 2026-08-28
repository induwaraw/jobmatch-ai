import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";

import Reveal from "../components/Reveal";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Container from "../components/ui/Container";
import { api, deleteCv, errorMessage, uploadCv } from "../lib/api";

const MAX_MB = 5;

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Upload() {
  const inputRef = useRef(null);

  const [cvs, setCvs] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [result, setResult] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCvs = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const { data } = await api.get("/api/cv/mine");
      setCvs(data);
    } catch (error) {
      setListError(errorMessage(error, "Could not load your CVs."));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCvs();
  }, [loadCvs]);

  async function handleFile(file) {
    if (!file) return;
    setUploadError("");
    setResult(null);

    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      setUploadError("Please choose a PDF or a DOCX file.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`
      );
      return;
    }

    setUploading(true);
    try {
      const { data } = await uploadCv(file);
      setResult(data);
      loadCvs();
    } catch (error) {
      setUploadError(errorMessage(error, "Could not read that file."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCv(pendingDelete.id);
      setCvs((current) => current.filter((cv) => cv.id !== pendingDelete.id));
      if (result?.id === pendingDelete.id) setResult(null);
      setPendingDelete(null);
    } catch (error) {
      setListError(errorMessage(error, "Could not delete that CV."));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const zoneState = uploading
    ? "border-brand bg-brand-soft/40"
    : dragging
      ? "border-brand bg-brand-soft/60 scale-[1.01]"
      : "border-line-strong bg-panel hover:border-brand/50 hover:bg-brand-tint";

  return (
    <Container className="py-12 sm:py-14 lg:py-20">
      <Reveal className="max-w-2xl">
        <p className="text-micro font-semibold uppercase tracking-[0.16em] text-accent">
          Step one
        </p>
        <h1 className="mt-4 font-display text-h1 font-semibold text-ink">Upload your CV</h1>
        <p className="mt-4 text-lead text-muted">
          A PDF or DOCX up to {MAX_MB} MB. The text is read out of the file and
          used to work out your skills. Scanned CVs saved as images will not
          work, because there is no text to read.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        <Reveal>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              handleFile(event.dataTransfer.files?.[0]);
            }}
            onClick={() => !uploading && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            aria-label="Upload your CV"
            className={`grain relative cursor-pointer rounded-[16px] border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-12 ${zoneState}`}
          >
            <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft">
              {uploading ? (
                <Loader2 size={26} strokeWidth={2} className="animate-spin text-brand" aria-hidden="true" />
              ) : (
                <CloudUpload
                  size={26}
                  strokeWidth={1.9}
                  aria-hidden="true"
                  className={`text-brand transition-transform duration-300 ${dragging ? "-translate-y-1" : ""}`}
                />
              )}
            </span>

            <p className="relative mt-5 font-display text-h3 font-semibold text-ink">
              {uploading
                ? "Reading your CV..."
                : dragging
                  ? "Drop it here"
                  : "Drag your CV here"}
            </p>
            <p className="relative mt-2 text-small text-muted">
              {uploading ? "This takes a second" : "or click to choose a file"}
            </p>

            <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-[7px] border border-line bg-panel px-2.5 py-1 text-micro font-medium text-muted">
                PDF
              </span>
              <span className="rounded-[7px] border border-line bg-panel px-2.5 py-1 text-micro font-medium text-muted">
                DOCX
              </span>
              <span className="rounded-[7px] border border-line bg-panel px-2.5 py-1 text-micro font-medium text-muted">
                Up to {MAX_MB} MB
              </span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </div>

          {uploadError && (
            <div
              role="alert"
              className="animate-draw-in mt-5 flex gap-3 rounded-[12px] border border-accent/30 bg-accent-soft px-4 py-3.5"
            >
              <AlertCircle size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <p className="text-small leading-relaxed text-accent">{uploadError}</p>
            </div>
          )}

          {result && (
            <Card className="animate-draw-in mt-6 overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-line bg-brand-tint px-6 py-3.5">
                <CheckCircle2 size={17} strokeWidth={2.25} className="text-brand" aria-hidden="true" />
                <p className="text-small font-semibold text-brand">CV read successfully</p>
              </div>

              <div className="p-6 sm:p-7">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-line bg-panel">
                    <FileText size={19} strokeWidth={1.9} className="text-muted" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-h3 font-semibold text-ink">
                      {result.filename}
                    </h2>
                    <p className="mt-1 text-small text-muted">
                      {result.character_count.toLocaleString()} characters read from your{" "}
                      {result.file_type.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[12px] border border-line bg-surface p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.1em] text-muted">
                    What we read
                  </p>
                  <p className="mt-2.5 whitespace-pre-line text-small leading-relaxed text-muted">
                    {result.preview}
                    {result.character_count > result.preview.length && "..."}
                  </p>
                </div>

                <div className="mt-6">
                  <Button to={`/matches/${result.id}`} size="lg" className="w-full sm:w-auto">
                    See your matches
                    <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </Reveal>

        <Reveal delay={90}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-h3 font-semibold text-ink">Your CVs</h2>
            {!listLoading && cvs.length > 0 && (
              <span className="text-small text-muted">{cvs.length} stored</span>
            )}
          </div>

          {listLoading ? (
            <div className="mt-5 space-y-3">
              {[0, 1].map((row) => (
                <div key={row} className="h-20 animate-pulse rounded-[12px] bg-line/40" />
              ))}
            </div>
          ) : listError ? (
            <p className="mt-5 rounded-[12px] border border-accent/30 bg-accent-soft px-4 py-3 text-small text-accent">
              {listError}
            </p>
          ) : cvs.length === 0 ? (
            <Card tone="tint" className="mt-5 p-7 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-panel">
                <UploadCloud size={21} strokeWidth={1.9} className="text-muted" aria-hidden="true" />
              </span>
              <p className="mt-4 font-display text-body font-semibold text-ink">
                No CVs yet
              </p>
              <p className="mt-2 text-small leading-relaxed text-muted">
                Upload one to get started.
              </p>
            </Card>
          ) : (
            <ul className="mt-5 space-y-3">
              {cvs.map((cv) => (
                <li key={cv.id}>
                  <Card className="lift group p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-line bg-brand-tint">
                        <FileText size={17} strokeWidth={1.9} className="text-brand" aria-hidden="true" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-semibold text-ink">
                          {cv.filename}
                        </p>
                        <p className="mt-1 text-micro text-muted">
                          {formatDate(cv.uploaded_at)}
                        </p>
                        <p className="mt-0.5 text-micro text-faint">
                          {cv.character_count.toLocaleString()} characters
                        </p>

                        <div className="mt-3 flex items-center gap-3">
                          <Link
                            to={`/matches/${cv.id}`}
                            className="inline-flex items-center gap-1 text-micro font-semibold text-brand underline underline-offset-4 hover:text-brand-hover"
                          >
                            See matches
                            <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(cv)}
                            className="inline-flex items-center gap-1 text-micro font-medium text-faint transition-colors hover:text-accent"
                          >
                            <Trash2 size={12} strokeWidth={2.25} aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this CV?"
        body={`"${pendingDelete?.filename ?? ""}" and its extracted data will be removed. This cannot be undone.`}
        confirmLabel="Delete CV"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Container>
  );
}
