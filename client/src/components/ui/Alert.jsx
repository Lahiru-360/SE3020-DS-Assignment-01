import { AlertCircle, CheckCircle, Info } from "lucide-react";

const VARIANTS = {
  error: {
    container: "bg-red-50 text-red-600 border-red-200",
    Icon: AlertCircle,
  },
  success: {
    container: "bg-green-50 text-green-700 border-green-200",
    Icon: CheckCircle,
  },
  info: {
    container: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: Info,
  },
};

export default function Alert({ type = "error", children }) {
  if (!children) return null;

  const { container, Icon } = VARIANTS[type] ?? VARIANTS.error;

  return (
    <div
      className={`mb-6 flex items-start gap-2 px-4 py-3 rounded-lg text-sm border ${container}`}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
