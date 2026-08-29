import { Navigate, Route, Routes } from 'react-router';
import AppShell from './AppShell.jsx';
import Placeholder from './Placeholder.jsx';

/**
 * Tabela de rotas do app.
 *
 * Regra que orienta o mapa: a URL guarda o que alguém pode querer mandar por
 * link ou reencontrar depois do F5 — seção, pacote, sessão, usuário, aba de
 * configurações. Confirmação de excluir, "usando agora" e afins ficam de fora:
 * ressuscitar um modal de confirmação sem o contexto que levou até ele é pior
 * do que não restaurar nada.
 *
 * Os modais que TÊM rota (compartilhar, pessoas, adicionar sessão) são filhos
 * da rota do pacote: a tela de detalhe continua montada atrás deles, e fechar o
 * modal é só voltar um nível na URL.
 */
export default function AppRoutes() {
    return (
        <Routes>
            <Route element={<AppShell />}>
                {/* ── Minha coleção (pacotes que eu criei) ───────────────── */}
                <Route path="/collection" element={<Placeholder name="Minha coleção" from="sidebar .preset-collection" />} />
                <Route path="/collection/new" element={<Placeholder name="Novo pacote" from="#createPackageModal" />} />
                <Route path="/collection/:packageId" element={<Placeholder name="Pacote" from="#package-details .screen-section.primary" />}>
                    <Route path="share" element={<Placeholder name="Compartilhar pacote" from="#sharePackageModal" />} />
                    <Route path="people" element={<Placeholder name="Pessoas do pacote" from="#packagePeopleModal" />} />
                    <Route path="sessions/new" element={<Placeholder name="Adicionar sessão" from="#addSessionModal" />} />
                </Route>
                <Route path="/collection/:packageId/session/:sessionId" element={<Placeholder name="Sessão" from=".preset-session-overview" />} />
                <Route path="/collection/:packageId/user/:userId" element={<Placeholder name="Pessoa" from=".preset-user-overview" />} />

                {/* ── Meus acessos (pacotes que compartilharam comigo) ───── */}
                <Route path="/shared" element={<Placeholder name="Meus acessos" from="sidebar .preset-access" />} />
                <Route path="/shared/:packageId" element={<Placeholder name="Acesso" from="renderAccessHeader / loadAccessOverview" />} />
                <Route path="/shared/:packageId/session/:sessionId" element={<Placeholder name="Sessão (acesso)" from=".preset-session-overview" />} />

                {/* ── Configurações ─────────────────────────────────────── */}
                <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
                <Route path="/settings/account" element={<Placeholder name="Conta" from="#settings-view-conta" />} />
                <Route path="/settings/billing" element={<Placeholder name="Cobrança" from="#settings-view-cobranca" />} />

                {/* ── Planos ────────────────────────────────────────────── */}
                <Route path="/upgrade" element={<Placeholder name="Planos" from="#plusSubscribeModal" />} />

                {/* ── Admin (hoje vive em hash: #financeiro, #usuarios…) ─── */}
                <Route path="/admin" element={<Navigate to="/admin/finance" replace />} />
                <Route path="/admin/finance" element={<Placeholder name="Admin · Financeiro" from="admin.js #financeiro" />} />
                <Route path="/admin/users" element={<Placeholder name="Admin · Usuários" from="admin.js #usuarios" />} />
                <Route path="/admin/admins" element={<Placeholder name="Admin · Administradores" from="admin.js #administradores" />} />

                <Route path="*" element={<Placeholder name="404" />} />
            </Route>
        </Routes>
    );
}
