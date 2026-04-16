import { useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { getMyAppointments } from "../../api/patientService";
import { getPatientPayments } from "../../api/paymentService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";
import StripeCheckout from "../../components/ui/StripeCheckout";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(amount, currency = "LKR") {
  return `${currency} ${Number(amount).toLocaleString("en-LK")}`;
}

// ── Status badge ────────────────────────────────────────────────────────────

const TX_STATUS = {
  initiated: {
    icon: Clock,
    color: "var(--color-warning)",
    bg: "rgba(244,167,50,0.12)",
    label: "Initiated",
  },
  completed: {
    icon: CheckCircle2,
    color: "var(--color-success)",
    bg: "rgba(39,174,122,0.12)",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "var(--color-error)",
    bg: "rgba(231,76,60,0.12)",
    label: "Failed",
  },
  refunded: {
    icon: RefreshCw,
    color: "var(--color-primary)",
    bg: "rgba(26,111,168,0.12)",
    label: "Refunded",
  },
};

function TxStatusBadge({ status }) {
  const key = (status || "").toLowerCase();
  const cfg = TX_STATUS[key] ?? TX_STATUS.initiated;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ── Pay Modal ───────────────────────────────────────────────────────────────

function PayModal({ appointments, onClose, onSuccess }) {
  const [appointmentId, setAppointmentId] = useState("");
  const [proceedToPayment, setProceedToPayment] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  const unpaidAppointments = appointments.filter(
    (a) => a.paymentStatus !== "paid" && !["cancelled"].includes(a.status),
  );

  const selectedAppointment = unpaidAppointments.find(
    (a) => a._id === appointmentId,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-bg-card shadow-xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {paySuccess
                ? "Payment Complete"
                : proceedToPayment
                  ? "Complete Payment"
                  : "Pay for Appointment"}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {paySuccess
                ? "Your payment has been processed."
                : proceedToPayment
                  ? "Enter your card details to complete payment."
                  : "Select an appointment to pay for."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {paySuccess ? (
          <div className="space-y-4">
            <div
              className="rounded-lg border bg-bg-main px-4 py-4 flex items-center gap-3"
              style={{ borderColor: "var(--color-success)" }}
            >
              <CheckCircle2
                size={20}
                className="shrink-0"
                style={{ color: "var(--color-success)" }}
              />
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-success)" }}
              >
                Payment completed! Your appointment will be confirmed shortly.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Done
            </button>
          </div>
        ) : proceedToPayment && selectedAppointment ? (
          <StripeCheckout
            appointment={selectedAppointment}
            onSuccess={() => {
              setPaySuccess(true);
              onSuccess();
            }}
            onCancel={() => setProceedToPayment(false)}
          />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (appointmentId) setProceedToPayment(true);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Appointment
              </label>
              {unpaidAppointments.length > 0 ? (
                <select
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-main px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="">Select an appointment…</option>
                  {unpaidAppointments.map((a) => (
                    <option key={a._id} value={a._id}>
                      {formatDate(a.date)} — Dr.{" "}
                      {a.doctorName ?? "Unknown Doctor"} ({a.type ?? "Physical"}
                      )
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-text-muted py-2">
                  No unpaid appointments found.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!appointmentId}
              className="w-full py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CreditCard size={14} />
              Proceed to Payment
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PatientPayments() {
  const [transactions, setTransactions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPayModal, setShowPayModal] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([getPatientPayments(), getMyAppointments()])
      .then(([txRes, apptRes]) => {
        setTransactions(txRes.data?.data ?? []);
        setAppointments(apptRes.data?.data ?? []);
      })
      .catch((err) =>
        setError(err.response?.data?.message ?? "Failed to load payments."),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  // Build appointmentId → appointment lookup map
  const apptMap = {};
  for (const a of appointments) {
    apptMap[a._id] = a;
  }

  const summary = {
    total: transactions.length,
    completed: transactions.filter((t) => t.status === "completed").length,
    initiated: transactions.filter((t) => t.status === "initiated").length,
    refunded: transactions.filter((t) => t.status === "refunded").length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Payments</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Your payment history and billing.
          </p>
        </div>
        <button
          onClick={() => setShowPayModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          <CreditCard size={15} />
          Pay for Appointment
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <Alert type="error" message={error} />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total",
                value: summary.total,
                color: "var(--color-primary)",
              },
              {
                label: "Completed",
                value: summary.completed,
                color: "var(--color-success)",
              },
              {
                label: "Pending",
                value: summary.initiated,
                color: "var(--color-warning)",
              },
              {
                label: "Refunded",
                value: summary.refunded,
                color: "var(--color-error)",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-bg-card px-4 py-3 flex flex-col gap-1"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  {label}
                </span>
                <span className="text-2xl font-bold text-text-primary">
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Transaction list */}
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-card px-6 py-16 text-center">
              <CreditCard
                size={32}
                className="mx-auto mb-3 text-text-muted opacity-40"
              />
              <p className="text-sm font-semibold text-text-primary mb-1">
                No transactions yet
              </p>
              <p className="text-sm text-text-muted">
                Use the button above to pay for an appointment.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-text-primary">
                  Transaction History
                </h2>
              </div>
              <div className="divide-y divide-border">
                {transactions.map((tx) => {
                  const linkedAppt = apptMap[tx.appointmentId];
                  return (
                    <div
                      key={tx._id}
                      className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                    >
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {linkedAppt
                            ? `${formatDate(linkedAppt.date)} — ${linkedAppt.type ?? "PHYSICAL"}`
                            : "Appointment"}
                          {linkedAppt?.doctorName && (
                            <span className="ml-1.5 text-[10px] text-text-muted">
                              Dr. {linkedAppt.doctorName}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatDate(tx.createdAt)}
                          {tx.cardBrand && tx.cardLast4 && (
                            <span className="ml-2 capitalize">
                              {tx.cardBrand} •••• {tx.cardLast4}
                            </span>
                          )}
                        </p>
                        {tx.status === "failed" && tx.failureReason && (
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "var(--color-error)" }}
                          >
                            {tx.failureReason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                        <span className="text-sm font-semibold text-text-primary">
                          {formatAmount(tx.amount, tx.currency)}
                        </span>
                        <TxStatusBadge status={tx.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {showPayModal && (
        <PayModal
          appointments={appointments}
          onClose={() => setShowPayModal(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
