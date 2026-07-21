import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildSchema, FormBuilder, type FieldDef } from "./FormBuilder";

const fields: FieldDef[] = [
  { name: "full_name", label: "Nome completo", required: true },
  { name: "email", label: "E-mail", type: "email" },
  { name: "status", label: "Situação", type: "select", options: [{ value: "ativo", label: "Ativo" }] },
];

describe("FormBuilder / validação", () => {
  it("schema exige campo obrigatório", () => {
    const schema = buildSchema(fields);
    const bad = schema.safeParse({ full_name: "" });
    expect(bad.success).toBe(false);
    const ok = schema.safeParse({ full_name: "Paciente Exemplo A" });
    expect(ok.success).toBe(true);
  });

  it("valida formato de e-mail", () => {
    const schema = buildSchema(fields);
    expect(schema.safeParse({ full_name: "X", email: "invalido" }).success).toBe(false);
    expect(schema.safeParse({ full_name: "X", email: "a@b.com" }).success).toBe(true);
  });

  it("mostra erro ao submeter sem campo obrigatório", async () => {
    const onSubmit = vi.fn();
    render(<FormBuilder fields={fields} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Salvar"));
    await waitFor(() => expect(screen.getByText("Campo obrigatório")).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submete com dados válidos", async () => {
    const onSubmit = vi.fn();
    render(<FormBuilder fields={fields} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Nome completo/), { target: { value: "Paciente Exemplo A" } });
    fireEvent.click(screen.getByText("Salvar"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].full_name).toBe("Paciente Exemplo A");
  });
});
