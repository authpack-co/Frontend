/**
 * Movimento dos ícones em volta da caixa, no convite.
 *
 * Os ícones saem de dentro da caixa — por cima dela, vindo para quem olha — e
 * pousam nas vagas. Dali em diante descansam flutuando (o flutuar é CSS, não
 * passa por aqui) e, de tempos em tempos, fazem o próximo passo do roteiro do
 * seu número de ícones: giram em volta da caixa, atravessam por trás ou por
 * baixo dela, trocam de lugar, mergulham na caixa e saem de novo. Tudo isso
 * acontece atrás da caixa, e todo passo termina com cada ícone numa vaga, em
 * repouso.
 *
 * As contas são em unidades do desenho (palco de 440×420, ícone de 76) e o
 * deslocamento sai em % do próprio ícone, então o mesmo número serve do
 * desktop ao celular.
 */

const CENTER = { x: 220, y: 200 };
const RADIUS = { x: 178, y: 158 };
const TILE = 76;

// A boca da caixa (de onde os ícones saem e onde mergulham), o miolo do corpo
// dela (por onde as trocas passam, escondidas) e a altura da borda das abas.
const MOUTH = { x: 220, y: 168 };
const BOX_CORE = { x: 220, y: 190 };
const BOX_RIM_Y = 113;

// A caixa fica na camada do meio (z-index 2 no CSS).
const Z_BEHIND = 1;
const Z_FRONT = 3;

// Vagas de descanso, em graus no anel: 0 é a direita, 90 embaixo, 180 a
// esquerda, 270 em cima (ângulo crescendo = sentido horário).
const LEFT = 180;
const RIGHT = 0;
const TOP = 270;
const SLOTS = {
    1: [LEFT],
    2: [LEFT, RIGHT],
    3: [TOP, 30, 150],
    4: [225, 315, 45, 135],
};

// Entrada: espera a caixa terminar de aparecer e solta um ícone de cada vez.
const ENTER_DELAY_MS = 550;
const ENTER_STAGGER_MS = 110;
const EMERGE_MS = 1050;
const LAUNCH_LIFT = 46;

// Descanso entre um passo do roteiro e outro: vivo, mas sem agitação.
const FIRST_REST_MS = [3500, 5000];
const REST_MS = [6000, 9000];

// Passos do roteiro.
const ORBIT_MS = 2600;
const ORBIT_LAG_MS = 140;      // um ícone sai um pouco depois do outro: anel vivo, não peça rígida
const PASS_MS = 2200;          // travessias e trocas
const PASS_STAGGER_MS = 180;   // numa troca, o segundo sai logo depois e eles se cruzam escondidos
const PAIR_GAP_MS = 450;       // na troca em X, o segundo par
const DIVE_IN_MS = 850;
const DIVE_HOLD_MS = 250;      // o tempo dentro da caixa
const DIVE_HOP = 110;          // o pulo antes de cair na caixa
const DIVE_CEILING_Y = -10;    // e até onde ele sobe: o de cima não encosta no cabeçalho
const DIVE_STAGGER_MS = 350;

// Atrás da caixa o ícone encolhe e apaga de leve, como quem se afasta.
const BEHIND_SHRINK = 0.1;
const BEHIND_FADE = 0.2;
// No giro o anel recua e achata até esta altura: os de cima passam por trás
// das abas, os de baixo por trás da base.
const ORBIT_RY = 70;
// Atravessando pelo meio, o ícone sobe só um pouco e some inteiro atrás da caixa.
const PASS_RY = 30;

/*
 * O roteiro de cada número de ícones, em ciclo. Cada passo recebe onde cada
 * ícone está (em graus) e devolve os movimentos.
 */
const SCRIPTS = {
    1: [
        (at) => [pass(at, 0, 'middle')],               // atravessa por trás, pelo meio
        (at) => [pass(at, 0, 'below')],                // volta por baixo da caixa
        (at) => [dive(at, 0, opposite(at[0]))],        // mergulha e sai do outro lado
        (at) => [pass(at, 0, 'above')],                // volta por trás das abas
    ],
    2: [
        (at) => [pass(at, 0, 'middle'), pass(at, 1, 'middle', PASS_STAGGER_MS)], // trocam de lado pelo meio
        (at) => orbit(at, 1),                          // giram: um por cima, o outro por baixo
        (at) => [dive(at, 0, at[1]), dive(at, 1, at[0], DIVE_STAGGER_MS)],       // mergulham e saem trocados
        (at) => orbit(at, -1),                         // giram de volta
    ],
    3: [
        (at) => orbit(at, 1),                          // giram uma vaga
        (at) => swap(at, tileAt(at, 30), tileAt(at, 150)),                       // os de baixo trocam
        (at) => [dive(at, tileAt(at, TOP), TOP)],      // o de cima mergulha e volta
        (at) => orbit(at, -1),                         // giram de volta
    ],
    4: [
        (at) => orbit(at, 1),                          // giram uma vaga
        (at) => [                                      // trocam em X, pelo meio da caixa
            ...swap(at, tileAt(at, 225), tileAt(at, 45)),
            ...swap(at, tileAt(at, 315), tileAt(at, 135), PAIR_GAP_MS),
        ],
        (at) => swap(at, tileAt(at, 225), tileAt(at, 315)),                      // os de cima trocam
        (at) => [dive(at, tileAt(at, 315), 315)],      // um mergulha e volta
        (at) => orbit(at, -1),                         // giram de volta
    ],
};

