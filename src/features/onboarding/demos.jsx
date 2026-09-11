/**
 * As maquetes do guia.
 *
 * Cada uma imita a tela de que o slide fala — a top bar, o modal de captura,
 * o de compartilhar. São desenho, não componentes reutilizáveis: existem para
 * caber na moldura escura de 440px do guia e em lugar nenhum mais.
 *
 * As medidas que posicionam uma peça dentro dessa moldura ficam inline; tudo
 * que se repete mora em onboarding.css.
 */

/** Cursor do mouse, para as maquetes em que alguém clica em alguma coisa. */
function Cursor({ animation }) {
    return (
        <span className="og-cursor" style={{ animation }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="#0f172a" strokeWidth="1.4" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.4))' }}>
                <path d="M5 3l14 7-6 1.6L9.4 19 5 3z" />
            </svg>
        </span>
    );
}

function Check({ size = 16, color = '#16a34a', style }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={style}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

/**
 * Boas-vindas: a marca sozinha.
 *
 * É o único slide que não imita uma tela, então ele também não finge ser uma:
 * o símbolo do Niango sem a moldura escura do favicon, um respiro de luz atrás
 * dele e a frase. Nada pisca — o que se quer aqui é o silêncio antes do guia
 * começar.
 */
export function WelcomeDemo() {
    return (
        <div className="og-hero">
            <div className="og-hero-mark">
                <svg viewBox="0 0 512 512" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M127.1 127a20.5 20.5 0 0 1 33.06-16.2l166.35 129.01a20.5 20.5 0 0 1 0 32.4L160.16 401.2A20.5 20.5 0 0 1 127.1 385Z"
                    />
                </svg>
            </div>
            <div className="og-hero-caption">Suas sessões, num lugar só</div>
        </div>
    );
}

/** Seção 1 · o modal de criar pacote, aberto sobre a coleção vazia. */
export function CreateDemo() {
    return (
        <>
            <div className="og-win" style={{ position: 'absolute', left: 36, top: 74, width: 368, height: 326 }}>
                <div className="og-win-head" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <span className="og-t">Minha coleção</span>
                        <span className="og-t" style={{ color: '#9ca3af' }}>Meus acessos</span>
                    </div>
                    <span className="og-btn">Novo pacote</span>
                </div>
                <div style={{ padding: 20, opacity: 0.5 }}>
                    <div style={{ height: 10, width: '46%', background: '#eceef1', borderRadius: 5, marginBottom: 12 }}></div>
                    <div style={{ height: 64, background: '#f1f3f5', borderRadius: 10 }}></div>
                </div>
            </div>

            <div className="og-win" style={{ position: 'absolute', left: 70, top: 150, width: 300, animation: 'og-rise .5s ease both' }}>
                <div className="og-win-head" style={{ justifyContent: 'space-between' }}>
                    <span className="og-t">Crie um novo pacote</span>
                    <span className="og-x">×</span>
                </div>
                <div className="og-win-body">
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div className="og-input og-grow">
                            <span>Trabalho</span>
                            <span className="og-caret"></span>
                        </div>
                        <span className="og-btn" style={{ padding: '0 16px', alignSelf: 'stretch' }}>Ok</span>
                    </div>
                    <div className="og-muted" style={{ marginTop: 11, lineHeight: 1.45 }}>
                        Crie pacotes para organizar suas sessões e compartilhar com outras pessoas.
                    </div>
                </div>
            </div>
        </>
    );
}

/** Seção 1 · o pacote recém-criado, ainda vazio. */
export function CreatedDemo() {
    return (
        <div className="og-win" style={{ width: 290, padding: 15, animation: 'og-float 5s ease-in-out infinite' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingBottom: 12, borderBottom: '1px solid #f0f1f3' }}>
                <span className="og-chip og-chip--a" style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>T</span>
                <div className="og-grow" style={{ lineHeight: 1.25 }}>
                    <div className="og-t" style={{ fontSize: 14 }}>Trabalho</div>
                    <div className="og-muted">criado agora mesmo</div>
                </div>
                <span style={{ fontFamily: 'var(--ap-font-data)', fontSize: 10.5, color: '#6b7280', background: '#f3f4f6', borderRadius: 6, padding: '3px 7px' }}>0/5</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 13, border: '1.5px dashed #d1d5db', borderRadius: 10, padding: 14, color: '#9ca3af', fontSize: 12.5, fontWeight: 500 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" /><path d="M5 12h14" />
                </svg>
                Adicionar sessão
            </div>
        </div>
    );
}

/** Seção 2 · a top bar do pacote, com o cursor indo ao "Adicionar sessão". */
export function AddOpenDemo() {
    return (
        <>
            <div className="og-win" style={{ position: 'absolute', left: 26, top: 96, width: 388, height: 300 }}>
                <div className="og-win-head" style={{ gap: 8 }}>
                    <div className="og-grow" style={{ height: 30, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 9 }}></div>
                    <span className="og-btn og-btn--ghost">Compartilhar</span>
                    <span className="og-btn og-btn--pulse">+ Adicionar sessão</span>
                </div>
                <div className="og-win-body">
                    <div className="og-t og-t--sm" style={{ marginBottom: 3 }}>Trabalho</div>
                    <div className="og-muted" style={{ marginBottom: 13 }}>Nenhuma sessão ainda</div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 11, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: 12, padding: '9px 14px', background: '#f9fafb' }}>
                            {['Serviço', 'Status', 'Usando agora'].map((label) => (
                                <span key={label} className="og-grow" style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6b7280' }}>
                                    {label}
                                </span>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 96, borderTop: '1px solid #eef0f3', color: '#9ca3af', fontSize: 11.5 }}>
                            Suas sessões aparecerão aqui
                        </div>
                    </div>
                </div>
            </div>
            <Cursor animation="og-click-topbar 6.5s ease-in-out infinite" />
        </>
    );
}

