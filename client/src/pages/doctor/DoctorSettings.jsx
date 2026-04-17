import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { getDoctorProfile, updateDoctorProfile } from "../../api/doctorService";
import FormInput from "../../components/ui/FormInput";
import Alert from "../../components/ui/Alert";
import Loader from "../../components/ui/Loader";
import StatusBadge from "../../components/ui/StatusBadge";

// ── Constants ──────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  specialization: "",
  licenseNumber: "",
  consultationFee: "",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function DoctorSettings() {
  const { userId, userEmail } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Load profile on mount ────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getDoctorProfile(userId)
      .then((res) => {
        const d = res.data?.data ?? {};
        setForm({
          firstName: d.firstName ?? "",
          lastName: d.lastName ?? "",
          phone: d.phone ?? "",
          specialization: d.specialization ?? "",
          licenseNumber: d.licenseNumber ?? "",
          consultationFee:
            d.consultationFee != null ? String(d.consultationFee) : "",
        });
        setIsApproved(!!d.isApproved);
      })
      .catch(() => {
        // Profile not found yet (new doctor) — keep blank form, not an error
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Field change ─────────────────────────────────────────────────────────

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // ── Validation ───────────────────────────────────────────────────────────

  const validate = () => {
    const errs = {};
    const nameRe = /^[a-zA-Z\s'-]+$/;
    const licenseRe = /^[a-zA-Z0-9\-/]+$/;

    if (form.firstName && !nameRe.test(form.firstName)) {
      errs.firstName =
        "First name may only contain letters, spaces, hyphens, or apostrophes.";
    }
    if (form.firstName && form.firstName.length > 50) {
      errs.firstName = "First name must not exceed 50 characters.";
    }
    if (form.lastName && !nameRe.test(form.lastName)) {
      errs.lastName =
        "Last name may only contain letters, spaces, hyphens, or apostrophes.";
    }
    if (form.lastName && form.lastName.length > 50) {
      errs.lastName = "Last name must not exceed 50 characters.";
    }
    if (form.specialization && form.specialization.length > 100) {
      errs.specialization = "Specialization must not exceed 100 characters.";
    }
    if (form.licenseNumber && !licenseRe.test(form.licenseNumber)) {
      errs.licenseNumber =
        "License number must be alphanumeric (hyphens and slashes allowed).";
    }
    if (form.licenseNumber && form.licenseNumber.length > 50) {
      errs.licenseNumber = "License number must not exceed 50 characters.";
    }
    if (form.consultationFee !== "") {
      const fee = parseFloat(form.consultationFee);
      if (isNaN(fee) || fee < 0) {
        errs.consultationFee = "Consultation fee must be 0 or more.";
      }
    }
    return errs;
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    // Build payload with only non-empty fields (all optional on update)
    const payload = {};
    if (form.firstName.trim()) payload.firstName = form.firstName.trim();
    if (form.lastName.trim()) payload.lastName = form.lastName.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.specialization.trim())
      payload.specialization = form.specialization.trim();
    if (form.licenseNumber.trim())
      payload.licenseNumber = form.licenseNumber.trim();
    if (form.consultationFee !== "")
      payload.consultationFee = parseFloat(form.consultationFee);

    if (!Object.keys(payload).length) {
      setError("Please fill in at least one field to update.");
      return;
    }

    setSaving(true);
    try {
      const res = await updateDoctorProfile(userId, payload);
      const updated = res.data?.data ?? {};
      setForm({
        firstName: updated.firstName ?? form.firstName,
        lastName: updated.lastName ?? form.lastName,
        phone: updated.phone ?? form.phone,
        specialization: updated.specialization ?? form.specialization,
        licenseNumber: updated.licenseNumber ?? form.licenseNumber,
        consultationFee:
          updated.consultationFee != null
            ? String(updated.consultationFee)
            : form.consultationFee,
      });
      setIsApproved(!!updated.isApproved);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Profile & Settings
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Keep your profile up to date for patients and the platform.
          </p>
        </div>
        <StatusBadge status={isApproved ? "approved" : "pending"} />
      </div>

      {/* ── Feedback ──────────────────────────────────────── */}
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* ── Account info (read-only) ───────────────────────── */}
      <div className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Account</h2>
        <div>
          <p className="text-xs text-text-muted mb-0.5">Email</p>
          <p className="text-sm text-text-primary">{userEmail ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-0.5">User ID</p>
          <p className="text-xs font-mono text-text-muted break-all">
            {userId ?? "—"}
          </p>
        </div>
        {!isApproved && (
          <div className="rounded-lg bg-warning-bg border border-warning/30 px-3 py-2 text-xs text-warning">
            Your account is pending admin approval. Some features may be
            restricted until approved.
          </div>
        )}
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
            id="firstName"
            label="First Name"
            value={form.firstName}
            onChange={handleChange("firstName")}
            placeholder="Jane"
            error={fieldErrors.firstName}
          />
          <FormInput
            id="lastName"
            label="Last Name"
            value={form.lastName}
            onChange={handleChange("lastName")}
            placeholder="Smith"
            error={fieldErrors.lastName}
          />
        </div>

        <FormInput
          id="phone"
          label="Phone Number"
          type="tel"
          value={form.phone}
          onChange={handleChange("phone")}
          placeholder="+94 77 123 4567"
          error={fieldErrors.phone}
        />

        <FormInput
          id="specialization"
          label="Specialization"
          value={form.specialization}
          onChange={handleChange("specialization")}
          placeholder="e.g. Obstetrics & Gynecology"
          error={fieldErrors.specialization}
        />

        <FormInput
          id="licenseNumber"
          label="License Number"
          value={form.licenseNumber}
          onChange={handleChange("licenseNumber")}
          placeholder="e.g. SLMC-12345"
          error={fieldErrors.licenseNumber}
        />

        <div>
          <FormInput
            id="consultationFee"
            label="Consultation Fee (LKR)"
            type="number"
            value={form.consultationFee}
            onChange={handleChange("consultationFee")}
            placeholder="e.g. 2500"
            error={fieldErrors.consultationFee}
          />
          <p className="mt-1 text-xs text-text-muted">
            Enter a value between 0 and 10,000 LKR.
          </p>
        </div>

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
