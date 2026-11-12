"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, FilePlus2, ImagePlus, ShieldCheck, Trash2 } from "lucide-react";
import { submitCandidateApplication } from "@/app/vote/actions";
import { getPositionColors } from "@/lib/position-colors";
import type {
  CandidateApplicationState,
  CandidatePositionOption,
} from "@/lib/candidate-types";

const initialState: CandidateApplicationState = { error: null, success: false };
const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function ProfilePhotoUpload({ disabled }: { disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleFile(file: File | undefined) {
    setUploadError(null);
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setUploadError("This photo is larger than 2 MB. Choose a smaller image.");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    if (file.type && !PROFILE_PHOTO_TYPES.includes(file.type)) {
      setUploadError("This file type is not supported. Choose a JPEG, PNG, or WebP photo.");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function removeFile() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
  }

  return (
    <div className="mt-4">
      <label
        htmlFor="candidate-profile-photo"
        className={`block rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 transition ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50"
        }`}
      >
        <input
          ref={inputRef}
          id="candidate-profile-photo"
          className="peer sr-only"
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          aria-describedby="profile-photo-help"
          onChange={(event) => handleFile(event.currentTarget.files?.[0])}
        />
        <span className="flex items-center gap-3 rounded-lg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200">
            <ImagePlus className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-slate-800">
              {selectedFile ? "Change profile photo" : "Upload a profile photo"}
            </span>
          </span>
          <span className="inline-flex h-9 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
            Browse files
          </span>
        </span>
      </label>

      <p id="profile-photo-help" className="mt-2 text-[11px] leading-4 text-slate-500">
        Optional · JPG, PNG, or WebP · maximum 2 MB
      </p>

      {selectedFile && previewUrl ? (
        <div aria-live="polite" className="mt-3 flex min-w-0 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <Image
            src={previewUrl}
            alt="Selected profile photo preview"
            width={56}
            height={56}
            unoptimized
            className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-emerald-900/10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-800" title={selectedFile.name}>
              {selectedFile.name}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {selectedFile.size < 1024 * 1024
                ? `${Math.round(selectedFile.size / 1024)} KB`
                : `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}{" "}
              · Ready to upload
            </p>
          </div>
          <button
            type="button"
            onClick={removeFile}
            disabled={disabled}
            aria-label="Remove selected profile photo"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-red-700 disabled:cursor-not-allowed"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : null}

      {uploadError ? (
        <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}

export default function CandidateApplicationForm({
  positions,
  unavailable,
}: {
  positions: CandidatePositionOption[];
  unavailable: boolean;
}) {
  const [state, action, pending] = useActionState(
    submitCandidateApplication,
    initialState,
  );
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const selectedPosition = positions.find(
    (position) => position.id === selectedPositionId,
  );
  const selectedPositionColors = selectedPosition
    ? getPositionColors(selectedPosition.title)
    : null;
  const disabled = unavailable || positions.length === 0 || pending;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
      <form
        action={action}
        aria-describedby={
          unavailable || positions.length === 0
            ? "candidate-availability"
            : undefined
        }
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.03] sm:p-7"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
            <FilePlus2 className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-950">
              Apply as a candidate
            </h3>
          </div>
        </div>

        {unavailable || positions.length === 0 ? (
          <p
            id="candidate-availability"
            role="status"
            className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900"
          >
            {unavailable
              ? "Available positions are temporarily unavailable because election data could not be loaded."
              : "Candidate applications are not available right now. Administrators can add positions for upcoming elections."}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-700">
            Full name
            <input
              autoComplete="name"
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-50"
              name="name"
              required
              minLength={2}
              maxLength={120}
              disabled={disabled}
              placeholder="e.g. Ama Serwaa Mensah"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Position
            <select
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-50"
              name="positionId"
              required
              defaultValue=""
              disabled={disabled}
              onChange={(event) => setSelectedPositionId(event.currentTarget.value)}
            >
              <option value="" disabled>
                Select a position
              </option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.title}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-[11px] leading-4 text-slate-500">
              Select the position you are applying for. Other candidates may apply for this same position.
            </span>
            {selectedPosition && selectedPositionColors ? (
              <span
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold"
                style={selectedPositionColors.badge}
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full"
                  style={{
                    backgroundColor: selectedPositionColors.accentColor,
                  }}
                />
                {selectedPosition.title}
              </span>
            ) : null}
          </label>
          <label className="text-xs font-medium text-slate-700">
            Email address
            <input
              autoComplete="email"
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-50"
              name="email"
              type="email"
              required
              maxLength={254}
              disabled={disabled}
              placeholder="e.g. ama.mensah@example.com"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Phone number
            <input
              autoComplete="tel"
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-50"
              name="phone"
              type="tel"
              required
              maxLength={32}
              disabled={disabled}
              placeholder="e.g. +233 24 123 4567"
            />
          </label>
        </div>

        <ProfilePhotoUpload disabled={disabled} />

        <label className="mt-4 flex items-start gap-2.5 text-xs leading-5 text-slate-600">
          <input
            className="mt-1 size-4 shrink-0 accent-emerald-800"
            name="consent"
            type="checkbox"
            required
            disabled={disabled}
          />
          <span>
            I agree that election administrators may use these details to
            contact me and review my candidate application. If approved, I understand
            that my name and profile photo (if provided) will be shown to voters.
          </span>
        </label>

        {state.error ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-800"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-900"
            role="status"
          >
            Your candidate application has been received for review. Your
            profile will be shown to voters only if an administrator approves it.
          </p>
        ) : null}
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          type="submit"
          disabled={disabled}
        >
          {pending ? "Submitting…" : "Submit for review"}
          {!pending && <ArrowRight className="size-4" />}
        </button>
      </form>

      <aside className="h-fit self-start rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <span className="flex size-10 items-center justify-center rounded-xl bg-white text-emerald-800 ring-1 ring-slate-200">
          <ShieldCheck className="size-5" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-slate-900">
          Review before publication
        </h3>
        <ol className="mt-4 space-y-4">
          {[
            ["01", "Choose a form", "Select an available position for a scheduled election."],
            ["02", "Submit your details", "An administrator will review your contact details and eligibility."],
            ["03", "Wait for approval", "Only approved candidates are shown in the voter portal."],
          ].map(([number, title, description]) => (
            <li key={number} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-semibold text-emerald-800 ring-1 ring-slate-200">
                {number}
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-800">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