/**
 * Põe os ícones em movimento. `tiles` são os elementos na ordem das vagas.
 * Devolve a limpeza (para o efeito do React).
 */
export function startOrbit(tiles, { reduced = false } = {}) {
    const count = Math.min(tiles.length, 4);
    if (count === 0) return () => {};

    // Onde cada ícone está no anel, em graus.
    const angles = SLOTS[count].slice();
    const script = SCRIPTS[count];
    let step = 0;
    let frame = 0;
    let timer = 0;

    if (reduced) {
        angles.forEach((deg, i) => place(tiles[i], restPoint(deg)));
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
        const moves = angles.map((deg, tile) => ({
            tile,
            delay: ENTER_DELAY_MS + tile * ENTER_STAGGER_MS,
            duration: EMERGE_MS,
            end: deg,
            at: (t) => emergePoint(t, restPoint(deg)),
        }));
        perform(moves, () => rest(FIRST_REST_MS));
    }

    function rest([min, max]) {
        timer = setTimeout(() => {
            // Aba em segundo plano: ninguém veria, fica para depois.
            if (document.hidden) {
                rest(REST_MS);
                return;
            }
            const moves = script[step % script.length](angles);
            step += 1;
            perform(moves, () => rest(REST_MS));
        }, min + Math.random() * (max - min));
    }

    // Toca os movimentos de um passo; quem não se mexe fica na vaga.
    function perform(moves, done) {
        const total = Math.max(...moves.map((move) => move.delay + move.duration));
        const draw = (elapsed) => moves.forEach((move) => {
            const t = clamp01((elapsed - move.delay) / move.duration);
            place(tiles[move.tile], t === 1 ? restPoint(move.end) : move.at(t));
        });

        // Já no primeiro paint cada ícone está onde o passo começa.
        draw(0);
        play(total, draw, () => {
            moves.forEach((move) => { angles[move.tile] = normalize(move.end); });
            done();
        });
    }

    enter();

    return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
    };
}

/* ------------------------------------------------------------------------
   Movimentos. Cada um diz qual ícone mexe, quando começa, quanto dura, onde
   termina (a vaga, em graus) e onde o ícone está em cada instante t (0 a 1).
   ------------------------------------------------------------------------ */

/** Todos giram `step` vagas em volta da caixa, com o anel recuado para trás dela. */
function orbit(angles, step) {
    const spacing = 360 / angles.length;
    return angles.map((from, tile) => {
        const to = from + step * spacing;
        return {
            tile,
            delay: Math.random() * ORBIT_LAG_MS,
            duration: ORBIT_MS,
            end: to,
            at: (t) => orbitPoint(from + (to - from) * easeInOutSine(t), plateau(t)),
        };
    });
}

/**
 * Um ícone de um lado da caixa vai para o outro: pelo meio (some inteiro atrás
 * dela), por cima (por trás das abas) ou por baixo (por trás da base).
 */
function pass(angles, tile, route, delay = 0) {
    const from = angles[tile];
    // Da esquerda por cima é somar 180 (180 → 360, passando pelos 270); da
    // direita por cima é subtrair (0 → -180). Por baixo, o contrário.
    const viaTop = route !== 'below';
    const to = from + ((from === LEFT) === viaTop ? 180 : -180);
    const point = route === 'middle'
        ? (deg) => middlePoint(deg)
        : (deg, t) => orbitPoint(deg, plateau(t));

    return {
        tile,
        delay,
        duration: PASS_MS,
        end: to,
        at: (t) => point(from + (to - from) * easeInOutSine(t), t),
    };
}

/** Dois ícones trocam de vaga, cruzando-se escondidos no miolo da caixa. */
function swap(angles, a, b, delay = 0) {
    const pa = restPoint(angles[a]);
    const pb = restPoint(angles[b]);
    // A curva passa pelo miolo da caixa no meio do caminho.
    const bend = {
        x: 2 * BOX_CORE.x - (pa.x + pb.x) / 2,
        y: 2 * BOX_CORE.y - (pa.y + pb.y) / 2,
    };

    return [
        curveMove(a, pa, bend, pb, angles[b], delay),
        curveMove(b, pb, bend, pa, angles[a], delay + PASS_STAGGER_MS),
    ];
}

function curveMove(tile, from, bend, to, end, delay) {
    return {
        tile,
        delay,
        duration: PASS_MS,
        end,
        at: (t) => ({
            ...bezier(from, bend, to, easeInOutSine(t)),
            ...behind(Math.sin(Math.PI * t)),
        }),
    };
}

