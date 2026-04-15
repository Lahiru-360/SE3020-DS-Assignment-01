import { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import FormInput from "../components/ui/FormInput";
import PasswordStrengthBar from "../components/ui/PasswordStrengthBar";
import axiosInstance from "../api/axiosInstance";
import Alert from "../components/ui/Alert";

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

/** Six individual OTP digit boxes */
function OtpInput({ value, onChange }) {
  const inputRefs = useRef([]);
  const digits = value.split("");

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        // Clear current box
        const next = [...digits];
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        // Move to previous box and clear it
        const next = [...digits];
        next[index - 1] = "";
        onChange(next.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleChange = (e, index) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;

    // Handle paste: spread digits across boxes
    if (raw.length > 1) {
      const pasted = raw.slice(0, 6).split("");
      const next = Array(6).fill("");
      pasted.forEach((ch, i) => {
        next[i] = ch;
      });
      onChange(next.join(""));
      const focusIdx = Math.min(pasted.length, 5);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [
      ...Array(6)
        .fill("")
        .map((_, i) => digits[i] || ""),
    ];
    next[index] = raw;
    onChange(next.join(""));
    if (index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const next = Array(6)
      .fill("")
      .map((_, i) => pasted[i] || "");
    onChange(next.join(""));
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        Reset Code
      </label>
      <div className="flex gap-2 justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[i] || ""}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            className="
              w-full aspect-square text-center text-lg font-bold rounded-lg
              bg-bg-main
              text-text-primary
              border border-border
              focus:outline-none focus:border-primary focus:ring-0
              transition-colors
            "
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-text-muted">
        Enter the 6-digit code sent to your email
      </p>
    </div>
  );
}

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email] = useState(location.state?.email ?? "");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const passwordStrength = newPassword
    ? getPasswordStrength(newPassword)
    : null;

  const passwordsMatch = confirmPassword && newPassword === confirmPassword;
  const passwordMismatch = confirmPassword && newPassword !== confirmPassword;

  const isFormValid =
    token.replace(/\D/g, "").length === 6 &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await axiosInstance.post("/auth/reset-password", {
        email,
        token: token.replace(/\D/g, ""),
        newPassword,
      });

      navigate("/login", {
        replace: true,
        state: {
          successMessage: "Password reset successfully. Please sign in.",
        },
      });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full min-h-[calc(100vh-5rem)] px-8 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <img src="/Logoimg.png" alt="SafeMother" className="h-16 w-auto" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-text-primary">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Enter the code from your email and choose a new password
          </p>
        </div>

        {/* Info banner */}
        <Alert type="info">
          A 6-digit reset code was sent to <strong>{email}</strong>. It expires
          in <strong>15 minutes</strong>.
        </Alert>

        {/* Error Alert */}
        <Alert type="error">{error}</Alert>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <OtpInput value={token} onChange={setToken} />

          <div>
            <FormInput
              id="newPassword"
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            <PasswordStrengthBar strength={passwordStrength} />
          </div>

          <div>
            <FormInput
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            {passwordsMatch && (
              <p className="mt-1 text-xs text-accent">Passwords match</p>
            )}
            {passwordMismatch && (
              <p className="mt-1 text-xs text-red-500">
                Passwords do not match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`
              w-full py-3 px-6 rounded-xl font-semibold shadow-md
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
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        {/* Back to login */}
        <p className="mt-8 text-sm text-center text-text-secondary">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary/80 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
