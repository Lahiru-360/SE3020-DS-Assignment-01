import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import ImageCarousel from "../components/ui/ImageCarousel";
import FormInput from "../components/ui/FormInput";
import PasswordStrengthBar from "../components/ui/PasswordStrengthBar";
import Alert from "../components/ui/Alert";

// Roles that exist in the auth-service.
const ROLES = [
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
];

const FIELD_CLASS = `
  w-full px-4 py-2.5 rounded-lg text-sm
  bg-bg-main
  text-text-primary
  border border-border
  placeholder:text-text-muted
  focus:outline-none focus:border-primary focus:ring-0
  transition-colors
`;

const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&#]/.test(password)) score++;
  if (score <= 2) return "Weak";
  if (score === 3) return "Medium";
  return "Strong";
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: ROLES[0].value,
    // Doctor-only fields
    specialization: "",
    licenseNumber: "",
    consultationFee: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const isDoctor = form.role === "doctor";

  useEffect(() => {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      specialization,
      licenseNumber,
      consultationFee,
    } = form;

    const baseValid =
      firstName.trim() &&
      lastName.trim() &&
      validateEmail(email) &&
      phone.trim() &&
      password.length >= 8 &&
      confirmPassword === password &&
      role;

    const doctorValid =
      role === "doctor"
        ? specialization.trim() &&
          licenseNumber.trim() &&
          consultationFee !== "" &&
          !isNaN(Number(consultationFee)) &&
          Number(consultationFee) >= 0
        : true;

    setIsFormValid(!!(baseValid && doctorValid));
  }, [form, confirmPassword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmailChange = (e) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9@._-]/g, "");
    setForm((prev) => ({ ...prev, email: sanitized }));
    setFieldErrors((prev) => ({
      ...prev,
      email: validateEmail(sanitized) ? "" : "Invalid email format",
    }));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, password: val }));
    setPasswordStrength(val ? getPasswordStrength(val) : "");
    setFieldErrors((prev) => ({
      ...prev,
      password: val.length >= 8 || !val ? "" : "Minimum 8 characters",
      confirmPassword:
        confirmPassword && val !== confirmPassword
          ? "Passwords do not match"
          : "",
    }));
  };

  const handleConfirmPasswordChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    setFieldErrors((prev) => ({
      ...prev,
      confirmPassword:
        val && form.password !== val ? "Passwords do not match" : "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setServerError(null);
    setIsSubmitting(true);

    // Build payload — only include fields relevant to the selected role
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      password: form.password,
      ...(isDoctor && {
        specialization: form.specialization,
        licenseNumber: form.licenseNumber,
        consultationFee: Number(form.consultationFee),
      }),
    };

    try {
      await axiosInstance.post(`/auth/register/${form.role}`, payload);
      navigate("/login", {
        replace: true,
        state: { successMessage: "Account created! Please sign in." },
      });
    } catch (err) {
      const message =
        err.response?.data?.message || "Registration failed. Please try again.";
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex">
      {/* LEFT — sticky image carousel */}
      <div className="hidden lg:block lg:w-1/2 sticky top-0 h-screen shrink-0">
        <ImageCarousel />
      </div>

      {/* RIGHT — scrollable form panel */}
      <div className="flex items-start justify-center w-full lg:w-1/2 px-8 py-12">
        <div className="w-full max-w-lg">
          {/* Brand header */}
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <img
                src="/Logoimg.png"
                alt="SafeMother"
                className="h-16 w-auto"
              />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-text-primary">
              Create Your Account
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Join Care Link to get started
            </p>
          </div>

          {/* Server error */}
          <Alert type="error">{serverError}</Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ROW 1 — First Name | Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                id="firstName"
                label="First Name"
                type="text"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Jane"
                required
                autoComplete="given-name"
              />
              <FormInput
                id="lastName"
                label="Last Name"
                type="text"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Doe"
                required
                autoComplete="family-name"
              />
            </div>

            {/* ROW 2 — Email | Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                id="email"
                label="Email Address"
                type="email"
                value={form.email}
                onChange={handleEmailChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
                error={fieldErrors.email}
              />
              <FormInput
                id="phone"
                label="Phone Number"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+94 77 123 4567"
                required
                autoComplete="tel"
              />
            </div>

            {/* Role selector */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                Register as
              </label>
              <select
                id="role"
                name="role"
                required
                value={form.role}
                onChange={handleChange}
                className={FIELD_CLASS}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor-only fields */}
            {isDoctor && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    id="specialization"
                    label="Specialization"
                    type="text"
                    value={form.specialization}
                    onChange={handleChange}
                    placeholder="e.g. Obstetrics"
                    required
                  />
                  <FormInput
                    id="licenseNumber"
                    label="License Number"
                    type="text"
                    value={form.licenseNumber}
                    onChange={handleChange}
                    placeholder="e.g. SLMC-12345"
                    required
                  />
                </div>
                <FormInput
                  id="consultationFee"
                  label="Consultation Fee (LKR)"
                  type="number"
                  value={form.consultationFee}
                  onChange={handleChange}
                  placeholder="e.g. 2500"
                  required
                />
              </>
            )}

            {/* ROW — Password | Confirm Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormInput
                  id="password"
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={handlePasswordChange}
                  placeholder="Min. 8 characters"
                  required
                  autoComplete="new-password"
                  error={fieldErrors.password}
                />
                {form.password && (
                  <PasswordStrengthBar strength={passwordStrength} />
                )}
              </div>
              <div>
                <FormInput
                  id="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="Retype your password"
                  required
                  autoComplete="new-password"
                  error={fieldErrors.confirmPassword}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`
                w-full py-3 px-6 rounded-xl font-semibold shadow-md mt-2
                flex items-center justify-center gap-2
                transition-all duration-200
                ${
                  isFormValid && !isSubmitting
                    ? "bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] cursor-pointer"
                    : "bg-bg-soft text-text-muted cursor-not-allowed"
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Sign-in link */}
          <p className="mt-8 text-sm text-center text-text-secondary">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary hover:text-primary/80 transition"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
