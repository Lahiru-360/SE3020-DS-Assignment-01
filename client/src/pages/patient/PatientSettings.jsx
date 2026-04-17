import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import {
  getPatientProfile,
  updatePatientProfile,
} from "../../api/patientService";
import FormInput from "../../components/ui/FormInput";
import Alert from "../../components/ui/Alert";
import Loader from "../../components/ui/Loader";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
};

//  Component

export default function PatientSettings() {
  const { userId, userEmail } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [savedProfile, setSavedProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  //  Load profile on mount

  useEffect(() => {
    setLoading(true);
    getPatientProfile()
      .then((res) => {
        const p = res.data?.data ?? {};
        const profile = {
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          phone: p.phone ?? "",
        };
        setForm(profile);
        setSavedProfile(profile);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message ?? err?.message ?? "Unknown error";
        console.error(
          "[PatientSettings] Failed to load profile:",
          err?.response?.status,
          msg,
        );
        setError(`Could not load your profile: ${msg}`);
      })
      .finally(() => setLoading(false));
  }, []);

  //  Handlers

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  //  Validation

  const validate = () => {
    const errs = {};
    const nameRe = /^[a-zA-Z\s'-]+$/;
    const phoneRe = /^\d{10}$/;

    if (form.firstName) {
      if (!nameRe.test(form.firstName))
        errs.firstName =
          "First name may only contain letters, spaces, hyphens, or apostrophes.";
      else if (form.firstName.length > 50)
        errs.firstName = "First name must not exceed 50 characters.";
    }
    if (form.lastName) {
      if (!nameRe.test(form.lastName))
        errs.lastName =
          "Last name may only contain letters, spaces, hyphens, or apostrophes.";
      else if (form.lastName.length > 50)
        errs.lastName = "Last name must not exceed 50 characters.";
    }
    if (form.phone && !phoneRe.test(form.phone)) {
      errs.phone = "Enter a valid 10-digit phone number.";
    }

    return errs;
  };

  //  Submit

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    // Build payload with only non-empty fields (backend requires at least one)
    const payload = {};
    if (form.firstName.trim()) payload.firstName = form.firstName.trim();
    if (form.lastName.trim()) payload.lastName = form.lastName.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();

    if (Object.keys(payload).length === 0) {
      setError("Please fill in at least one field to update.");
      return;
    }

    setSaving(true);
    try {
      const res = await updatePatientProfile(payload);
      const updated = res.data?.data ?? {};
      const next = {
        firstName: updated.firstName ?? form.firstName,
        lastName: updated.lastName ?? form.lastName,
        phone: updated.phone ?? form.phone,
      };
      setForm(next);
      setSavedProfile(next);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Profile & Settings
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Keep your profile up to date for the platform.
        </p>
      </div>

      {/* ── Feedback ──────────────────────────────────────── */}
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* ── Account info (read-only) ───────────────────────── */}
      <div className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Account</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-text-muted mb-0.5">First Name</p>
            <p className="text-sm text-text-primary">
              {savedProfile.firstName || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-0.5">Last Name</p>
            <p className="text-sm text-text-primary">
              {savedProfile.lastName || "—"}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-0.5">Phone</p>
          <p className="text-sm text-text-primary">
            {savedProfile.phone || "—"}
          </p>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-xs text-text-muted mb-0.5">Email</p>
          <p className="text-sm text-text-primary">{userEmail ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-0.5">User ID</p>
          <p className="text-xs font-mono text-text-muted break-all">
            {userId ?? "—"}
          </p>
        </div>
      </div>

      {/* ── Profile form ──────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-xl border border-border bg-bg-card p-5 space-y-5"
      >
        <h2 className="text-sm font-semibold text-text-primary">
          Profile Information
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            id="patient-firstName"
            label="First Name"
            value={form.firstName}
            onChange={handleChange("firstName")}
            placeholder="e.g. Samantha"
            error={fieldErrors.firstName}
          />
          <FormInput
            id="patient-lastName"
            label="Last Name"
            value={form.lastName}
            onChange={handleChange("lastName")}
            placeholder="e.g. Perera"
            error={fieldErrors.lastName}
          />
        </div>

        <FormInput
          id="patient-phone"
          label="Phone Number"
          type="tel"
          value={form.phone}
          onChange={handleChange("phone")}
          placeholder="e.g. +94 77 123 4567"
          error={fieldErrors.phone}
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
