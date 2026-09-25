/**
 * Movimento dos ícones em volta da caixa, no convite.
 *
 * Os ícones saem de dentro da caixa — por cima dela, vindo para quem olha — e
 * pousam nas vagas do desenho; dali em diante só flutuam (o flutuar é CSS, não
 * passa por aqui). A exceção é o pacote com um ou dois serviços: com a órbita
 * quase vazia, os ícones ficam dos lados da caixa e, de vez em quando, brincam
 * de passar por trás dela para o outro lado.
 *
 * As contas são em unidades do desenho (palco de 440×420, ícone de 76) e o
 * deslocamento sai em % do próprio ícone, então o mesmo número serve do
 * desktop ao celular.
 */

const CENTER = { x: 220, y: 200 };
const RADIUS = { x: 178, y: 158 };
const TILE = 76;
const FIRST_SLOT_DEG = -120;

// Até quantos ícones a órbita fica vazia o bastante para eles brincarem.
const PLAYFUL_MAX = 2;

// Os lados da caixa, em graus. 360 e não 0: assim ir de um lado ao outro, nos
// dois sentidos, passa pelos 270 — o fundo, atrás da caixa.
const LEFT = 180;
const RIGHT = 360;

// A boca da caixa: é dali que os ícones saem.
const MOUTH = { x: 220, y: 168 };

// A caixa fica na camada do meio (z-index 2 no CSS): os ícones saem por cima
// dela e atravessam por trás.
const Z_BEHIND = 1;
const Z_FRONT = 3;

// Entrada: espera a caixa terminar de aparecer e solta um ícone de cada vez.
const ENTER_DELAY_MS = 550;
const ENTER_STAGGER_MS = 110;
const ENTER_MS = 1050;
const LAUNCH_LIFT = 46;

// Travessia: rara e calma, para parecer brincadeira e não agitação. Por trás
// da caixa o ícone sobe um pouco, encolhe e apaga de leve, como quem se afasta.
// Com dois, um sai logo depois do outro e eles se cruzam escondidos.
const FIRST_CROSS_MS = [3000, 4500];
const CROSS_GAP_MS = [7000, 11000];
const CROSS_MS = 2200;
const CROSS_STAGGER_MS = 180;
const CROSS_RISE = 30;
const CROSS_SHRINK = 0.1;
const CROSS_FADE = 0.2;

/**
 * Põe os ícones em movimento. `tiles` são os elementos na ordem das vagas.
 * Devolve a limpeza (para o efeito do React).
 */
export function startOrbit(tiles, { reduced = false } = {}) {
    const count = tiles.length;
    if (count === 0) return () => {};

    const playful = count <= PLAYFUL_MAX;

    // Onde cada ícone está no anel. Só muda quando eles brincam.
    let angles = tiles.map((_, i) => (playful
        ? [LEFT, RIGHT][i]
        : FIRST_SLOT_DEG + (i * 360) / count));
    let frame = 0;
    let timer = 0;

    if (reduced) {
        tiles.forEach((el, i) => place(el, restPoint(angles[i])));
        return () => {};
    }

    function play(duration, draw, done) {
        let start = null;
        const tick = (now) => {
            if (start === null) start = now;
            const elapsed = Math.min(now - start, duration);
            draw(elapsed);
            if (elapsed < duration) frame = requestAnimationFrame(tick);
            else done();
        };
        frame = requestAnimationFrame(tick);
    }

    function enter() {
        const total = ENTER_DELAY_MS + (count - 1) * ENTER_STAGGER_MS + ENTER_MS;
        const draw = (elapsed) => tiles.forEach((el, i) => {
            const t = clamp01((elapsed - ENTER_DELAY_MS - i * ENTER_STAGGER_MS) / ENTER_MS);
            const rest = restPoint(angles[i]);
            if (t === 1) {
                place(el, rest);
                return;
            }
            place(el, {
                ...launchPoint(easeOutCubic(t), rest),
                scale: 0.3 + 0.7 * easeOutBack(t),
                opacity: clamp01(t / 0.25),
                z: Z_FRONT,
            });
        });

        // Já no primeiro paint os ícones estão na boca da caixa, não nas vagas.
        draw(0);
        play(total, draw, () => {
            if (playful) scheduleCross(FIRST_CROSS_MS);
        });
    }

    function scheduleCross([min, max]) {
        timer = setTimeout(() => {
            // Aba em segundo plano: ninguém veria, fica para depois.
            if (document.hidden) scheduleCross(CROSS_GAP_MS);
            else cross();
        }, min + Math.random() * (max - min));
    }

    // Cada ícone vai para o outro lado passando por trás da caixa; com dois,
    // eles trocam de lado.
    function cross() {
        const from = angles;
        const to = from.map((deg) => (deg === LEFT ? RIGHT : LEFT));
        const lead = Math.floor(Math.random() * count);
        const delays = tiles.map((_, i) => ((i - lead + count) % count) * CROSS_STAGGER_MS);

        play(CROSS_MS + (count - 1) * CROSS_STAGGER_MS, (elapsed) => tiles.forEach((el, i) => {
            const t = clamp01((elapsed - delays[i]) / CROSS_MS);
            if (t === 0) place(el, restPoint(from[i]));
            else if (t === 1) place(el, restPoint(to[i]));
            else place(el, backPoint(from[i] + (to[i] - from[i]) * easeInOutSine(t)));
        }), () => {
            angles = to;
            scheduleCross(CROSS_GAP_MS);
        });
    }

    enter();

    return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
    };
}

/** A vaga de descanso num ângulo do anel do desenho. */
function restPoint(deg) {
    const angle = toRad(deg);
    return {
        x: CENTER.x + Math.cos(angle) * RADIUS.x,
        y: CENTER.y + Math.sin(angle) * RADIUS.y,
        scale: 1,
        opacity: 1,
        z: Z_FRONT,
    };
}

/** Caminho por trás da caixa, de um lado ao outro (de 180° a 360°). */
function backPoint(deg) {
    const angle = toRad(deg);
    const depth = -Math.sin(angle); // 0 nos lados, 1 bem atrás da caixa

    return {
        x: CENTER.x + Math.cos(angle) * RADIUS.x,
        y: CENTER.y - CROSS_RISE * depth,
        scale: 1 - CROSS_SHRINK * depth,
        opacity: 1 - CROSS_FADE * depth,
        z: Z_BEHIND,
    };
}

/** Arco da boca da caixa até a vaga: sobe, abre para o lado da vaga e pousa. */
function launchPoint(t, to) {
    const bend = {
        x: (MOUTH.x + to.x) / 2 + (to.x - MOUTH.x) / 4,
        y: Math.min(MOUTH.y, to.y) - LAUNCH_LIFT,
    };
    const u = 1 - t;

    return {
        x: u * u * MOUTH.x + 2 * u * t * bend.x + t * t * to.x,
        y: u * u * MOUTH.y + 2 * u * t * bend.y + t * t * to.y,
    };
}

function place(el, { x, y, scale = 1, opacity = 1, z }) {
    const dx = ((x - TILE / 2) / TILE) * 100;
    const dy = ((y - TILE / 2) / TILE) * 100;
    el.style.transform = `translate(${dx.toFixed(2)}%, ${dy.toFixed(2)}%) scale(${scale.toFixed(4)})`;
    el.style.opacity = opacity.toFixed(3);
    el.style.zIndex = String(z);
}

const toRad = (deg) => (deg * Math.PI) / 180;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutSine = (t) => (1 - Math.cos(Math.PI * t)) / 2;

function easeOutBack(t) {
    const c1 = 1.70158;
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}
