import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import Modal from '../../components/Modal.jsx';
import { useNotify } from '../../components/Notifications.jsx';
import { api } from '../../lib/api.js';
import { formatDayStamp, initials } from '../../lib/format.js';
import { usePackage, usePackages } from '../../lib/packages.jsx';

const PALETTES = [
    ['#60a5fa', '#2563eb'], ['#34d399', '#059669'], ['#f59e0b', '#b45309'],
    ['#a78bfa', '#7c3aed'], ['#f472b6', '#be185d'], ['#22d3ee', '#0e7490'],
];

function paletteFor(name) {
    const key = (name || '?').trim();
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i)) % PALETTES.length;
    return PALETTES[hash];
}

/**
 * Membros e solicitações do pacote, nas duas abas.
 *
 * Uma carga só alimenta as duas: elas mudam juntas (aprovar tira de uma e põe
 * na outra), e duas fontes separadas só criariam chance de discordarem.
 *
 * A aba fica na URL (?tab=requests) porque é para lá que o aviso de pedido
 * pendente aponta — e um link para "as solicitações" precisa abrir nelas.
 */
export default function PeopleModal() {
    const { packageId } = useParams();
    const { pkg } = usePackage(packageId);
    const { reload } = usePackages();
    const notify = useNotify();
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') === 'requests' ? 'requests' : 'members';

    const [state, setState] = useState({ status: 'loading', members: [], requests: [] });
    const [deciding, setDeciding] = useState(null);

    const load = useCallback(async () => {
        setState((prev) => ({ ...prev, status: 'loading' }));

        try {
            const data = await api.getPackagePeople(packageId);
            setState({
                status: 'ready',
                members: data?.members || [],
                requests: data?.requests || [],
            });
        } catch (err) {
            console.error('[People] load error:', err);
            setState({ status: 'error', members: [], requests: [] });
        }
    }, [packageId]);

    useEffect(() => { load(); }, [load]);

    if (!pkg) return null;

    const close = () => navigate(`/collection/${packageId}`);
    const pending = state.requests.filter((request) => request.status === 'pending');

    async function decide(request, action) {
        setDeciding(request.id);

        try {
            if (action === 'approve') await api.approvePackageRequest(packageId, request.id);
            else await api.rejectPackageRequest(packageId, request.id);

            notify('success', action === 'approve' ? 'Acesso aprovado.' : 'Pedido recusado.');
            // A lista de pacotes carrega os membros junto: aprovar muda as duas.
            await Promise.all([load(), reload()]);
        } catch (err) {
            console.error('[People] decide error:', err);
            notify('error', 'Não foi possível responder ao pedido.');
        } finally {
            setDeciding(null);
        }
    }

    async function remove(member) {
        setDeciding(member.id);

        try {
            await api.removeUserFromPackage(packageId, member.id);
            notify('success', 'Acesso removido.');
            await Promise.all([load(), reload()]);
        } catch (err) {
            console.error('[People] remove error:', err);
            notify('error', 'Não foi possível remover o acesso.');
        } finally {
            setDeciding(null);
        }
    }

    return (
        <Modal
            open
            onClose={close}
            title="Pessoas do pacote"
            id="packagePeopleModal"
            className="pkg-people-modal"
            bodyClassName="pkg-people-body custom-scrollbar"
            // As abas são irmãs do corpo, não filhas: é assim que o CSS as posiciona.
            aside={(
                <div className="pkg-people-tabs" role="tablist">
                    <button
                        className={`pkg-people-tab${tab === 'members' ? ' active' : ''}`}
                        type="button"
                        role="tab"
                        aria-selected={tab === 'members'}
                        onClick={() => setSearchParams({}, { replace: true })}
                    >
                        <span>Membros</span>
                        <span className="pkg-people-tab-count">{state.members.length || ''}</span>
                    </button>
                    <button
                        className={`pkg-people-tab${tab === 'requests' ? ' active' : ''}`}
                        type="button"
                        role="tab"
                        aria-selected={tab === 'requests'}
                        onClick={() => setSearchParams({ tab: 'requests' }, { replace: true })}
                    >
                        <span>Solicitações</span>
                        <span className={`pkg-people-tab-count pkg-people-tab-count--alert${pending.length ? '' : ' hidden'}`}>
                            {pending.length}
                        </span>
                    </button>
                </div>
            )}
        >
            <>
                {state.status === 'loading' && (
                    <div className="spinner-container" style={{ height: 160 }}>
                        <div className="spinner large"></div>
                    </div>
                )}

                {state.status === 'error' && (
                    <PeopleEmpty
                        title="Não foi possível carregar"
                        text="Tente fechar e abrir de novo."
                    />
                )}

                {state.status === 'ready' && tab === 'members' && (
                    <MembersTab
                        members={state.members}
                        packageId={packageId}
                        busyId={deciding}
                        onRemove={remove}
                        onNavigate={close}
                    />
                )}

                {state.status === 'ready' && tab === 'requests' && (
                    <RequestsTab pending={pending} busyId={deciding} onDecide={decide} />
                )}
            </>
        </Modal>
    );
}

