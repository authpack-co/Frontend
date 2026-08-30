import { Navigate, Route, Routes } from 'react-router';
import { RequireAdmin, RequireAuth } from '../lib/auth.jsx';
import AdminShell from '../features/admin/AdminShell.jsx';
import AdminsPage from '../features/admin/AdminsPage.jsx';
import FinancePage from '../features/admin/FinancePage.jsx';
import UsersPage from '../features/admin/UsersPage.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import InvitePage from '../features/invite/InvitePage.jsx';
import CollectionPage from '../features/collection/CollectionPage.jsx';
import AccessDetail from '../features/shared/AccessDetail.jsx';
import AccessSessionDetail from '../features/shared/AccessSessionDetail.jsx';
import SharedPage from '../features/shared/SharedPage.jsx';
import PackageDetail from '../features/collection/PackageDetail.jsx';
import AddSessionModal from '../features/collection/capture/AddSessionModal.jsx';
import PeopleModal from '../features/collection/PeopleModal.jsx';
import ShareModal from '../features/collection/ShareModal.jsx';
import SessionDetail from '../features/collection/SessionDetail.jsx';
import UserDetail from '../features/collection/UserDetail.jsx';
import AppShell from './AppShell.jsx';
import Placeholder from './Placeholder.jsx';

/**
 * Tabela de rotas do app.
 *
 * Regra que orienta o mapa: a URL guarda o que alguém pode querer mandar por
 * link ou reencontrar depois do F5 — seção, pacote, sessão, usuário.
 *
 * Fora dela ficam configurações, planos e as confirmações: são coisas que se
 * abrem por cima do que já está na tela e se fecham voltando para ela. Dar URL
 * a elas só criaria endereços que ressuscitam um modal sem o contexto que
 * levou até ele.
 *
 * Os modais que TÊM rota (compartilhar, pessoas, adicionar sessão) são filhos
 * da rota do pacote: a tela de detalhe continua montada atrás deles, e fechar o
 * modal é só voltar um nível na URL.
 */
export default function AppRoutes() {
    return (
        <Routes>
            {/* Públicas: quem chega aqui pode não ter conta ainda. */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invite/:key" element={<InvitePage />} />

            <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                {/* ── Minha coleção (pacotes que eu criei) ───────────────── */}
                <Route path="/collection" element={<CollectionPage />} />
                <Route path="/collection/:packageId" element={<PackageDetail />}>
                    <Route path="share" element={<ShareModal />} />
                    <Route path="people" element={<PeopleModal />} />
                    <Route path="sessions/new" element={<AddSessionModal />} />
                </Route>
                <Route path="/collection/:packageId/session/:sessionId" element={<SessionDetail />} />
                <Route path="/collection/:packageId/user/:userId" element={<UserDetail />} />

                {/* ── Meus acessos (pacotes que compartilharam comigo) ───── */}
                <Route path="/shared" element={<SharedPage />} />
                <Route path="/shared/:packageId" element={<AccessDetail />} />
                <Route path="/shared/:packageId/session/:sessionId" element={<AccessSessionDetail />} />

                <Route path="*" element={<Placeholder name="404" />} />
            </Route>

            {/* ── Admin ───────────────────────────────────────────────────
                Fora do AppShell de propósito: o painel admin tem casca
                própria — sem coleção, sem pacotes —, como sempre teve. */}
            <Route element={<RequireAdmin><AdminShell /></RequireAdmin>}>
                <Route path="/admin" element={<Navigate to="/admin/finance" replace />} />
                <Route path="/admin/finance" element={<FinancePage />} />
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/admins" element={<AdminsPage />} />
            </Route>
        </Routes>
    );
}
