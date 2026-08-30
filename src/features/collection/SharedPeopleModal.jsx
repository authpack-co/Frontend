import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

/**
 * Todas as pessoas com quem o usuário compartilha, agrupadas por pacote.
 *
 * É o que o contador da sidebar abre: o número sozinho diz que o limite está
 * perto, mas não quem está ocupando as vagas. Quem passou do limite do plano
 * aparece esmaecido e marcado como "sem acesso" — a informação que faz o
 * upgrade fazer sentido.
 *
 * A lista vem do servidor, e não dos pacotes já carregados: /api/packages/created
 * traz os pacotes, não os membros de cada um.
 */
export default function SharedPeopleModal({ open, onClose, userInfo, onOpenPlans }) {
    // 'loading' | 'ready' | 'error'
    const [status, setStatus] = useState('loading');
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!open) return undefined;

        let alive = true;
        setStatus('loading');

        api.getSharedPeople()
            .then((result) => {
                if (!alive) return;
                setData(result);
                setStatus('ready');
            })
            .catch((err) => {
                if (!alive) return;
                console.error('[SharedPeople] load error:', err);
                setStatus('error');
            });

        return () => { alive = false; };
    }, [open]);

    if (!open) return null;

    const { peopleUsed = 0, peopleLimit = null, packages = [] } = data || {};
    const unlimited = peopleLimit == null;
    const over = !unlimited && peopleUsed > peopleLimit;

    return (
        <Modal
            open
            onClose={onClose}
            title="Pessoas com quem você compartilha"
            className="people-modal"
            footerBaseClass="people-modal-footer"
            aside={status === 'ready' && (
                <div className={`people-modal-summary${over ? ' over' : ''}`}>
                    {over ? (
                        <>
                            <strong>{peopleUsed} / {peopleLimit} pessoas</strong>
                            {' '}— você excedeu o limite do plano. As {peopleUsed - peopleLimit} pessoas
                            mais recentes ficaram sem acesso até você renovar ou reduzir.
                        </>
                    ) : (
                        <>
                            <strong>
                                {unlimited ? `${peopleUsed} pessoas` : `${peopleUsed} / ${peopleLimit} pessoas`}
                            </strong>
                            {' '}com acesso aos seus pacotes.
                        </>
                    )}
                </div>
            )}
            footer={status === 'ready' && (unlimited
                ? <span className="pmf-plan">Plano ilimitado</span>
                : (
                    <>
                        <span className="pmf-plan">
                            Plano <strong>{planName(userInfo?.plan)}</strong> · até {peopleLimit} pessoas
                        </span>
                        <button className="pmf-upgrade" type="button" onClick={onOpenPlans}>
                            Fazer upgrade &rarr;
                        </button>
                    </>
                ))}
        >
            {status === 'loading' && (
                <div
                    className="spinner-container"
                    style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <div className="spinner large"></div>
                </div>
            )}

            {status === 'error' && (
                <p className="people-modal-empty">Não foi possível carregar as pessoas.</p>
            )}

            {status === 'ready' && packages.length === 0 && (
                <p className="people-modal-empty">Você ainda não compartilhou com ninguém.</p>
            )}

            {status === 'ready' && packages.map((pkg) => (
                <div className="pm-package" key={pkg.id}>
                    <div className="pm-package-head">
                        <span className="pm-package-name">{pkg.name}</span>
                        <span className="pm-package-count">{pkg.people.length}</span>
                    </div>
                    <div className="pm-people">
                        {pkg.people.map((person) => (
                            <Person key={`${pkg.id}:${person.id}`} person={person} />
                        ))}
                    </div>
                </div>
            ))}
        </Modal>
    );
}

function planName(plan) {
    const value = plan || 'free';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function Person({ person }) {
    const [broken, setBroken] = useState(false);
    const showPicture = person.picture && !broken;

    return (
        <div className={`pm-person${person.suspended ? ' suspended' : ''}`}>
            <div className="pm-avatar">
                {showPicture ? (
                    <img src={person.picture} alt="" onError={() => setBroken(true)} />
                ) : (
                    <span className="pm-avatar-fallback">
                        {(person.name || '?').trim().charAt(0).toUpperCase() || '?'}
                    </span>
                )}
            </div>
            <div className="pm-info">
                <span className="pm-name">{person.name || '—'}</span>
                <span className="pm-email">{person.email || ''}</span>
            </div>
            {person.suspended && <span className="pm-tag">sem acesso</span>}
        </div>
    );
}
