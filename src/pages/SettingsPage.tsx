import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FormBuilder, type FieldDef } from "@/components/FormBuilder";
import { ConfirmDialog, PageHeader, useToast } from "@/components/ui";
import { UpdateChecker } from "@/components/UpdateChecker";
import { useSession } from "@/store/session";

const PROFILE_FIELDS: FieldDef[] = [
  { name: "name", label: "Nome do profissional", colSpan: 2 },
  { name: "crp", label: "CRP" },
  { name: "contact", label: "Contato profissional" },
  { name: "institution", label: "Instituição" },
];

export function SettingsPage() {
  const { theme, fontScale, autolockMinutes, setTheme, setFontScale, setAutolockMinutes } =
    useSession();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.list("professional_profiles").then((rows) => setProfile(rows[0] ?? null)).catch(() => undefined);
  }, []);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Configurações" />

      <section className="card mb-4">
        <h2 className="mb-3 font-semibold">Aparência e acessibilidade</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Tema</label>
            <select className="input" value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")}>
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </div>
          <div>
            <label className="label">Tamanho da fonte</label>
            <select className="input" value={String(fontScale)} onChange={(e) => setFontScale(Number(e.target.value))}>
              <option value="0.9">Menor</option>
              <option value="1">Padrão</option>
              <option value="1.15">Maior</option>
              <option value="1.3">Grande</option>
            </select>
          </div>
          <div>
            <label className="label">Bloqueio automático (min)</label>
            <input
              type="number"
              min={1}
              max={120}
              className="input"
              value={autolockMinutes}
              onChange={(e) => setAutolockMinutes(Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 font-semibold">Cabeçalho profissional (exportações)</h2>
        <FormBuilder
          fields={PROFILE_FIELDS}
          initial={profile ?? {}}
          submitLabel="Salvar cabeçalho"
          onSubmit={async (v) => {
            if (profile?.id) await api.update("professional_profiles", String(profile.id), v);
            else {
              const id = await api.create("professional_profiles", v);
              setProfile({ ...v, id });
            }
            toast("ok", "Cabeçalho salvo.");
          }}
        />
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 font-semibold">Trocar senha-mestra</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="password"
            className="input"
            placeholder="Senha atual"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
          />
          <input
            type="password"
            className="input"
            placeholder="Nova senha (mín. 8)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
        </div>
        <button
          className="btn-primary mt-3"
          disabled={!oldPw || newPw.length < 8}
          onClick={async () => {
            try {
              await api.changePassword(oldPw, newPw);
              toast("ok", "Senha alterada com sucesso.");
              setOldPw("");
              setNewPw("");
            } catch (e) {
              toast("error", String(e));
            }
          }}
        >
          Alterar senha
        </button>
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 font-semibold">Atualizações</h2>
        <UpdateChecker />
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Dados de demonstração</h2>
        <p className="mb-3 text-base-700">
          Popule a base com registros fictícios (claramente marcados) para conhecer o sistema, ou
          remova todos eles.
        </p>
        <div className="flex gap-3">
          <button
            className="btn-secondary"
            onClick={async () => {
              try {
                await api.demoSeed();
                toast("ok", "Dados de demonstração criados.");
              } catch (e) {
                toast("error", String(e));
              }
            }}
          >
            Criar dados de demonstração
          </button>
          <button className="btn-danger" onClick={() => setConfirmClear(true)}>
            Remover dados de demonstração
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={async () => {
          const n = await api.demoClear();
          toast("ok", `${n} registro(s) de demonstração removido(s).`);
        }}
        title="Remover dados de demonstração"
        message="Todos os registros marcados como demonstração serão removidos permanentemente. Seus dados reais não são afetados."
        confirmLabel="Remover"
        danger
      />
    </div>
  );
}
