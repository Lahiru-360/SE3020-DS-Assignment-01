// StatusBadge renders a colour-coded pill for appointment / approval statuses.
// Uses only design tokens defined in index.css.

const STATUS_STYLES = {
  pending: {
    bg: "rgba(244, 167, 50, 0.15)",
    color: "var(--color-warning)",
    border: "var(--color-warning)",
    label: "Pending",
  },
  confirmed: {
    bg: "rgba(26, 111, 168, 0.12)",
    color: "var(--color-primary)",
    border: "var(--color-primary)",
    label: "Confirmed",
  },
  completed: {
    bg: "rgba(39, 174, 122, 0.12)",
    color: "var(--color-success)",
    border: "var(--color-success)",
    label: "Completed",
  },
  cancelled: {
    bg: "rgba(231, 76, 60, 0.12)",
    color: "var(--color-error)",
    border: "var(--color-error)",
    label: "Cancelled",
  },
  approved: {
    bg: "rgba(39, 174, 122, 0.12)",
    color: "var(--color-success)",
    border: "var(--color-success)",
    label: "Approved",
  },
};

const StatusBadge = ({ status }) => {
  const key = (status || "").toLowerCase();
  const style = STATUS_STYLES[key] || {
    bg: "var(--color-bg-card)",
    color: "var(--color-text-muted)",
    border: "var(--color-border)",
    label: status || "Unknown",
  };

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        borderRadius: "999px",
        padding: "2px 10px",
        fontSize: "0.78rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {style.label}
    </span>
  );
};

export default StatusBadge;
