import { useState } from "react";
import {
  createPrescription,
  updatePrescription,
} from "../../api/doctorService";
import FormInput from "../../components/ui/FormInput";
import Alert from "../../components/ui/Alert";

// ── Helpers ────────────────────────────────────────────────────────────────

const emptyMedication = () => ({
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
});

// ── Component ──────────────────────────────────────────────────────────────
//
// Props:
//   appointmentId  — required; links prescription to the appointment
//   doctorId       — required; the logged-in doctor's userId
//   patientId      — required; from the appointment object
//   existing       — null for create; Prescription object for edit
//   onSaved(prescription) — called after a successful save with the saved object
//   onCancel()     — called when the user dismisses the form

export default function PrescriptionForm({
  appointmentId,
  doctorId,
  patientId,
  existing,
  onSaved,
  onCancel,
}) {
  const isEdit = !!existing;

  const [diagnosis, setDiagnosis] = useState(existing?.diagnosis ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [medications, setMedications] = useState(
    existing?.medications?.length
      ? existing.medications.map((m) => ({ ...m }))
      : [emptyMedication()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Medication helpers ─────────────────────────────────────────────────

  const updateMed = (idx, field, value) => {
    setMedications((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addMedication = () =>
    setMedications((prev) => [...prev, emptyMedication()]);

  const removeMedication = (idx) =>
    setMedications((prev) => prev.filter((_, i) => i !== idx));

  // ── Validation ─────────────────────────────────────────────────────────

  const validate = () => {
    if (!diagnosis.trim()) return "Diagnosis is required.";
    for (let i = 0; i < medications.length; i++) {
      const m = medications[i];
      const n = i + 1;
      if (!m.name.trim()) return `Medication ${n}: Name is required.`;
      if (!m.dosage.trim()) return `Medication ${n}: Dosage is required.`;
      if (!m.frequency.trim()) return `Medication ${n}: Frequency is required.`;
      if (!m.duration.trim()) return `Medication ${n}: Duration is required.`;
    }
    return null;
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const medPayload = medications.map((m) => ({
      name: m.name.trim(),
      dosage: m.dosage.trim(),
      frequency: m.frequency.trim(),
      duration: m.duration.trim(),
    }));

    setSaving(true);
    try {
      if (isEdit) {
        const payload = {
          diagnosis: diagnosis.trim(),
          medications: medPayload,
        };
        // Only include notes in the update if it has a value; omitting it
        // leaves the existing notes field unchanged on the backend.
        if (notes.trim()) payload.notes = notes.trim();
        const res = await updatePrescription(existing._id, payload);
        onSaved(res.data?.data ?? existing);
      } else {
        const payload = {
          doctorId,
          patientId,
          appointmentId,
          diagnosis: diagnosis.trim(),
          medications: medPayload,
        };
        if (notes.trim()) payload.notes = notes.trim();
        const res = await createPrescription(payload);
        onSaved(res.data?.data);
      }
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to save prescription.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && <Alert type="error">{error}</Alert>}

      {/* Diagnosis */}
      <FormInput
        id="presc-diagnosis"
        label="Diagnosis"
        value={diagnosis}
        onChange={(e) => setDiagnosis(e.target.value)}
        placeholder="e.g. Acute viral upper respiratory infection"
        required
      />

      {/* Notes */}
      <div>
        <label
          htmlFor="presc-notes"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Notes <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <textarea
          id="presc-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional instructions or observations for the patient…"
          rows={3}
          className="
            w-full px-4 py-2.5 rounded-lg text-sm resize-none
            bg-bg-main text-text-primary border border-border
            placeholder:text-text-muted
            focus:outline-none focus:border-primary
          "
        />
      </div>

      {/* Medications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text-primary">Medications</p>
          <button
            type="button"
            onClick={addMedication}
            className="text-xs font-medium text-primary hover:underline"
          >
            + Add Medication
          </button>
        </div>

        <div className="space-y-4">
          {medications.map((med, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border bg-bg-main p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Medication {idx + 1}
                </span>
                {medications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedication(idx)}
                    className="text-xs font-medium text-error hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  id={`med-name-${idx}`}
                  label="Name"
                  value={med.name}
                  onChange={(e) => updateMed(idx, "name", e.target.value)}
                  placeholder="e.g. Paracetamol"
                  required
                />
                <FormInput
                  id={`med-dosage-${idx}`}
                  label="Dosage"
                  value={med.dosage}
                  onChange={(e) => updateMed(idx, "dosage", e.target.value)}
                  placeholder="e.g. 500 mg"
                  required
                />
                <FormInput
                  id={`med-frequency-${idx}`}
                  label="Frequency"
                  value={med.frequency}
                  onChange={(e) => updateMed(idx, "frequency", e.target.value)}
                  placeholder="e.g. Twice daily"
                  required
                />
                <FormInput
                  id={`med-duration-${idx}`}
                  label="Duration"
                  value={med.duration}
                  onChange={(e) => updateMed(idx, "duration", e.target.value)}
                  placeholder="e.g. 5 days"
                  required
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-bg-main transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {saving
            ? "Saving…"
            : isEdit
              ? "Update Prescription"
              : "Create Prescription"}
        </button>
      </div>
    </form>
  );
}
