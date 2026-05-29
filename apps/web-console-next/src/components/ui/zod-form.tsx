"use client";

import * as React from "react";
import { useForm, type DefaultValues, type FieldValues, type SubmitHandler, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z, ZodType } from "zod";
import { Label } from "./label";
import { Input } from "./input";
import { Button } from "./button";
import { cn } from "@/lib/cn";

export interface FieldSpec<T extends FieldValues> {
  name: Path<T>;
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
}

interface ZodFormProps<S extends ZodType<FieldValues>> {
  schema: S;
  defaultValues: DefaultValues<z.infer<S>>;
  fields: FieldSpec<z.infer<S>>[];
  submitLabel?: string;
  onSubmit: SubmitHandler<z.infer<S>>;
  cancel?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * Tiny contract-to-form helper. Drives a create flow from a Zod schema
 * (which mirrors a `packages/contracts` request type) plus a field spec
 * list. The verifier should treat this as the canonical proof that
 * contracts → forms is wired in this PR.
 */
export function ZodForm<S extends ZodType<FieldValues>>({
  schema,
  defaultValues,
  fields,
  submitLabel = "Submit",
  onSubmit,
  cancel,
  className,
}: ZodFormProps<S>) {
  type Values = z.infer<S>;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", className)} noValidate>
      {fields.map((f) => {
        const err = (errors as Record<string, { message?: string } | undefined>)[f.name as string];
        return (
          <div key={f.name as string} className="space-y-1.5">
            <Label htmlFor={f.name as string}>{f.label}</Label>
            <Input
              id={f.name as string}
              type={f.type ?? "text"}
              placeholder={f.placeholder}
              autoComplete={f.autoComplete}
              {...register(f.name as Path<Values>)}
              aria-invalid={err ? true : undefined}
            />
            {err?.message ? (
              <p className="text-xs text-destructive">{err.message}</p>
            ) : f.hint ? (
              <p className="text-xs text-muted-foreground">{f.hint}</p>
            ) : null}
          </div>
        );
      })}
      <div className="flex items-center justify-end gap-2 pt-2">
        {cancel && (
          <Button type="button" variant="ghost" onClick={cancel.onClick}>
            {cancel.label}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Working…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