/** Seção 2 · escolher os serviços no modal. */
export function AddPickDemo() {
    const popular = [
        ['Spotify', 'og-chip--b'], ['ChatGPT', 'og-chip'],
        ['Figma', 'og-chip--d'], ['Notion', 'og-chip--c'],
    ];

    return (
        <div className="og-win" style={{ width: 326, animation: 'og-rise .5s ease both' }}>
            <div className="og-win-head" style={{ justifyContent: 'space-between' }}>
                <div style={{ lineHeight: 1.25 }}>
                    <div className="og-t">Adicionar sessão</div>
                    <div className="og-muted">Trabalho</div>
                </div>
                <span className="og-x">×</span>
            </div>
            <div className="og-win-body">
                <div className="og-input">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                    </svg>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', display: 'inline-block', animation: 'og-type 6.5s ease-in-out infinite' }}>Netflix</span>
                    <span className="og-caret"></span>
                </div>

                <div style={{ marginTop: 11, animation: 'og-chip-in 6.5s ease-out infinite' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(29,29,28,.06)', border: '1px solid rgba(29,29,28,.16)', borderRadius: 99, padding: '5px 10px 5px 6px' }}>
                        <span className="og-chip og-chip--e" style={{ width: 18, height: 18, borderRadius: 5 }}></span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#1d1d1c' }}>Netflix</span>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>×</span>
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '13px 0 10px' }}>
                    <span className="og-grow" style={{ height: 1, background: '#eef0f3' }}></span>
                    <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9ca3af', whiteSpace: 'nowrap' }}>Serviços populares</span>
                    <span className="og-grow" style={{ height: 1, background: '#eef0f3' }}></span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {popular.map(([name, tone]) => (
                        <div key={name} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 4px', textAlign: 'center' }}>
                            <span className={`og-chip ${tone}`} style={{ display: 'block', width: 22, height: 22, margin: '0 auto 5px', borderRadius: 6 }}></span>
                            <span style={{ fontSize: 8.5, color: '#6b7280' }}>{name}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="og-win-foot">
                <span className="og-muted">1 serviço adicionado</span>
                <span className="og-btn og-btn--pulse">Adicionar</span>
            </div>
        </div>
    );
}

/** Seção 2 · a captura correndo. */
export function AddCaptureDemo() {
    return (
        <div className="og-win" style={{ width: 326 }}>
            <div className="og-win-head" style={{ justifyContent: 'space-between' }}>
                <span className="og-t">Adicionar sessão</span>
                <span className="og-x">×</span>
            </div>
            <div className="og-win-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="og-t og-t--sm">Capturando sessões…</span>
                    <span style={{ fontFamily: 'var(--ap-font-data)', fontSize: 10.5, color: '#6b7280' }}>2/3</span>
                </div>
                <div style={{ height: 5, background: '#eef0f3', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ height: '100%', background: '#1d1d1c', borderRadius: 99, animation: 'og-bar 6.5s ease-in-out infinite' }}></div>
                </div>

                <div className="og-row">
                    <span className="og-chip og-chip--e" style={{ width: 26, height: 26 }}></span>
                    <span className="og-grow og-t og-t--sm" style={{ fontWeight: 500 }}>Netflix</span>
                    <Check />
                </div>
                <div className="og-row">
                    <span className="og-chip og-chip--b" style={{ width: 26, height: 26 }}></span>
                    <span className="og-grow og-t og-t--sm" style={{ fontWeight: 500 }}>Spotify</span>
                    <Check style={{ animation: 'og-check-in 6.5s ease-out infinite' }} />
                </div>
                <div className="og-row">
                    <span className="og-chip" style={{ width: 26, height: 26 }}></span>
                    <span className="og-grow og-t og-t--sm" style={{ fontWeight: 500 }}>ChatGPT</span>
                    <span style={{ width: 15, height: 15, border: '2px solid #e5e7eb', borderTopColor: '#1d1d1c', borderRadius: '50%', animation: 'og-spin .8s linear infinite' }}></span>
                </div>

                <div className="og-note">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                    <span>Mantenha esta aba aberta. As abas dos serviços abrem e fecham sozinhas.</span>
                </div>
            </div>
        </div>
    );
}

/** Seção 3 · o "Compartilhar" da top bar, que é onde ele mora hoje. */
export function ShareButtonDemo() {
    return (
        <>
            <div className="og-win" style={{ position: 'absolute', left: 26, top: 96, width: 388, height: 300 }}>
                <div className="og-win-head" style={{ gap: 8 }}>
                    <div className="og-grow" style={{ height: 30, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 9 }}></div>
                    <span className="og-btn og-btn--ghost og-btn--pulse" style={{ background: '#fff', borderColor: '#1d1d1c', color: '#1d1d1c' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v13" /><path d="m16 6-4-4-4 4" />
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        </svg>
                        Compartilhar
                    </span>
                    <span className="og-btn">+ Adicionar sessão</span>
                </div>
                <div className="og-win-body">
                    <div className="og-t og-t--sm" style={{ marginBottom: 3 }}>Trabalho</div>
                    <div className="og-muted" style={{ marginBottom: 13 }}>3 sessões</div>
                    {[['Netflix', 'og-chip--e'], ['Spotify', 'og-chip--b'], ['ChatGPT', 'og-chip']].map(([name, tone]) => (
                        <div className="og-row" key={name}>
                            <span className={`og-chip ${tone}`} style={{ width: 24, height: 24 }}></span>
                            <span className="og-grow og-t og-t--sm" style={{ fontWeight: 500 }}>{name}</span>
                            <span className="og-muted">Ativa</span>
                        </div>
                    ))}
                </div>
            </div>
            <Cursor animation="og-click-share 6.5s ease-in-out infinite" />
        </>
    );
}

/** Seção 3 · o modal de compartilhar: link e código, e nada mais. */
export function ShareLinkDemo() {
    return (
        <div className="og-win" style={{ width: 316, animation: 'og-rise .5s ease both' }}>
            <div className="og-win-head" style={{ justifyContent: 'space-between' }}>
                <span className="og-t">Compartilhar pacote</span>
                <span className="og-x">×</span>
            </div>
            <div className="og-win-body">
                <div className="og-t og-t--sm" style={{ marginBottom: 9 }}>Link do pacote</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <div className="og-grow" style={{ display: 'flex', alignItems: 'center', height: 36, padding: '0 11px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 9, fontFamily: 'var(--ap-font-data)', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        niango.io/invite/x9f2k…
                    </div>
                    <span className="og-btn og-btn--pulse" style={{ padding: '0 14px', alignSelf: 'stretch' }}>Copiar</span>
                </div>

                <div className="og-note">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                    <span>Compartilhe com quem precisa entrar. Você aprova cada pedido.</span>
                </div>
            </div>
            <div className="og-win-foot">
                <span className="og-muted">Ou use o código</span>
                <span style={{ fontFamily: 'var(--ap-font-data)', fontSize: 11, fontWeight: 600, color: '#374151', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 7, padding: '5px 10px' }}>x9f2k7</span>
            </div>
        </div>
    );
}

/** Seção 3 · a aba de solicitações, onde o acesso é de fato liberado. */
export function ShareApproveDemo() {
    return (
        <div className="og-win" style={{ width: 326, animation: 'og-rise .5s ease both' }}>
            <div className="og-win-head" style={{ justifyContent: 'space-between' }}>
                <span className="og-t">Pessoas do pacote</span>
                <span className="og-x">×</span>
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '10px 15px 0' }}>
                <span style={{ padding: '7px 11px', borderRadius: 8, color: '#6b7280', fontSize: 11.5, fontWeight: 600 }}>Membros</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8, background: 'rgba(29,29,28,.06)', color: '#1d1d1c', fontSize: 11.5, fontWeight: 600 }}>
                    Solicitações
                    <span style={{ minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 99, background: '#1d1d1c', color: '#fdfaf6', fontSize: 9.5, padding: '0 4px' }}>2</span>
                </span>
            </div>
            <div className="og-win-body">
                {[['Marina Alves', 'MA', 'og-chip--d'], ['Rafael Lima', 'RL', 'og-chip--c']].map(([name, mark, tone]) => (
                    <div className="og-row" key={name}>
                        <span className={`og-chip ${tone}`} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10.5, fontWeight: 700 }}>{mark}</span>
                        <div className="og-grow" style={{ lineHeight: 1.25 }}>
                            <div className="og-t og-t--sm" style={{ fontWeight: 500 }}>{name}</div>
                            <div className="og-muted">pediu acesso hoje</div>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, border: '1px solid #e5e7eb', color: '#9ca3af' }}>×</span>
                        <span className="og-btn" style={{ padding: '6px 11px' }}>Aprovar</span>
                    </div>
                ))}

                <div className="og-note og-note--ok">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>A sua senha nunca é revelada</span>
                </div>
            </div>
        </div>
    );
}

export function DoneDemo() {
    const steps = ['Pacote criado', 'Sessões adicionadas', 'Acesso compartilhado'];

    return (
        <div style={{ textAlign: 'center' }}>
            <div className="og-done-mark">
                <div className="og-done-burst"></div>
                <div className="og-done-disc"><Check size={40} color="#fff" /></div>
            </div>
            <div className="og-checklist">
                {steps.map((step) => (
                    <span key={step}><i>✓</i>{step}</span>
                ))}
            </div>
        </div>
    );
}
