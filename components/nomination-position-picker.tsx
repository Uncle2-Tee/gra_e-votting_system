"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  MAX_ELECTION_POSITIONS,
  MAX_POSITION_TITLE_LENGTH,
  NOMINATION_POSITION_OPTIONS,
} from "@/lib/nomination-positions";

export default function NominationPositionPicker({
  id,
  positions,
  onChange,
  existingPositions = [],
}: {
  id: string;
  positions: string[];
  onChange: (positions: string[]) => void;
  existingPositions?: string[];
}) {
  const [customPosition, setCustomPosition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const positionLimit = Math.max(
    0,
    MAX_ELECTION_POSITIONS - existingPositions.length,
  );
  const selectedNames = new Set(
    [...positions, ...existingPositions].map((position) =>
      position.toLocaleLowerCase("en"),
    ),
  );
  const availablePositions = NOMINATION_POSITION_OPTIONS.filter(
    (position) => !selectedNames.has(position.toLocaleLowerCase("en")),
  );

  function addCustomPosition() {
    const position = customPosition.trim().normalize("NFKC");
    const normalizedName = position.toLocaleLowerCase("en");
    if (!position) {
      setError("Enter a position name.");
      return;
    }
    if (position.length > MAX_POSITION_TITLE_LENGTH) {
      setError(`Position names must be ${MAX_POSITION_TITLE_LENGTH} characters or fewer.`);
      return;
    }
    if (selectedNames.has(normalizedName)) {
      setError("That position has already been selected.");
      return;
    }
    if (positions.length >= positionLimit) {
      setError(`An election can have at most ${MAX_ELECTION_POSITIONS} positions.`);
      return;
    }

    onChange([...positions, position]);
    setCustomPosition("");
    setError(null);
  }

  return (
    <div className="space-y-2">
      {availablePositions.length > 0 && positions.length < positionLimit ? (
        <select
          id={`position-select-${id}`}
          aria-label="Select a standard nomination position"
          aria-describedby={id === "create-election" ? "voting-positions-help" : undefined}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
          value=""
          onChange={(event) => {
            const position = event.target.value;
            if (position) {
              onChange([...positions, position]);
              setError(null);
            }
          }}
        >
          <option value="">Select a position (e.g. President)</option>
          {availablePositions.map((position) => (
            <option key={position} value={position}>
              {position}
            </option>
          ))}
        </select>
      ) : null}
      {positions.length < positionLimit ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`custom-position-${id}`}
            aria-label="New nomination position name"
            aria-describedby={id === "create-election" ? "voting-positions-help" : undefined}
            required={positions.length === 0}
            className="h-10 min-w-0 w-full flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            value={customPosition}
            maxLength={MAX_POSITION_TITLE_LENGTH}
            placeholder="e.g. Communications Director"
            onChange={(event) => {
              setCustomPosition(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomPosition();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustomPosition}
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-800/20 bg-white px-3 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:w-auto"
          >
            <Plus className="size-3.5" />
            Add
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          This election has reached the {MAX_ELECTION_POSITIONS}-position limit.
        </p>
      )}
      {positions.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {positions.map((position) => (
            <li
              key={position}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-900"
            >
              {position}
              <button
                type="button"
                aria-label={`Delete ${position} from this selection`}
                onClick={() =>
                  onChange(positions.filter((selected) => selected !== position))
                }
                className="flex size-6 items-center justify-center rounded-full text-emerald-800 hover:bg-emerald-100"
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {positions.map((position) => (
        <input key={position} type="hidden" name="positions" value={position} />
      ))}
      {error ? (
        <p role="alert" className="text-[11px] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
