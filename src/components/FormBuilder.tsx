/**
 * Construtor de formulários declarativo: recebe uma lista de campos e devolve
 * os valores validados (Zod + React Hook Form).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Option } from "@/lib/options";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "time" | "select" | "checkbox" | "email" | "number";
  options?: Option[];
  required?: boolean;
  help?: string;
  colSpan?: 1 | 2;
  /** mostra o campo apenas quando (valores) => true */
  showIf?: (values: Record<string, unknown>) => boolean;
};

export function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let s: z.ZodTypeAny;
    if (f.type === "checkbox") {
      s = z.boolean().optional();
    } else if (f.type === "email") {
      s = f.required
        ? z.string().min(1, "Campo obrigatório").email("E-mail inválido")
        : z
            .string()
            .optional()
            .refine((v) => !v || /.+@.+\..+/.test(v), "E-mail inválido");
    } else if (f.required) {
      s = z.string().min(1, "Campo obrigatório");
    } else {
      s = z.string().optional();
    }
    shape[f.name] = s;
  }
  return z.object(shape);
}

export function FormBuilder(props: {
  fields: FieldDef[];
  initial?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  onChange?: (values: Record<string, unknown>) => void;
  footer?: React.ReactNode;
}) {
  const schema = buildSchema(props.fields);
  const defaults: Record<string, unknown> = {};
  for (const f of props.fields) {
    const v = props.initial?.[f.name];
    defaults[f.name] = f.type === "checkbox" ? Boolean(v) : typeof v === "string" ? v : (v ?? "");
  }
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: defaults });

  const values = watch();
  const onChange = props.onChange;
  useEffect(() => {
    if (onChange) onChange(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  return (
    <form
      onSubmit={handleSubmit(async (v) => {
        await props.onSubmit(v);
      })}
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {props.fields.map((f) => {
          if (f.showIf && !f.showIf(values)) return null;
          const err = errors[f.name]?.message as string | undefined;
          const id = `fld-${f.name}`;
          const span = f.colSpan === 2 || f.type === "textarea" ? "md:col-span-2" : "";
          return (
            <div key={f.name} className={span}>
              <label className="label" htmlFor={id}>
                {f.label}
                {f.required ? " *" : ""}
              </label>
              {f.type === "textarea" ? (
                <textarea id={id} rows={3} className="input" {...register(f.name)} />
              ) : f.type === "select" ? (
                <select id={id} className="input" {...register(f.name)}>
                  <option value="">— selecione —</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "checkbox" ? (
                <input id={id} type="checkbox" className="h-5 w-5" {...register(f.name)} />
              ) : (
                <input
                  id={id}
                  type={f.type === "number" ? "number" : (f.type ?? "text")}
                  className="input"
                  {...register(f.name)}
                />
              )}
              {f.help && <p className="mt-1 text-sm text-base-700">{f.help}</p>}
              {err && <p className="field-error">{err}</p>}
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        {props.footer}
        {props.onCancel && (
          <button type="button" className="btn-secondary" onClick={props.onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {props.submitLabel ?? "Salvar"}
        </button>
      </div>
    </form>
  );
}