function MembersTab({ members, packageId, busyId, onRemove, onNavigate }) {
    const onlyOwner = members.every((member) => member.isCreator);

    return (
        <>
            <div className="pkg-people-list">
                {members.map((member) => (
                    <MemberRow
                        key={member.id}
                        member={member}
                        packageId={packageId}
                        busy={busyId === member.id}
                        onRemove={onRemove}
                        onNavigate={onNavigate}
                    />
                ))}
            </div>

            {/* Só o dono na lista: ela existe, mas ainda não é um pacote
                compartilhado. A dica vai embaixo, não no lugar dela. */}
            {onlyOwner && (
                <p className="pkg-people-hint">
                    Ninguém entrou ainda. Compartilhe o link do pacote para receber solicitações.
                </p>
            )}
        </>
    );
}

function MemberRow({ member, packageId, busy, onRemove, onNavigate }) {
    const entered = formatDayStamp(member.connectedAt);
    const meta = member.isCreator
        ? 'Criou o pacote'
        : (entered ? `Entrou ${entered.charAt(0).toLowerCase()}${entered.slice(1)}` : 'Entrou recentemente');

    const tag = member.isCreator
        ? 'dono'
        // Sobre-limite do plano: está na lista, mas sem acesso até liberar espaço.
        : (member.suspended ? 'sem acesso' : '');

    return (
        <div className={`pkg-person${member.suspended ? ' suspended' : ''}`}>
            <PersonHead person={member} meta={meta} tag={tag} />

            {/* O dono é quem está olhando: não há o que remover nem atividade a auditar. */}
            {!member.isCreator && (
                <div className="pkg-person-actions">
                    <Link
                        className="pkg-person-btn"
                        to={`/collection/${packageId}/user/${member.id}`}
                        onClick={onNavigate}
                    >
                        Ver atividade
                    </Link>
                    <button
                        className="pkg-person-btn pkg-person-btn--danger"
                        type="button"
                        disabled={busy}
                        onClick={() => onRemove(member)}
                    >
                        {busy ? '…' : 'Remover'}
                    </button>
                </div>
            )}
        </div>
    );
}

function RequestsTab({ pending, busyId, onDecide }) {
    if (!pending.length) {
        return (
            <PeopleEmpty
                title="Nenhuma solicitação"
                text="Quando alguém abrir o link do pacote e pedir acesso, o pedido chega aqui."
            />
        );
    }

    return (
        <div className="pkg-people-list">
            {pending.map((request) => {
                const asked = formatDayStamp(request.createdAt);
                const busy = busyId === request.id;

                return (
                    <div className="pkg-person pkg-person--request" key={request.id}>
                        <PersonHead
                            person={request.user || {}}
                            meta={asked ? `Pediu ${asked.charAt(0).toLowerCase()}${asked.slice(1)}` : 'Pediu recentemente'}
                        />
                        {/* Os dois botões travam juntos: a linha inteira está
                            sendo decidida, não só o botão clicado. */}
                        <div className="pkg-person-actions">
                            <button
                                className="pkg-person-btn"
                                type="button"
                                disabled={busy}
                                onClick={() => onDecide(request, 'reject')}
                            >
                                Recusar
                            </button>
                            <button
                                className="pkg-person-btn pkg-person-btn--primary"
                                type="button"
                                disabled={busy}
                                onClick={() => onDecide(request, 'approve')}
                            >
                                Aprovar
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function PersonHead({ person, meta, tag }) {
    const [c1, c2] = paletteFor(person.name);
    const [broken, setBroken] = useState(false);

    return (
        <div className="pkg-person-head">
            <span
                className="pkg-person-avatar"
                style={{ background: `linear-gradient(150deg, ${c1}, ${c2})` }}
            >
                {initials(person.name)}
                {person.picture && !broken && (
                    <img src={person.picture} alt={person.name || ''} onError={() => setBroken(true)} />
                )}
            </span>

            <div className="pkg-person-info">
                <div className="pkg-person-name-row">
                    <span className="pkg-person-name">{person.name || '—'}</span>
                    {tag && <span className="pkg-person-tag">{tag}</span>}
                </div>
                <span className="pkg-person-email">{person.email || ''}</span>
                <span className="pkg-person-meta">{meta}</span>
            </div>
        </div>
    );
}

function PeopleEmpty({ title, text }) {
    return (
        <div className="pkg-people-empty">
            <span className="pkg-people-empty-title">{title}</span>
            <span className="pkg-people-empty-text">{text}</span>
        </div>
    );
}
