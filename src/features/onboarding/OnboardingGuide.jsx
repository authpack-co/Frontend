import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WEBSTORE_URL } from '../../lib/extension.js';
import {
    AddCaptureDemo,
    AddOpenDemo,
    AddPickDemo,
    CreateDemo,
    CreatedDemo,
    DoneDemo,
    ShareApproveDemo,
    ShareButtonDemo,
    ShareLinkDemo,
    WelcomeDemo,
} from './demos.jsx';
import './onboarding.css';

/**
 * Guia de primeiros passos.
 *
 * Um slide de boas-vindas e três seções, com abas no topo para saltar entre
 * elas: criar um pacote, adicionar sessões, compartilhar. Cada slide mostra a
 * tela de que fala.
 *
 * Ele existia no painel antigo e se perdeu quando o painel virou React — o
 * CSS dele até ficou no projeto, sem ninguém para usá-lo. Isto é o porte, com
 * a seção de compartilhar reescrita: ela ainda descrevia um "link público"
 * que ativava o pacote sozinho, e hoje o link só serve para pedir acesso —
 * quem libera é o dono, na aba de solicitações.
 */

const SLIDE_MS = 7000;
const TICK_MS = 33;

const SECTIONS = [
    { id: 'create', label: 'Criar pacote' },
    { id: 'sessions', label: 'Adicionar sessões' },
    { id: 'share', label: 'Compartilhar' },
];

// `section: -1` é o slide de boas-vindas: fora das três seções, e por isso
// nenhuma aba fica acesa nele.
const SLIDES = [
    {
        section: -1,
        demo: <WelcomeDemo />,
        eyebrow: 'Bem-vindo',
        title: 'Bem-vindo ao Niango',
        text: <>Distribua e controle seus acessos em um só lugar.</>,
        centered: true,
    },
    {
        section: 0,
        demo: <CreateDemo />,
        eyebrow: 'Seção 1 · Criar um pacote',
        title: 'Crie o seu pacote',
        text: <>O <strong>pacote</strong> guarda suas sessões de login. Dê um nome e confirme.</>,
    },
    {
        section: 0,
        demo: <CreatedDemo />,
        eyebrow: 'Seção 1 · Criar um pacote',
        title: 'Pacote criado',
        text: <>Ele nasce vazio na sua coleção. Agora é só adicionar as sessões.</>,
        centered: true,
    },
    {
        section: 1,
        demo: <AddOpenDemo />,
        eyebrow: 'Seção 2 · Adicionar sessões',
        title: 'Clique em “Adicionar sessão”',
        text: <>Com o pacote aberto, o botão fica no topo da plataforma.</>,
    },
    {
        section: 1,
        demo: <AddPickDemo />,
        eyebrow: 'Seção 2 · Adicionar sessões',
        title: 'Escolha os serviços',
        text: <>Busque pelo nome ou clique nos populares. Pode escolher vários.</>,
        centered: true,
    },
    {
        section: 1,
        demo: <AddCaptureDemo />,
        eyebrow: 'Seção 2 · Adicionar sessões',
        title: 'O Niango captura pra você',
        text: <>As abas abrem e fecham sozinhas. Só <strong>mantenha esta aba aberta</strong>.</>,
        centered: true,
    },
    {
        section: 2,
        demo: <ShareButtonDemo />,
        eyebrow: 'Seção 3 · Compartilhar',
        title: 'Clique em “Compartilhar”',
        text: <>Com o pacote pronto, o botão fica no topo, ao lado de “Adicionar sessão”.</>,
    },
    {
        section: 2,
        demo: <ShareLinkDemo />,
        eyebrow: 'Seção 3 · Compartilhar',
        title: 'Envie o link do pacote',
        text: (
            <>Ou o código, se for mais fácil de ditar. O link não abre o acesso
            sozinho: quem recebe <strong>pede</strong>, e você decide.</>
        ),
        centered: true,
    },
    {
        section: 2,
        demo: <ShareApproveDemo />,
        eyebrow: 'Seção 3 · Compartilhar',
        title: 'Aprove quem pediu',
        text: (
            <>Os pedidos chegam em <strong>Pessoas · Solicitações</strong>. Ao
            aprovar, a pessoa entra direto nas sessões — <strong>sua senha nunca
            aparece</strong>.</>
        ),
        centered: true,
    },
    {
        section: 2,
        demo: <DoneDemo />,
        eyebrow: 'Tudo pronto',
        eyebrowTone: 'success',
        title: 'É só começar 🎉',
        text: <>Falta instalar a extensão, que é quem captura suas sessões.</>,
        success: true,
        final: true,
        centered: true,
    },
];

const firstSlideOf = (section) => SLIDES.findIndex((slide) => slide.section === section);
const slidesIn = (section) => SLIDES.filter((slide) => slide.section === section).length;

