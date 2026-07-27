import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FormBuilder, type FieldDef } from "@/components/FormBuilder";
import { ConfirmDialog, PageHeader, useToast } from "@/components/ui";
import { UpdateChecker } from "@/components/UpdateChecker";
import { useSession } from "@/store/session";
import { ANTECEDENCIAS, garantirPermissao } from "@/lib/lembretes";

const PROFILE_FIELDS: FieldDef[] = [
  { name: "name", label: "Nome do profissional", colSpan: 2 },
  { name: "crp", label: "CRP" },
  { name: "contact", label: "Contato profissional" },
  { name: "institution", label: "Instituição" },
  { name: "city", label: "Cidade (rodapé dos documentos)" },
];

export function SettingsPage() {
  const { theme, fontScale, setTheme, setFontScale } = useSession();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [backupDays, setBackupDays] = useState(7);
  const [folhaCabecalho, setFolhaCabecalho] = useState("");
  const [folhaSubtitulo, setFolhaSubtitulo] = useState("");
  const [pastaManuais, setPastaManuais] = useState("");
  const [lembreteMin, setLembreteMin] = useState("0");
  const [mostrarNome, setMostrarNome] = useState(false);
  const [horaInicio, setHoraInicio] = useState(7);
  const [horaFim, setHoraFim] = useState(22);
  const [confirmClear, setConfirmClear] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.list("professional_profiles").then((rows) => setProfile(rows[0] ?? null)).catch(() => undefined);
    api
      .settingsGet()
      .then((cfg) => {
        setBackupDays(Number(cfg.backup_reminder_days) || 7);
        setFolhaCabecalho(cfg.folha_cabecalho ?? "");
        setFolhaSubtitulo(cfg.folha_subtitulo ?? "");
        setPastaManuais(cfg.pasta_manuais ?? "");
        setLembreteMin(cfg.agenda_lembrete_minutos ?? "0");
        setMostrarNome(cfg.agenda_mostrar_nome_notificacao === "1");
        setHoraInicio(Number(cfg.agenda_hora_inicio) || 7);
        setHoraFim(Number(cfg.agenda_hora_fim) || 22);
      })
      .catch(() => undefined);
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
            <label className="label">Lembrete de backup (dias)</label>
            <input
              type="number"
              min={1}
              max={365}
              className="input"
              value={backupDays}
              onChange={(e) => {
                const v = Math.max(1, Number(e.target.value));
                setBackupDays(v);
                void api.settingsSet("backup_reminder_days", String(v)).catch(() => undefined);
              }}
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
        <h2 className="mb-3 font-semibold">Agenda</h2>
        <div className="mb-3 grid gap-4 md:grid-cols-3">
          <div>
            <label className="label" htmlFor="ag-ini">
              Hora inicial da grade
            </label>
            <input
              id="ag-ini"
              type="number"
              min={0}
              max={23}
              className="input"
              value={horaInicio}
              onChange={(e) => {
                const v = Math.min(23, Math.max(0, Number(e.target.value)));
                setHoraInicio(v);
                void api.settingsSet("agenda_hora_inicio", String(v));
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="ag-fim">
              Hora final da grade
            </label>
            <input
              id="ag-fim"
              type="number"
              min={1}
              max={24}
              className="input"
              value={horaFim}
              onChange={(e) => {
                const v = Math.min(24, Math.max(1, Number(e.target.value)));
                setHoraFim(v);
                void api.settingsSet("agenda_hora_fim", String(v));
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="ag-lembrete">
              Lembrete antes do atendimento
            </label>
            <select
              id="ag-lembrete"
              className="input"
              value={lembreteMin}
              onChange={async (e) => {
                setLembreteMin(e.target.value);
                await api.settingsSet("agenda_lembrete_minutos", e.target.value);
                if (e.target.value !== "0") {
                  const ok = await garantirPermissao();
                  toast(
                    ok ? "ok" : "error",
                    ok
                      ? "Lembretes ativados."
                      : "O Windows negou a permissão de notificação.",
                  );
                }
              }}
            >
              {ANTECEDENCIAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={mostrarNome}
            onChange={(e) => {
              setMostrarNome(e.target.checked);
              void api.settingsSet(
                "agenda_mostrar_nome_notificacao",
                e.target.checked ? "1" : "0",
              );
            }}
          />
          <span>
            Mostrar o nome da pessoa na notificação
            <span className="block text-sm text-base-700">
              Desativado, a notificação diz apenas “Você tem um atendimento às 14:00” — outras
              pessoas que vejam sua tela não descobrem quem você atende.
            </span>
          </span>
        </label>
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 font-semibold">Folha de agenda para impressão</h2>
        <p className="mb-3 text-base-700">
          Cabeçalho da folha “Agenda de Atendimento Diário”, impressa para colher a assinatura dos
          responsáveis. Uma linha por linha do timbre.
        </p>
        <label className="label" htmlFor="folha-cab">
          Cabeçalho institucional
        </label>
        <textarea
          id="folha-cab"
          className="input mb-3 font-mono text-sm"
          rows={5}
          placeholder={"ESTADO DO PARÁ\nMUNICÍPIO DE ...\nENDEREÇO\nCEP\nCEAP (Coordenação ...)"}
          value={folhaCabecalho}
          onChange={(e) => setFolhaCabecalho(e.target.value)}
          onBlur={() => void api.settingsSet("folha_cabecalho", folhaCabecalho)}
        />
        <label className="label" htmlFor="folha-sub">
          Subtítulo
        </label>
        <input
          id="folha-sub"
          className="input"
          placeholder="INTERVENÇÃO E AVALIAÇÃO ZONA RURAL"
          value={folhaSubtitulo}
          onChange={(e) => setFolhaSubtitulo(e.target.value)}
          onBlur={() => void api.settingsSet("folha_subtitulo", folhaSubtitulo)}
        />
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 font-semibold">Pasta de manuais e testes</h2>
        <p className="mb-3 text-base-700">
          Usada no planejamento da bateria neuropsicológica para abrir o manual do instrumento
          direto do seu computador. Só o caminho é guardado — nenhum conteúdo de teste entra no
          sistema.
        </p>
        <input
          className="input font-mono text-sm"
          placeholder="C:\Users\...\OneDrive\Documentos\01 Psicologia\Manuais e Testes"
          value={pastaManuais}
          onChange={(e) => setPastaManuais(e.target.value)}
          onBlur={() => void api.settingsSet("pasta_manuais", pastaManuais)}
        />
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
