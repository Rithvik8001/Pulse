"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type FieldContextValue = {
  id: string;
  describedBy?: string;
  invalid: boolean;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

export function useFieldContext() {
  return React.useContext(FieldContext);
}

export type FieldProps = {
  label: React.ReactNode;

  labelHidden?: boolean;
  hint?: React.ReactNode;

  error?: React.ReactNode;
  id?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Field({
  label,
  labelHidden,
  hint,
  error,
  id,
  required,
  className,
  children,
}: FieldProps) {
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div data-slot="field" className={cn("grid gap-2", className)}>
      <label
        htmlFor={fieldId}
        className={cn("type-label text-fg-2", labelHidden && "sr-only")}
      >
        {label}
        {required ? (
          <span aria-hidden className="text-fg-3">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <FieldContext.Provider
        value={{ id: fieldId, describedBy, invalid: Boolean(error) }}
      >
        {children}
      </FieldContext.Provider>
      {error ? (
        <p id={errorId} role="alert" className="type-small text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="type-small text-fg-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function useControlProps(props: {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}) {
  const ctx = React.useContext(FieldContext);
  return {
    id: props.id ?? ctx?.id,
    "aria-describedby": props["aria-describedby"] ?? ctx?.describedBy,
    "aria-invalid": props["aria-invalid"] ?? (ctx?.invalid ? true : undefined),
  };
}

export function Input({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const control = useControlProps(props);
  return (
    <input
      data-slot="input"
      {...props}
      {...control}
      className={cn("field", className)}
    />
  );
}

export function Textarea({
  className,
  autoGrow,
  onInput,
  rows = 4,
  ...props
}: React.ComponentProps<"textarea"> & { autoGrow?: boolean }) {
  const control = useControlProps(props);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const grow = React.useCallback(() => {
    const el = ref.current;
    if (!el || !autoGrow) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autoGrow]);

  React.useEffect(() => {
    grow();
  }, [grow, props.value, props.defaultValue]);

  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      rows={rows}
      {...props}
      {...control}
      onInput={(e) => {
        grow();
        onInput?.(e);
      }}
      className={cn("field h-auto resize-none py-3", className)}
    />
  );
}
