import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AccountView from './AccountView.jsx';
import BillingView from './BillingView.jsx';
import './settings.css';

/**
 * Configurações.
 *
 * Modal com sidebar própria, como sempre foi: as duas seções (Conta e
 * Cobrança) trocam dentro dele, sem sair da tela que está atrás.
 */
export default function SettingsModal({ open, onClose, onOpenPlans }) {
    const [view, setView] = useState('conta');

    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div
            className="settings-overlay open"
            onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Configurações">
                <aside className="settings-sidebar">
                    <div className="settings-sidebar-header">
                        <span className="settings-sidebar-title">Configurações</span>
                        <button className="settings-close-btn" type="button" title="Fechar" onClick={onClose}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    <nav className="settings-nav">
                        <button
                            className={`settings-nav-item${view === 'conta' ? ' active' : ''}`}
                            type="button"
                            onClick={() => setView('conta')}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                            </svg>
                            Conta
                        </button>
                        <button
                            className={`settings-nav-item${view === 'cobranca' ? ' active' : ''}`}
                            type="button"
                            onClick={() => setView('cobranca')}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            Cobrança
                        </button>
                    </nav>
                </aside>

                <div className="settings-content">
                    {/* A classe .active é o que o CSS usa para mostrar a view. */}
                    {view === 'conta' && <AccountView onOpenPlans={onOpenPlans} />}
                    {view === 'cobranca' && <BillingView />}
                </div>
            </div>
        </div>,
        document.body
    );
}
