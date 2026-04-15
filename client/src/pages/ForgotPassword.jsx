import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import FormInput from "../components/ui/FormInput";
import Alert from "../components/ui/Alert";

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    setIsEmailValid(validateEmail(email));
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEmailValid) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await axiosInstance.post("/auth/forgot-password", { email });
      navigate("/reset-password", { state: { email } });
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
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Enter your email and we&apos;ll send you a reset code
          </p>
        </div>

        <>
          {/* Error Alert */}
          <Alert type="error">{error}</Alert>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

            <button
              type="submit"
              disabled={!isEmailValid || isSubmitting}
              className={`
                  w-full py-3 px-6 rounded-xl font-semibold shadow-md
                  flex items-center justify-center gap-2
                  transition-all duration-200
                  ${
                    isEmailValid && !isSubmitting
                      ? "bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] cursor-pointer"
                      : "bg-bg-soft text-text-muted cursor-not-allowed"
                  }
                `}
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
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
        </>
      </div>
    </div>
  );
}
