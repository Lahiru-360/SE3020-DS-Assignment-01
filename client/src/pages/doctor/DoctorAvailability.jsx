import { useEffect, useState, useCallback } from "react";
import { todayInTZ, addDaysInTZ, isPastDate } from "../../utils/timezone";
import { useAuth } from "../../context/useAuth";
import {
  getDoctorAvailability,
  addDoctorAvailability,
  editDoctorAvailabilitySlot,
  deleteDoctorAvailabilitySlot,
} from "../../api/doctorService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

// ── Time constants (mirrors backend availabilityService.js) ───────────────

const HOURS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];
const MORNING_INDEXES = [0, 1, 2, 3, 4, 5];
const EVENING_INDEXES = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

const slotLabel = (idx) => `${HOURS[idx]}–${HOURS[idx + 1]}`;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// todayStr / maxDateStr use the app timezone (Asia/Colombo by default).
// See src/utils/timezone.js — change VITE_TIMEZONE in client/.env to adjust.
const todayStr = () => todayInTZ();
const maxDateStr = () => addDaysInTZ(7);

// Are the provided indexes a set of sequential consecutive integers?
function areConsecutive(indexes) {
  if (!indexes.length) return false;
  const sorted = [...indexes].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

// Get indexes for a phase from timeslots array
function getIndexesForPhase(timeslots, phase) {
  return timeslots
    .filter((s) => s.phase === phase)
    .map((s) => HOURS.indexOf(s.startTime))
    .sort((a, b) => a - b);
}

// ── Slot selector ──────────────────────────────────────────────────────────
// Renders a grid of toggleable hour-slot buttons for the given phase.

function SlotSelector({ phase, selected, onChange }) {
  const indexes = phase === "morning" ? MORNING_INDEXES : EVENING_INDEXES;

  // Toggle: add if absent, remove if present. Multiple consecutive slots allowed.
  const toggle = (idx) => {
    const next = selected.includes(idx)
      ? selected.filter((i) => i !== idx)
      : [...selected, idx].sort((a, b) => a - b);
    onChange(next);
  };

  const isConsecutiveWarning = selected.length > 1 && !areConsecutive(selected);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mt-2">
        {indexes.map((idx) => {
          const isActive = selected.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx)}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                isActive
                  ? "bg-primary text-white border-primary"
                  : "bg-bg-main text-text-secondary border-border hover:border-primary hover:text-primary",
              ].join(" ")}
            >
              {slotLabel(idx)}
            </button>
          );
        })}
      </div>
      {isConsecutiveWarning && (
        <p className="mt-1.5 text-xs text-error">
          Selected slots must be consecutive hours.
        </p>
      )}
    </div>
  );
}

// ── Phase section ────────────────────────────────────────────────────────
// Declared at module scope to satisfy the no-components-during-render rule.

function PhaseSection({ phase, indexes, onChange }) {
  return (
    <div className="rounded-lg bg-bg-main border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={[
            "text-xs font-semibold uppercase tracking-wide",
            phase === "morning" ? "text-primary" : "text-accent",
          ].join(" ")}
        >
          {phase}
        </span>
        <span className="text-xs text-text-muted">
          {phase === "morning" ? "06:00–12:00" : "12:00–22:00"}
        </span>
      </div>
      <p className="text-xs text-text-muted mb-1">
        Select one or more consecutive time slots.
      </p>
      <SlotSelector phase={phase} selected={indexes} onChange={onChange} />
    </div>
  );
}

// ── Existing-phase read-only display ──────────────────────────────────────
// Shows a phase that is already saved so the doctor knows it's occupied.

function ExistingPhaseDisplay({ phase, slot }) {
  return (
    <div className="rounded-lg bg-bg-main border border-border p-3 opacity-80">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={[
            "text-xs font-semibold uppercase tracking-wide",
            phase === "morning" ? "text-primary" : "text-accent",
          ].join(" ")}
        >
          {phase}
        </span>
        <span className="text-xs text-text-muted">
          {phase === "morning" ? "06:00–12:00" : "12:00–22:00"}
        </span>
        <span className="ml-auto text-xs font-semibold text-success">
          Already set
        </span>
      </div>
      <span className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-success-bg text-success">
        {slot.startTime}–{slot.endTime}
      </span>
      <p className="mt-1.5 text-xs text-text-muted">
        Use the <span className="font-medium">Edit</span> button to change this
        slot.
      </p>
    </div>
  );
}

// ── Add / Edit modal ───────────────────────────────────────────────────────

