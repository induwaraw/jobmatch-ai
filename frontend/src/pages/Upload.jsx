import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Container from "../components/ui/Container";
import { api, errorMessage, uploadCv } from "../lib/api";

const ACCEPT = ".pdf,.docx";
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
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [cvs, setCvs] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [result, setResult] = useState(null);

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

    // Checked here too so an obviously wrong file does not need a round trip
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      setUploadError("Please choose a PDF or a DOCX file.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`);
      return;
    }

    setUploading(true);
    try {
      const { data } = await uploadCv(file);
      setResult(data);
      loadCvs();
    } catch (error) {
      // The backend messages are already written for a person to read
      setUploadError(errorMessage(error, "Could not read that file."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <Container className="py-14 lg:py-20">
      <div className="max-w-2xl">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-accent">
          Step one
        </p>
        <h1 className="mt-4 font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
          Upload your CV
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">
          A PDF or DOCX up to {MAX_MB} MB. The text is read out of the file and
          used to work out your skills. Scanned CVs saved as images will not
          work, because there is no text to read.
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <div>
          {/* Drop zone */}
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-[10px] border border-dashed p-10 text-center transition-colors
              ${dragging ? "border-brand bg-brand-soft/50" : "border-line bg-panel"}`}
          >
            <p className="font-display text-lg font-semibold text-ink">
              {dragging ? "Drop it here" : "Drag your CV here"}
            </p>
            <p className="mt-2 text-sm text-muted">PDF or DOCX, up to {MAX_MB} MB</p>

            <div className="mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Reading your CV..." : "Choose a file"}
              </Button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </div>

          {uploadError && (
            <p
              role="alert"
              className="mt-5 rounded-[8px] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
            >
              {uploadError}
            </p>
          )}

          {/* Success confirmation */}
          {result && (
            <Card className="mt-6 p-6 sm:p-7">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">
                Uploaded
              </p>
              <h2 className="mt-3 font-display text-xl font-semibold text-ink">
                {result.filename}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {result.character_count.toLocaleString()} characters of text read
                from your {result.file_type.toUpperCase()}.
              </p>

              <div className="mt-5 rounded-[8px] border border-line bg-surface p-4">
                <p className="text-sm font-medium text-ink">What we read</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
                  {result.preview}
                  {result.character_count > result.preview.length && "..."}
                </p>
              </div>

              <div className="mt-6">
                <Button to={`/matches/${result.id}`} size="lg">
                  See your matches
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Previous uploads */}
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Your CVs
          </h2>

          {listLoading ? (
            <p className="mt-4 text-sm text-muted">Loading...</p>
          ) : listError ? (
            <p className="mt-4 text-sm text-accent">{listError}</p>
          ) : cvs.length === 0 ? (
            <Card className="mt-4 p-6">
              <p className="text-sm leading-relaxed text-muted">
                No CVs yet. Upload one to get started.
              </p>
            </Card>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {cvs.map((cv) => (
                <li key={cv.id}>
                  <Link
                    to={`/matches/${cv.id}`}
                    className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-brand-soft/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.95rem] font-medium text-ink">
                        {cv.filename}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {formatDate(cv.uploaded_at)} ·{" "}
                        {cv.character_count.toLocaleString()} characters
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-brand">Matches</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
}
