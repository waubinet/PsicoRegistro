import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", label: "Painel", exact: true },
  { to: "/pacientes", label: "Prontuário Psicológico" },
  { to: "/escolas", label: "Psicologia Escolar" },
  { to: "/alunos", label: "Alunos" },
  { to: "/encaminhamentos", label: "Encaminhamentos" },
  { to: "/agenda", label: "Agenda" },
  { to: "/pendencias", label: "Pendências" },
  { to: "/pesquisa", label: "Pesquisa" },
  { to: "/estatisticas", label: "Estatísticas" },
  { to: "/backup", label: "Backup" },
  { to: "/auditoria", label: "Auditoria" },
  { to: "/lixeira", label: "Lixeira" },
  { to: "/configuracoes", label: "Configurações" },
];

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);

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
          </nav>
        )}
      </aside>
      <main className="min-w-0 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
