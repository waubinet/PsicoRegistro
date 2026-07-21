import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Loading, ToastProvider } from "./components/ui";
import { Unlock } from "./pages/Unlock";
import { Dashboard } from "./pages/Dashboard";
import { PatientsList } from "./pages/PatientsList";
import { PatientDetail } from "./pages/PatientDetail";
import { CaseDetail } from "./pages/CaseDetail";
import { SchoolsList } from "./pages/SchoolsList";
import { SchoolDetail } from "./pages/SchoolDetail";
import { StudentDetail } from "./pages/StudentDetail";
import { ReferralsPage } from "./pages/ReferralsPage";
import { RemindersPage } from "./pages/RemindersPage";
import { SearchPage } from "./pages/SearchPage";
import { StatsPage } from "./pages/StatsPage";
import { BackupPage } from "./pages/BackupPage";
import { AuditPage } from "./pages/AuditPage";
import { TrashPage } from "./pages/TrashPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useSession } from "./store/session";

export function App() {
  const { loading, unlocked, refresh } = useSession();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-100">
        <Loading />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <ToastProvider>
        <Unlock />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pacientes" element={<PatientsList />} />
            <Route path="pacientes/:id" element={<PatientDetail />} />
            <Route path="casos/:id" element={<CaseDetail />} />
            <Route path="escolas" element={<SchoolsList />} />
            <Route path="escolas/:id" element={<SchoolDetail />} />
            <Route path="estudantes/:id" element={<StudentDetail />} />
            <Route path="encaminhamentos" element={<ReferralsPage />} />
            <Route path="pendencias" element={<RemindersPage />} />
            <Route path="pesquisa" element={<SearchPage />} />
            <Route path="estatisticas" element={<StatsPage />} />
            <Route path="backup" element={<BackupPage />} />
            <Route path="auditoria" element={<AuditPage />} />
            <Route path="lixeira" element={<TrashPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}
