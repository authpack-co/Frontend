import { useState } from 'react';

/**
 * Peças repetidas do painel admin: formatação, crachás, avatar e os três
 * estados de uma lista.
 *
 * No painel antigo isso vivia em window.AP como funções que devolviam string
 * de HTML — era o jeito de compartilhar entre quatro scripts sem módulos.
 */

export const fmtBRL = (cents) => ((Number(cents) || 0) / 100)
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function fmtDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
}

export function fmtDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function RoleBadge({ role }) {
    const admin = role === 'admin';
    return (
        <span className={`admin-badge ${admin ? 'badge-admin' : 'badge-user'}`}>
            {admin ? 'Admin' : 'Usuário'}
        </span>
    );
}

export function StatusBadge({ status }) {
    const suspended = status === 'suspended';
    return (
        <span className={`admin-badge ${suspended ? 'badge-suspended' : 'badge-active'}`}>
            {suspended ? 'Suspenso' : 'Ativo'}
        </span>
    );
}

export function PlanBadge({ plan }) {
    if (!plan || plan === 'free') return <span className="admin-badge badge-neutral">Free</span>;
    return (
        <span className="admin-badge badge-plan-plus">
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
        </span>
    );
}

/** Foto, ou a inicial quando não há foto — ou quando ela falha ao carregar. */
export function Avatar({ picture, name }) {
    const [broken, setBroken] = useState(false);
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

    if (!picture || broken) {
        return (
            <div className="admin-avatar admin-avatar--initial">{initial}</div>
        );
    }

    return <img className="admin-avatar" src={picture} alt="" onError={() => setBroken(true)} />;
}

export function UserCell({ user }) {
    return (
        <div className="admin-user-cell">
            <Avatar picture={user.picture} name={user.name} />
            <div>
                <div className="nm">{user.name}</div>
                <div className="em">{user.email}</div>
            </div>
        </div>
    );
}

/** Moldura de rolagem: a tabela é larga, a página não deve rolar de lado. */
export function TableWrap({ children }) {
    return <div className="admin-table-wrap">{children}</div>;
}

export function Loading() {
    return (
        <div className="admin-loading">
            <div className="admin-spinner"></div>
            Carregando…
        </div>
    );
}

export function Empty({ children }) {
    return <div className="admin-empty">{children || 'Nada por aqui ainda.'}</div>;
}

export function ErrorState({ children }) {
    return <div className="admin-empty admin-error">{children || 'Erro ao carregar.'}</div>;
}

/**
 * Carregando / erro / vazio / conteúdo, na ordem — os quatro desfechos de
 * toda lista deste painel.
 */
export function ListState({ status, error, isEmpty, empty, children }) {
    if (status === 'loading') return <Loading />;
    if (status === 'error') return <ErrorState>{error}</ErrorState>;
    if (isEmpty) return <Empty>{empty}</Empty>;
    return children;
}