function AvailabilityModal({
  mode, // "add" | "edit"
  initialDate,
  initialPhase, // only used in edit mode
  initialIndexes, // only used in edit mode
  existingDocs, // full availability array, used in add mode to detect occupied phases
  onSave,
  onClose,
  saving,
  saveError,
}) {
  const isEdit = mode === "edit";

  const [date, setDate] = useState(initialDate ?? todayStr());

  // Phase-keyed slot state. In edit mode only the relevant phase is pre-filled.
  // Each phase supports multiple consecutive indexes.
  const [morningIndexes, setMorningIndexes] = useState(
    isEdit && initialPhase === "morning" ? (initialIndexes ?? []) : [],
  );
  const [eveningIndexes, setEveningIndexes] = useState(
    isEdit && initialPhase === "evening" ? (initialIndexes ?? []) : [],
  );

  // Reset selection when doctor changes the date in add mode.
  useEffect(() => {
    if (!isEdit) {
      setMorningIndexes([]);
      setEveningIndexes([]);
    }
  }, [date, isEdit]);

  // ── Existing-phase detection (add mode only) ──────────────────
  const existingDoc = !isEdit
    ? (existingDocs?.find((d) => d.date === date) ?? null)
    : null;
  const existingMorning =
    existingDoc?.timeslots.find((s) => s.phase === "morning") ?? null;
  const existingEvening =
    existingDoc?.timeslots.find((s) => s.phase === "evening") ?? null;
  const bothPhasesExist = !isEdit && existingMorning && existingEvening;

  // ── Derived ────────────────────────────────────────────────────

  // A phase is valid when it has at least one slot AND all selected slots are consecutive.
  const isValidPhase = (idxs) =>
    idxs.length === 0 || idxs.length === 1 || areConsecutive(idxs);

  // Edit: only the locked phase must be non-empty and consecutive.
  // Add: at least one NEW phase must be filled, and every filled phase must be
  // consecutive. Phases already set on this date cannot be added again.
  const canSave = isEdit
    ? (() => {
        const idxs =
          initialPhase === "morning" ? morningIndexes : eveningIndexes;
        return idxs.length > 0 && isValidPhase(idxs);
      })()
    : !bothPhasesExist &&
      ((!existingMorning && morningIndexes.length > 0) ||
        (!existingEvening && eveningIndexes.length > 0)) &&
      isValidPhase(morningIndexes) &&
      isValidPhase(eveningIndexes);

  const handleSave = () => {
    if (isEdit) {
      const indexes =
        initialPhase === "morning" ? morningIndexes : eveningIndexes;
      onSave({ date, phase: initialPhase, indexes });
    } else {
      // Only include phases that are not already saved for this date.
      const slots = [];
      if (!existingMorning && morningIndexes.length)
        slots.push({ phase: "morning", indexes: morningIndexes });
      if (!existingEvening && eveningIndexes.length)
        slots.push({ phase: "evening", indexes: eveningIndexes });
      onSave({ date, slots });
    }
  };

  // ── Shared close button ────────────────────────────────────────

  const CloseBtn = (
    <button
      type="button"
      onClick={onClose}
      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary transition-colors"
      aria-label="Close"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-bg-card rounded-2xl border border-border shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? "Edit Availability Slot" : "Add Availability"}
          </h2>
          {CloseBtn}
        </div>

        {saveError && <Alert type="error">{saveError}</Alert>}

        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              min={todayStr()}
              max={maxDateStr()}
              onChange={(e) => setDate(e.target.value)}
              disabled={isEdit}
              className="
                w-full px-4 py-2.5 rounded-lg text-sm
                bg-bg-main text-text-primary border border-border
                focus:outline-none focus:border-primary
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            />
            <p className="mt-1 text-xs text-text-muted">
              You can schedule availability up to 7 days in advance.
            </p>
          </div>

          {/* ── Add mode: show both phases, respecting existing slots ─── */}
          {!isEdit && (
            <>
              {existingMorning ? (
                <ExistingPhaseDisplay phase="morning" slot={existingMorning} />
              ) : (
                <PhaseSection
                  phase="morning"
                  indexes={morningIndexes}
                  onChange={setMorningIndexes}
                />
              )}
              {existingEvening ? (
                <ExistingPhaseDisplay phase="evening" slot={existingEvening} />
              ) : (
                <PhaseSection
                  phase="evening"
                  indexes={eveningIndexes}
                  onChange={setEveningIndexes}
                />
              )}
              {bothPhasesExist && (
                <p className="text-xs text-text-muted text-center">
                  Both slots are already set for this date. Select a different
                  date or use <span className="font-medium">Edit</span> to
                  modify existing slots.
                </p>
              )}
            </>
          )}

          {/* ── Edit mode: show only the locked phase ──────── */}
          {isEdit && (
            <PhaseSection
              phase={initialPhase}
              indexes={
                initialPhase === "morning" ? morningIndexes : eveningIndexes
              }
              onChange={
                initialPhase === "morning"
                  ? setMorningIndexes
                  : setEveningIndexes
              }
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-bg-main transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Slots"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DoctorAvailability() {
  const { userId } = useAuth();

  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal state
  const [modal, setModal] = useState(null); // null | {mode, date?, phase?, indexes?}
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Delete in-progress state: null | {date, phase}
  const [deleting, setDeleting] = useState(null);
  // Pending removal awaiting doctor confirmation: null | {date, phase}
  const [pendingDelete, setPendingDelete] = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchAvailability = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    getDoctorAvailability(userId)
      .then((res) => setAvailability(res.data?.data ?? []))
      .catch((err) =>
        setError(err.response?.data?.message ?? "Failed to load availability."),
      )
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // ── Modal helpers ────────────────────────────────────────────────────────

  const openAdd = () => {
    setSaveError("");
    setModal({ mode: "add" });
  };

  const openEdit = (date, phase, timeslots) => {
    setSaveError("");
    const indexes = getIndexesForPhase(timeslots, phase);
    setModal({ mode: "edit", date, phase, indexes });
  };

  const closeModal = () => {
    if (!saving) setModal(null);
  };

  // ── Save (add or edit) ───────────────────────────────────────────────────
  //
  // Add mode receives: { date, slots: [{phase, indexes}, ...] }
  // Edit mode receives: { date, phase, indexes }

  const handleSave = async ({ date, phase, indexes, slots }) => {
    setSaving(true);
    setSaveError("");
    try {
      if (modal.mode === "add") {
        await addDoctorAvailability({ date, slots });
        setSuccess("Availability added successfully.");
      } else {
        await editDoctorAvailabilitySlot(userId, date, phase, { indexes });
        setSuccess("Availability updated successfully.");
      }
      setModal(null);
      fetchAvailability();
    } catch (err) {
      setSaveError(
        err.response?.data?.message ?? "Failed to save availability.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (date, phase) => {
    setDeleting({ date, phase });
    setError("");
    try {
      await deleteDoctorAvailabilitySlot(userId, date, phase);
      setSuccess("Availability slot removed.");
      fetchAvailability();
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to delete slot.");
    } finally {
      setDeleting(null);
      setPendingDelete(null);
    }
  };

  // Asks for confirmation before deleting
  const requestDelete = (date, phase) => setPendingDelete({ date, phase });

  // ── Render ───────────────────────────────────────────────────────────────

  // Group timeslots by phase within each availability doc
  const renderAvailabilityCard = (avail) => {
    const phases = ["morning", "evening"];
    return (
      <div
        key={avail._id ?? avail.date}
        className="rounded-xl border border-border bg-bg-card p-4"
      >
        <p className="text-sm font-semibold text-text-primary mb-3">
          {formatDate(avail.date)}
          <span className="ml-2 text-xs font-normal text-text-muted">
            {avail.date}
          </span>
        </p>

        <div className="space-y-3">
          {phases.map((phase) => {
            const slots = avail.timeslots.filter((s) => s.phase === phase);
            if (!slots.length) return null;

            const isDeletingThis =
              deleting?.date === avail.date && deleting?.phase === phase;

            return (
              <div
                key={phase}
                className="rounded-lg bg-bg-main border border-border p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={[
                      "text-xs font-semibold uppercase tracking-wide",
                      phase === "morning" ? "text-primary" : "text-accent",
                    ].join(" ")}
                  >
                    {phase}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEdit(avail.date, phase, avail.timeslots)
                      }
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(avail.date, phase)}
                      disabled={!!deleting}
                      className="text-xs font-medium text-error hover:underline disabled:opacity-50"
                    >
                      {isDeletingThis ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {slots.map((slot, i) => {
                    const isBooked = slot.isBooked;
                    return (
                      <span
                        key={i}
                        className={[
                          "inline-block rounded-full px-3 py-1 text-xs font-medium",
                          isBooked
                            ? "bg-warning-bg text-warning"
                            : "bg-success-bg text-success",
                        ].join(" ")}
                      >
                        {slot.startTime}–{slot.endTime}
                        {isBooked && " · Booked"}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Sort availability by date ascending and hide past dates.
  // Past-date entries shouldn't normally exist (backend rejects them) but
  // can linger if the server was running in a different timezone or from
  // older data. Hiding them on the frontend prevents accidental edits.
  const sorted = [...availability]
    .filter((a) => !isPastDate(a.date))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Availability
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Manage your consultation schedule.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Add Availability
        </button>
      </div>

      {/* ── Feedback ──────────────────────────────────────── */}
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* ── Content ───────────────────────────────────────── */}
      {loading ? (
        <div className="py-20">
          <Loader />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card px-6 py-12 text-center">
          <p className="text-text-muted text-sm mb-3">
            No availability scheduled yet.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Add Your First Slot
          </button>
        </div>
      ) : (
        <div className="space-y-4">{sorted.map(renderAvailabilityCard)}</div>
      )}

      {/* ── Add / Edit modal ──────────────────────────────── */}
      {modal && (
        <AvailabilityModal
          mode={modal.mode}
          initialDate={modal.date}
          initialPhase={modal.phase}
          initialIndexes={modal.indexes}
          existingDocs={availability}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          saveError={saveError}
        />
      )}

      {/* Remove availability confirmation dialog */}
      <ConfirmDialog
        open={!!pendingDelete}
        icon="warning"
        title="Remove Availability Slot?"
        message={`This will permanently remove the ${pendingDelete?.phase} slots for ${pendingDelete?.date}. Any unbooked slots will be deleted. Already-booked appointments are not affected.`}
        confirmLabel="Yes, Remove"
        cancelLabel="Keep It"
        loading={!!deleting}
        onConfirm={() => handleDelete(pendingDelete.date, pendingDelete.phase)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
