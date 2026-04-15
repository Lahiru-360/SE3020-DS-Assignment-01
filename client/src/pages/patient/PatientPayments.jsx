export default function PatientPayments() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Payments</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Payment history and billing information.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-bg-card px-6 py-16 text-center">
        <p className="text-sm font-semibold text-text-primary mb-2">
          Coming Soon
        </p>
        <p className="text-sm text-text-muted">
          Payment features will be available once the payment service is
          integrated.
        </p>
      </div>
    </div>
  );
}
