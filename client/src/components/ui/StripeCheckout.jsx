import { useState, useEffect, useRef, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { createPayment, verifyPayment } from "../../api/paymentService";
import Loader from "./Loader";
import Alert from "./Alert";

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
  const [verifying, setVerifying] = useState(false);
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
        console.error("[StripeCheckout] Stripe Error:", stripeError);
        alert(`Stripe Error: ${stripeError.message} (${stripeError.code})`);
        setError(stripeError.message || "Payment failed. Please try again.");
        setPaying(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        setPaying(false);
        setVerifying(true);
        console.log("[StripeCheckout] Payment succeeded on Stripe. Syncing with backend...");

        try {
          await verifyPayment(paymentIntent.id);
          console.log("[StripeCheckout] Backend synchronization complete.");
          onSuccess();
        } catch (syncErr) {
          console.error("[StripeCheckout] Verification failed:", syncErr);
          setError("Payment succeeded, but we couldn't update your dashboard status. Please refresh the page manually.");
          setVerifying(false);
        }
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
          disabled={paying || verifying}
          className="flex-1 py-2.5 rounded-lg border border-border text-text-secondary text-sm font-semibold hover:text-text-primary hover:border-primary transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || paying || verifying}
          className="flex-[2] py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {paying ? "Processing Payment..." : verifying ? "Syncing Dashboard..." : `Pay ${fmtAmount}`}
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
  // Move stripePromise inside to ensure it gets the key from import.meta.env at runtime
  const stripePromise = useMemo(() => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error("[StripeCheckout] VITE_STRIPE_PUBLISHABLE_KEY is missing!");
      return null;
    }
    return loadStripe(key);
  }, []);

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
        console.log("[StripeCheckout] Received Client Secret:", data?.clientSecret?.substring(0, 20) + "...");
        setClientSecret(data.clientSecret);
        setTxInfo(data);
      })
      .catch((err) =>
        setError(err.response?.data?.message ?? "Failed to initialize payment.")
      )
      .finally(() => setLoading(false));
  }, [appointment._id]);

  const options = useMemo(() => ({ clientSecret, appearance: APPEARANCE }), [clientSecret]);

  if (!stripePromise) {
    return <Alert type="error" message="Stripe configuration missing. Check client/.env" />;
  }

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
