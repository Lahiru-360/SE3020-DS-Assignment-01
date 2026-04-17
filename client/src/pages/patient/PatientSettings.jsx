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
  const { userEmail } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
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
        setForm({
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          phone: p.phone ?? "",
        });
      })
      .catch(() => {
        // Profile not found yet (new patient) — keep blank form
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
      setForm({
        firstName: updated.firstName ?? form.firstName,
        lastName: updated.lastName ?? form.lastName,
        phone: updated.phone ?? form.phone,
      });
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
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Profile Settings
        </h1>
        <p className="text-sm text-text-muted mt-0.5">{userEmail}</p>
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-6">
        <p className="text-xs text-text-muted mb-5">
          Fill in only the fields you want to update. All fields are optional.
        </p>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
          <FormInput
            id="patient-phone"
            label="Phone Number"
            type="tel"
            value={form.phone}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              handleChange("phone")({ target: { value: digits } });
            }}
            placeholder="e.g. 0771234567"
            error={fieldErrors.phone}
            maxLength={10}
          />

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