export default function OnboardingGuide({ open, startSection, onClose }) {
    const [index, setIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [visible, setVisible] = useState(false);
    const hovering = useRef(false);

    const slide = SLIDES[index];
    const isLast = index >= SLIDES.length - 1;

    const go = useCallback((next) => {
        setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
        setProgress(0);
    }, []);

    // Abrir posiciona o guia; a classe .show entra num segundo quadro, senão a
    // transição de entrada não tem de onde partir.
    useEffect(() => {
        if (!open) { setVisible(false); return undefined; }

        const section = SECTIONS.findIndex((item) => item.id === startSection);
        setIndex(section >= 0 ? firstSlideOf(section) : 0);
        setProgress(0);
        setPlaying(true);
        hovering.current = false;

        const frame = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(frame);
    }, [open, startSection]);

    // O relógio só enche a barra. Trocar de slide é o efeito seguinte, e não
    // uma emenda dentro deste setState: em StrictMode o React chama o
    // atualizador duas vezes, e o guia pularia um slide a cada avanço.
    useEffect(() => {
        if (!open || !playing) return undefined;

        const timer = setInterval(() => {
            if (hovering.current) return;
            setProgress((value) => Math.min(1, value + TICK_MS / SLIDE_MS));
        }, TICK_MS);

        return () => clearInterval(timer);
    }, [open, playing]);

    // Barra cheia, próximo slide. O último fica: ele tem os botões de instalar
    // e concluir, e trocar sozinho ali tiraria a decisão de quem está lendo.
    useEffect(() => {
        if (!open || progress < 1 || isLast) return;
        setIndex((current) => current + 1);
        setProgress(0);
    }, [open, progress, isLast]);

    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
            else if (event.key === 'ArrowRight') { if (!isLast) go(index + 1); }
            else if (event.key === 'ArrowLeft') go(index - 1);
        };

        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [open, index, isLast, go, onClose]);

    if (!open) return null;

    const sectionStart = firstSlideOf(slide.section);
    const sectionCount = slidesIn(slide.section);

    return createPortal(
        <div
            className={`og-overlay${visible ? ' show' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Guia do Niango"
            onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <div
                className="og-card"
                onMouseEnter={() => { hovering.current = true; }}
                onMouseLeave={() => { hovering.current = false; }}
            >
                <button className="og-close" type="button" aria-label="Fechar guia" onClick={onClose}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                    </svg>
                </button>

                <div className="og-head">
                    {SECTIONS.map((section, position) => (
                        <button
                            key={section.id}
                            className={`og-tab${position === slide.section ? ' active' : ''}`}
                            type="button"
                            onClick={() => go(firstSlideOf(position))}
                        >
                            <span className="og-tab-num">{position + 1}</span>
                            <span className="og-tab-label">{section.label}</span>
                        </button>
                    ))}
                </div>

                <div className="og-viewport">
                    {/* Os dez slides ficam montados lado a lado e o trilho
                        desliza: é a transição, e é também o que deixa as
                        animações das maquetes já correndo quando o slide
                        chega. */}
                    <div className="og-track" style={{ transform: `translateX(-${index * 100}%)` }}>
                        {SLIDES.map((item, position) => (
                            <div className="og-slide" key={position}>
                                <div className={`og-demo${item.success ? ' og-demo--success' : ''}`}>
                                    {item.demo}
                                </div>
                                <div className="og-copy">
                                    <div className={`og-eyebrow${item.eyebrowTone === 'success' ? ' og-eyebrow--success' : ''}`}>
                                        {item.eyebrow}
                                    </div>
                                    <h2 className="og-title">{item.title}</h2>
                                    <p className="og-text">{item.text}</p>

                                    {item.final && (
                                        <div className="og-actions">
                                            <a className="og-install-btn" href={WEBSTORE_URL} target="_blank" rel="noreferrer">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 3v12" /><path d="m7 10 5 5 5-5" />
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                </svg>
                                                Instalar extensão
                                            </a>
                                            <button className="og-done-btn" type="button" onClick={onClose}>
                                                Começar a usar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="og-foot">
                    <div className="og-progress">
                        <div className="og-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }}></div>
                    </div>

                    <div className="og-controls">
                        <button className="og-prev" type="button" disabled={index === 0} onClick={() => go(index - 1)}>
                            ‹ Voltar
                        </button>

                        {/* Os pontos contam os slides DA SEÇÃO, não os dez: as
                            abas já dizem onde a pessoa está no guia inteiro. */}
                        <div className="og-dots">
                            {Array.from({ length: sectionCount }, (_, position) => (
                                <button
                                    key={position}
                                    className={`og-dot${sectionStart + position === index ? ' active' : ''}`}
                                    type="button"
                                    aria-label={`Ir para o passo ${position + 1}`}
                                    onClick={() => go(sectionStart + position)}
                                />
                            ))}
                        </div>

                        <div className="og-right">
                            <button
                                className="og-play"
                                type="button"
                                title={playing ? 'Pausar' : 'Reproduzir'}
                                aria-label={playing ? 'Pausar' : 'Reproduzir'}
                                onClick={() => setPlaying((value) => !value)}
                            >
                                {playing ? '❚❚' : '▶'}
                            </button>
                            <button
                                className="og-next"
                                type="button"
                                onClick={() => (isLast ? onClose() : go(index + 1))}
                            >
                                {isLast ? 'Concluir' : 'Próximo ›'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
