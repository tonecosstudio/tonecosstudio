import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { fieldClass } from "./CommercialPage";

type PasswordFieldProps = {
  label: string;
  visibilityLabel?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
};

/** Shared password field for account access, signup and recovery. */
export default function PasswordField({
  label,
  visibilityLabel,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const target = visibilityLabel ?? label.toLocaleLowerCase("pt-BR");

  return (
    <div className="space-y-2 text-sm">
      <label htmlFor={id} className="block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={fieldClass + " pr-16"}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          aria-label={visible ? `Ocultar ${target}` : `Mostrar ${target}`}
          aria-pressed={visible}
          title={visible ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1.5 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md border border-white/25 bg-white/10 text-white transition-colors hover:border-[hsl(var(--gold-accent))] hover:text-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
        >
          {visible ? (
            <EyeOff size={22} aria-hidden="true" />
          ) : (
            <Eye size={22} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
