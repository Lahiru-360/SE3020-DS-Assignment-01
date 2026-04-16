import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { createPayment } from "../../api/paymentService";
import Loader from "./Loader";
import Alert from "./Alert";

// ── Stripe instance — initialised once at module level ────────────────────
// VITE_STRIPE_PUBLISHABLE_KEY must be set in client/.env
let _stripePromise = null;
function getStripePromise() {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (!_stripePromise) _stripePromise = loadStripe(key);
  return _stripePromise;
}

// ── Stripe Elements appearance — matches app design tokens ────────────────
const APPEARANCE = {
  theme: "flat",
  variables: {
    colorPrimary: "#1a6fa8",
    colorBackground: "#f5f9fc",
    colorText: "#1e2b38",
    colorDanger: "#d94f3d",
    fontFamily: "inherit",
    borderRadius: "8px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid #d6e8f2",
      backgroundColor: "#f5f9fc",
      padding: "10px 12px",
      fontSize: "14px",
    },
    ".Input:focus": {
      borderColor: "#1a6fa8",
      outline: "none",
      boxShadow: "none",
    },
    ".Input--invalid": {
      borderColor: "#d94f3d",
    },
    ".Label": {
      color: "#4f6578",
      fontSize: "11px",
      fontWeight: "500",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      marginBottom: "6px",
    },
    ".Error": {
      color: "#d94f3d",
      fontSize: "12px",
    },
  },
};

// ── Inner checkout form — must be a child of <Elements> ───────────────────

function CheckoutForm({ amount, currency, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const fmtAmount = `${currency ?? "LKR"} ${Number(amount ?? 0).toLocaleString("en-LK")}`;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError("");

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Required for redirect-based methods; card payments won't redirect
        return_url: window.location.href,
      },
      // Prevent automatic page redirect for card payments
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed. Please try again.");
      setPaying(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      // e.g. status: 'processing' — rare for cards
      setError(
        "Payment is processing. Status will update automatically — you may close this.",
      );
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Stripe's universal payment UI — renders card fields, etc. */}
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {error && <Alert type="error" message={error} />}

      {/* Test cards hint (only in dev) */}
      {import.meta.env.DEV && (
        <p className="text-[10px] text-text-muted">
          Test card: <span className="font-mono">4242 4242 4242 4242</span> ·
          any future date · any 3-digit CVC
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg border border-border text-text-secondary text-sm font-semibold hover:text-text-primary hover:border-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || paying}
          className="flex-[2] py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {paying ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Processing…
            </>
          ) : (
            `Pay ${fmtAmount}`
          )}
        </button>
      </div>

      <p className="text-[10px] text-text-muted text-center">
        Secured by Stripe. Card details are encrypted and never stored on our
        servers.
      </p>
    </form>
  );
}

// ── StripeCheckout ────────────────────────────────────────────────────────
// Self-contained component. Fetches the clientSecret from the payment
// service on mount, then renders the Stripe Elements form.
//
// Props:
//   appointment  — full appointment object (needs _id, consultationFee, currency)
//   onSuccess()  — called immediately when stripe.confirmPayment() succeeds
//   onCancel()   — called when the user clicks "Cancel"

export default function StripeCheckout({ appointment, onSuccess, onCancel }) {
  const stripePromise = getStripePromise();

  const [clientSecret, setClientSecret] = useState(null);
  const [txInfo, setTxInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Guard against React StrictMode double-mounting firing two simultaneous
  // createPayment() calls before either has written to the DB (race condition).
  const initiated = useRef(false);

  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;

    createPayment(appointment._id)
      .then((res) => {
        const data = res.data?.data;
        setClientSecret(data.clientSecret);
        setTxInfo(data);
      })
      .catch((err) =>
        setError(
          err.response?.data?.message ?? "Failed to initialise payment.",
        ),
      )
      .finally(() => setLoading(false));
  }, [appointment._id]);

  // Stripe not configured
  if (!stripePromise) {
    return (
      <div className="rounded-lg bg-bg-main border border-border p-4 space-y-2">
        <p className="text-sm font-semibold text-text-primary">
          Payment not configured
        </p>
        <p className="text-xs text-text-muted">
          Add{" "}
          <code className="font-mono bg-bg-main px-1 rounded">
            VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…
          </code>{" "}
          to{" "}
          <code className="font-mono bg-bg-main px-1 rounded">client/.env</code>{" "}
          and restart the dev server.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-6">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <Alert type="error" message={error} />
        <button
          onClick={onCancel}
          className="text-sm text-text-muted hover:text-primary"
        >
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Amount summary */}
      <div className="rounded-lg bg-bg-main border border-border px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-text-muted uppercase tracking-wide font-medium">
          Amount due
        </span>
        <span className="text-base font-bold text-text-primary">
          {txInfo?.currency ?? "LKR"}{" "}
          {Number(txInfo?.amount ?? 0).toLocaleString("en-LK")}
        </span>
      </div>

      {/* Stripe Elements form */}
      <Elements
        stripe={stripePromise}
        options={{ clientSecret, appearance: APPEARANCE }}
      >
        <CheckoutForm
          amount={txInfo?.amount}
          currency={txInfo?.currency}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
    </div>
  );
}
