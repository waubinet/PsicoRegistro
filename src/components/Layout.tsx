import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";

const NAV = [
  { to: "/", label: "Painel", exact: true },
  { to: "/pacientes", label: "Prontuário Psicológico" },
  { to: "/escolas", label: "Psicologia Escolar" },
  { to: "/encaminhamentos", label: "Encaminhamentos" },
  { to: "/pendencias", label: "Agenda e pendências" },
  { to: "/pesquisa", label: "Pesquisa" },
  { to: "/estatisticas", label: "Estatísticas" },
  { to: "/backup", label: "Backup" },
  { to: "/auditoria", label: "Auditoria" },
  { to: "/lixeira", label: "Lixeira" },
  { to: "/configuracoes", label: "Configurações" },
];

export function Layout() {
  const { lock, autolockMinutes } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const timer = useRef<number | null>(null);

  // Bloqueio automático por inatividade.
  useEffect(() => {
    const reset = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(
        () => {
          void lock();
        },
        Math.max(1, autolockMinutes) * 60_000,
      );
    };
    const events = ["mousemove", "keydown", "mousedown", "wheel", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [lock, autolockMinutes]);

  return (
    <div className="flex min-h-screen">
      <aside
        className={`${collapsed ? "w-14" : "w-64"} shrink-0 border-r border-base-200 bg-base-100 transition-all`}
      >
        <div className="flex items-center justify-between p-3">
          {!collapsed && <span className="text-lg font-semibold text-accent">PsicoRegistro</span>}
          <button
            className="btn-secondary !px-2 !py-1"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>
        {!collapsed && (
          <nav aria-label="Menu principal">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.exact}
                className={({ isActive }) =>
                  `block px-4 py-2.5 ${
                    isActive
                      ? "border-r-2 border-accent bg-accent-soft font-medium text-accent-dark dark:bg-base-200 dark:text-base-900"
                      : "text-base-800 hover:bg-base-200"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <button
              className="mt-4 block w-full px-4 py-2.5 text-left text-base-800 hover:bg-base-200"
              onClick={() => {
                void lock().then(() => navigate("/"));
              }}
            >
              🔒 Bloquear agora
            </button>
          </nav>
        )}
      </aside>
      <main className="min-w-0 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
