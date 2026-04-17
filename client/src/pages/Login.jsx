import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import ImageCarousel from "../components/ui/ImageCarousel";
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

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = location.state?.successMessage;

  useEffect(() => {
    setIsFormValid(validateEmail(email) && password.length >= 8);
  }, [email, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const { role } = await login(email, password);

      switch (role) {
        case "admin":
          navigate("/admin/overview", { replace: true });
          break;
        case "doctor":
          navigate("/doctor/overview", { replace: true });
          break;
        case "patient":
          navigate("/patient/overview", { replace: true });
          break;
        default:
          navigate("/", { replace: true });
      }
    } catch (err) {
      const message =
        err.response?.data?.message || "Login failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex min-h-[calc(100vh-5rem)]">
      {/* LEFT — Image Carousel (large screens only) */}
      <div className="hidden lg:block lg:w-1/2">
        <ImageCarousel />
      </div>

      {/* RIGHT — Login Form */}
      <div className="flex items-center justify-center w-full lg:w-1/2 px-8 py-12">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <img
                src="/Logoimg.png"
                alt="SafeMother"
                className="h-16 w-auto"
              />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-text-primary">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Sign in to access your account
            </p>
          </div>

          {/* Success message (from registration redirect) */}
          <Alert type="success">{successMessage}</Alert>

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

            <FormInput
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

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
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="mt-8 text-sm text-center text-text-secondary">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-primary hover:text-primary/80 transition"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