/**
 * O ícone dá um pulo, cai dentro da caixa (por trás das abas), fica um
 * instante lá dentro e sai de novo — por cima da caixa, como na entrada —
 * para a vaga `toDeg`.
 */
function dive(angles, tile, toDeg, delay = 0) {
    const from = restPoint(angles[tile]);
    const to = restPoint(toDeg);
    const hop = {
        x: from.x + (MOUTH.x - from.x) * 0.55,
        y: Math.max(Math.min(from.y, BOX_RIM_Y) - DIVE_HOP, DIVE_CEILING_Y),
    };
    const duration = DIVE_IN_MS + DIVE_HOLD_MS + EMERGE_MS;

    return {
        tile,
        delay,
        duration,
        end: toDeg,
        at: (t) => {
            const ms = t * duration;
            if (ms < DIVE_IN_MS) {
                const u = ms / DIVE_IN_MS;
                return {
                    ...bezier(from, hop, MOUTH, easeInOutSine(u)),
                    scale: 1 - 0.6 * u * u,
                    opacity: 1 - clamp01((u - 0.65) / 0.35),
                    z: Z_BEHIND,
                };
            }
            if (ms < DIVE_IN_MS + DIVE_HOLD_MS) return { ...MOUTH, scale: 0.3, opacity: 0, z: Z_BEHIND };
            return emergePoint((ms - DIVE_IN_MS - DIVE_HOLD_MS) / EMERGE_MS, to);
        },
    };
}

/* ------------------------------------------------------------------------
   Pontos.
   ------------------------------------------------------------------------ */

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

/** Saindo da caixa, por cima dela: da boca até a vaga, num arco. */
function emergePoint(t, rest) {
    return {
        ...launchPoint(easeOutCubic(t), rest),
        scale: 0.3 + 0.7 * easeOutBack(t),
        opacity: clamp01(t / 0.25),
        z: Z_FRONT,
    };
}

/** No anel recuado: `recede` 0 é o anel do desenho, 1 é o anel achatado atrás da caixa. */
function orbitPoint(deg, recede) {
    const angle = toRad(deg);
    const ry = RADIUS.y + (ORBIT_RY - RADIUS.y) * recede;
    return {
        x: CENTER.x + Math.cos(angle) * RADIUS.x,
        y: CENTER.y + Math.sin(angle) * ry,
        ...behind(recede),
    };
}

/** De um lado ao outro pelo meio: mais fundo (e escondido) quanto mais perto do centro. */
function middlePoint(deg) {
    const angle = toRad(deg);
    return {
        x: CENTER.x + Math.cos(angle) * RADIUS.x,
        y: CENTER.y + Math.sin(angle) * PASS_RY,
        ...behind(Math.abs(Math.sin(angle))),
    };
}

function behind(depth) {
    return {
        scale: 1 - BEHIND_SHRINK * depth,
        opacity: 1 - BEHIND_FADE * depth,
        z: Z_BEHIND,
    };
}

/** Arco da boca da caixa até a vaga: sobe, abre para o lado da vaga e pousa. */
function launchPoint(t, to) {
    const bend = {
        x: (MOUTH.x + to.x) / 2 + (to.x - MOUTH.x) / 4,
        y: Math.min(MOUTH.y, to.y) - LAUNCH_LIFT,
    };
    return bezier(MOUTH, bend, to, t);
}

function place(el, { x, y, scale = 1, opacity = 1, z }) {
    const dx = ((x - TILE / 2) / TILE) * 100;
    const dy = ((y - TILE / 2) / TILE) * 100;
    el.style.transform = `translate(${dx.toFixed(2)}%, ${dy.toFixed(2)}%) scale(${scale.toFixed(4)})`;
    el.style.opacity = opacity.toFixed(3);
    el.style.zIndex = String(z);
}

/* ------------------------------------------------------------------------
   Contas.
   ------------------------------------------------------------------------ */

function tileAt(angles, deg) {
    return angles.findIndex((a) => Math.abs(a - deg) < 0.5);
}

function opposite(deg) {
    return deg === LEFT ? RIGHT : LEFT;
}

function bezier(from, bend, to, t) {
    const u = 1 - t;
    return {
        x: u * u * from.x + 2 * u * t * bend.x + t * t * to.x,
        y: u * u * from.y + 2 * u * t * bend.y + t * t * to.y,
    };
}

const toRad = (deg) => (deg * Math.PI) / 180;
const normalize = (deg) => ((deg % 360) + 360) % 360;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutSine = (t) => (1 - Math.cos(Math.PI * t)) / 2;

function easeOutBack(t) {
    const c1 = 1.70158;
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function smoothstep(from, to, v) {
    const t = clamp01((v - from) / (to - from));
    return t * t * (3 - 2 * t);
}

// Recua no primeiro quarto, gira recuado, volta para a vaga no último quarto.
const plateau = (t) => smoothstep(0, 0.28, t) * (1 - smoothstep(0.72, 1, t));
