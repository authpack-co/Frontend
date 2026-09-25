/**
 * Movimento dos ícones em volta da caixa, no convite.
 *
 * São três tempos: os ícones saem de dentro da caixa e pousam nas vagas do
 * desenho; descansam (o flutuar é CSS, não passa por aqui); e, de vez em
 * quando, o anel inclina como um carrossel, gira uma vaga — os de cima passam
 * por trás da caixa, os de baixo pela frente — e volta a ficar de frente. É o
 * giro que faz os ícones trocarem de lugar entre si.
 *
 * As contas são em unidades do desenho (palco de 440×420, ícone de 76) e o
 * deslocamento sai em % do próprio ícone, então o mesmo número serve do
 * desktop ao celular.
 */

const CENTER = { x: 220, y: 200 };
const RADIUS = { x: 178, y: 158 };
const TILE = 76;
const FIRST_SLOT_DEG = -120;

// A boca da caixa: os ícones nascem ali, escondidos atrás da parede do fundo.
const MOUTH = { x: 220, y: 168 };

// A caixa fica na camada do meio (z-index 2 no CSS).
const Z_BEHIND = 1;
const Z_FRONT = 3;

// Entrada: espera a caixa terminar de aparecer e solta um ícone de cada vez.
const ENTER_DELAY_MS = 550;
const ENTER_STAGGER_MS = 110;
const ENTER_MS = 1050;
const LAUNCH_LIFT = 46;

// Giro: raro e curto, para parecer vivo sem chamar atenção o tempo todo.
const FIRST_TURN_MS = [4500, 6500];
const TURN_GAP_MS = [9000, 14000];
const TURN_MAX_MS = 4200;
// Cada ícone sai um pouco depois do outro: anel vivo, não peça rígida.
const TURN_LAG_MS = 160;
// Com o anel inclinado: quanto ele achata, quanto o ícone cresce na frente
// (e encolhe atrás) e quanto apaga quando passa por trás da caixa.
const TILT_SQUASH = 0.4;
const DEPTH_SCALE = 0.1;
const DEPTH_FADE = 0.3;

/**
 * Põe os ícones em movimento. `tiles` são os elementos na ordem das vagas.
 * Devolve a limpeza (para o efeito do React).
 */
export function startOrbit(tiles, { reduced = false } = {}) {
    const count = tiles.length;
    if (count === 0) return () => {};

    // slots[i]: a vaga onde o ícone i está agora.
    let slots = tiles.map((_, i) => i);
    let frame = 0;
    let timer = 0;

    const restOf = (i) => ringPoint(slotDeg(slots[i], count), 0);

    if (reduced) {
        tiles.forEach((el, i) => place(el, restOf(i)));
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

    function scheduleTurn([min, max]) {
        timer = setTimeout(() => {
            // Aba em segundo plano: ninguém veria o giro, fica para depois.
            if (document.hidden) scheduleTurn(TURN_GAP_MS);
            else turn(pickStep(count));
        }, min + Math.random() * (max - min));
    }

    function enter() {
        const total = ENTER_DELAY_MS + (count - 1) * ENTER_STAGGER_MS + ENTER_MS;
        const draw = (elapsed) => tiles.forEach((el, i) => {
            const t = clamp01((elapsed - ENTER_DELAY_MS - i * ENTER_STAGGER_MS) / ENTER_MS);
            const rest = restOf(i);
            if (t >= 1) {
                place(el, rest);
                return;
            }
            const at = launchPoint(easeOutCubic(t), rest);
            place(el, {
                x: at.x,
                y: at.y,
                scale: 0.3 + 0.7 * easeOutBack(t),
                opacity: clamp01(t / 0.25),
                z: Z_BEHIND,
            });
        });

        // Já no primeiro paint os ícones estão dentro da caixa, não nas vagas.
        draw(0);
        play(total, draw, () => scheduleTurn(FIRST_TURN_MS));
    }

    function turn(step) {
        const delta = (step * 360) / count;
        const from = slots.map((slot) => slotDeg(slot, count));
        const lags = tiles.map(() => Math.random() * TURN_LAG_MS);
        const duration = Math.min(1400 + Math.abs(delta) * 20, TURN_MAX_MS);
        const total = duration + TURN_LAG_MS;

        play(total, (elapsed) => {
            const tilt = plateau(elapsed / total);
            tiles.forEach((el, i) => {
                const t = clamp01((elapsed - lags[i]) / duration);
                place(el, ringPoint(from[i] + delta * easeInOutCubic(t), tilt));
            });
        }, () => {
            slots = slots.map((slot) => mod(slot + step, count));
            scheduleTurn(TURN_GAP_MS);
        });
    }

    enter();

    return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
    };
}

/** Quase sempre uma vaga no sentido horário; às vezes volta, às vezes pula duas. */
function pickStep(count) {
    const roll = Math.random();
    if (roll < 0.2) return -1;
    if (roll < 0.3 && count >= 5) return 2;
    return 1;
}

function slotDeg(slot, count) {
    return FIRST_SLOT_DEG + (slot * 360) / count;
}

/**
 * Ponto do anel num ângulo. Com `tilt` 0 é o anel de frente do desenho; com 1,
 * inclinado: a metade de cima vai para trás da caixa, a de baixo para a frente.
 */
function ringPoint(deg, tilt) {
    const angle = (deg * Math.PI) / 180;
    const side = Math.sin(angle);
    const depth = side * tilt;

    return {
        x: CENTER.x + Math.cos(angle) * RADIUS.x,
        y: CENTER.y + side * RADIUS.y * (1 - TILT_SQUASH * tilt),
        scale: 1 + DEPTH_SCALE * depth,
        opacity: 1 - DEPTH_FADE * Math.max(0, -depth),
        z: side < 0 ? Z_BEHIND : Z_FRONT,
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

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mod = (v, n) => ((v % n) + n) % n;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2);

function easeOutBack(t) {
    const c1 = 1.70158;
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function smoothstep(from, to, v) {
    const t = clamp01((v - from) / (to - from));
    return t * t * (3 - 2 * t);
}

// Inclina no primeiro quarto, gira inclinado, volta de frente no último quarto.
const plateau = (t) => smoothstep(0, 0.28, t) * (1 - smoothstep(0.72, 1, t));
