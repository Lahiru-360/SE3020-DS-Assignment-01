import { useState, useEffect, useRef, useMemo } from "react";
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
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ── Stripe Elements appearance ────────────────────────────────────────────
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
};

// ── Inner checkout form ───────────────────────────────────────────────────
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

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/patient/payments",
        },
        redirect: "if_required",
      });

      if (stripeError) {
        setError(stripeError.message || "Payment failed. Please try again.");
        setPaying(false);
      } else if (paymentIntent?.status === "succeeded") {
        onSuccess();
      } else {
        setError("Payment is processing or failed. Check your bank statement.");
        setPaying(false);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please refresh and try again.");
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && <Alert type="error" message={error} />}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={paying}
          className="flex-1 py-2.5 rounded-lg border border-border text-text-secondary text-sm font-semibold hover:text-text-primary hover:border-primary transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || paying}
          className="flex-[2] py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {paying ? "Processing..." : `Pay ${fmtAmount}`}
        </button>
      </div>

      <p className="text-[10px] text-text-muted text-center">
        Secured by Stripe. Card details are encrypted and never stored.
      </p>
    </form>
  );
}

// ── StripeCheckout (Export) ───────────────────────────────────────────────
export default function StripeCheckout({ appointment, onSuccess, onCancel }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [txInfo, setTxInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
        setError(err.response?.data?.message ?? "Failed to initialize payment.")
      )
      .finally(() => setLoading(false));
  }, [appointment._id]);

  const options = useMemo(() => ({ clientSecret, appearance: APPEARANCE }), [clientSecret]);

  if (loading) return <div className="py-6"><Loader /></div>;
  if (error) return <div className="space-y-3"><Alert type="error" message={error} /><button onClick={onCancel} className="text-sm text-text-muted hover:text-primary">← Go back</button></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-bg-main border border-border px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-text-muted uppercase tracking-wide font-medium">Amount due</span>
        <span className="text-base font-bold text-text-primary">
          {txInfo?.currency ?? "LKR"} {Number(txInfo?.amount ?? 0).toLocaleString("en-LK")}
        </span>
      </div>

      {clientSecret && (
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            amount={txInfo?.amount}
            currency={txInfo?.currency}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      )}
    </div>
  );
}
