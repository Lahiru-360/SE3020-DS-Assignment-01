export default function FormInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  rightElement,
  autoComplete,
  error,
  maxLength,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
        {rightElement}
      </div>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className="
          w-full px-4 py-2.5 rounded-lg text-sm
          bg-bg-main
          text-text-primary
          border border-border
          placeholder:text-text-muted
          focus:outline-none focus:border-primary focus:ring-0
          transition-colors
        "
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
