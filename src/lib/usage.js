/**
 * Cálculo de uso a partir do histórico de acessos.
 *
 * Porte fiel das funções que viviam no contentRenderer.js — mesmas regras,
 * mesmos números, sem DOM. A parte delicada é a divisão na meia-noite: um
 * acesso que atravessa o dia vira uma fatia em cada dia local, e é isso que
 * faz o total do card bater com o do gráfico.
 */

// Janela do costume: quantos dias entram na média de um dia normal.
export const USAGE_BASELINE_DAYS = 30;

// Faixa em que hoje conta como "no costume" — evita o badge piscando 96%/104%.
export const USAGE_ON_PAR_TOLERANCE = 0.10;

// Janela do heartbeat: um acesso conta como vivo enquanto o fim dele estiver a
// menos disto de agora.
export const ONLINE_WINDOW_SECONDS = 60;

const pad = (value) => String(value).padStart(2, '0');

// ─── Formatação ───────────────────────────────────────────────────────────

/** Chave de dia no formato do histórico: "DD/MM/AAAA". */
export function dateKey(date) {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "YYYY-MM-DDTHH:mm:ss" sem Z — representa horário local. */
export function localDateTime(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
        + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDuration(seconds) {
    let remaining = Math.max(0, Math.floor(seconds));

    const units = [
        { label: 'd', value: 86400 },
        { label: 'h', value: 3600 },
        { label: 'm', value: 60 },
        { label: 's', value: 1 },
    ];

    const parts = [];
    for (const unit of units) {
        if (remaining >= unit.value) {
            parts.push(`${Math.floor(remaining / unit.value)}${unit.label}`);
            remaining %= unit.value;
        }
        if (parts.length === 2) break;
    }

    return parts.length ? parts.join(' ') : '0s';
}

/**
 * Horas no mesmo texto do resto da tela — é o mesmo tempo que aparece nas
 * linhas e no gráfico, então tem que sair igual. hours === -1 é o marcador
 * antigo de "sem registro" e vale 0.
 */
export function formatHours(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return '0s';
    return formatDuration(Math.round(hours * 3600));
}

export function formatMultiplier(ratio) {
    return ratio >= 10 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1).replace('.', ',')}×`;
}

export function timeAgo(value) {
    if (!value) return '—';
    const past = new Date(value);
    if (Number.isNaN(past.getTime())) return '—';

    const seconds = Math.floor((Date.now() - past.getTime()) / 1000);
    if (seconds < 60) return 'agora mesmo';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `há ${days} dia${days > 1 ? 's' : ''}`;

    const months = Math.floor(days / 30);
    if (months < 12) return `há ${months} mês${months > 1 ? 'es' : ''}`;

    return `há ${Math.floor(months / 12)} ano${Math.floor(months / 12) > 1 ? 's' : ''}`;
}

// ─── Histórico ────────────────────────────────────────────────────────────

/**
 * Normaliza o histórico cru do backend em um mapa "DD/MM/AAAA" → acessos.
 *
 * Um acesso que atravessa a meia-noite é dividido: cada dia recebe só os
 * segundos que caíram nele. Sem isso, uma madrugada inteira apareceria como
 * uso do dia anterior.
 */
export function processRawAccessHistory(rawAccessHistory) {
    const result = {};

    for (const record of rawAccessHistory || []) {
        // O timestamp vem em UTC; o Date converte para local sozinho.
        const start = new Date(record.connected_at);
        let remaining = Math.max(0, record.usage_time_seconds || 0);

        const push = (day, at, seconds) => {
            result[day] = result[day] || [];
            result[day].push({
                accessId: record.access_id,
                sessionId: record.session_id,
                userId: record.user_id,
                localDateTime: localDateTime(at),
                usageTimeSeconds: seconds,
            });
        };

        // Sem tempo de uso, o evento pertence ao dia local do connected_at.
        if (remaining === 0) {
            push(dateKey(start), start, 0);
            continue;
        }

        let cursor = new Date(start);
        while (remaining > 0) {
            const endOfDay = new Date(
                cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59, 999
            );
            const untilMidnight = Math.ceil((endOfDay.getTime() - cursor.getTime()) / 1000);
            const take = Math.min(remaining, untilMidnight);

            push(dateKey(cursor), cursor, take);

            remaining -= take;
            cursor = new Date(endOfDay.getTime() + 1);
        }
    }

    return result;
}

/**
 * Recorta um mapa por dia nos últimos N dias.
 *
 * As chaves não trazem ano utilizável para comparação direta, então uma data
 * que cairia no futuro é entendida como do ano passado.
 */
export function filterByLastDays(dataByDate, days) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - days);

    return Object.entries(dataByDate || {})
        .filter(([key]) => {
            const [day, month] = key.split('/');
            let date = new Date(today.getFullYear(), month - 1, day);
            date.setHours(0, 0, 0, 0);
            if (date > today) date = new Date(today.getFullYear() - 1, month - 1, day);
            return date >= cutoff && date <= today;
        })
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
}

function iterateTouchedHours(start, end, callback) {
    const current = new Date(start);
    current.setMinutes(0, 0, 0);

    while (current < end) {
        const nextHour = new Date(current.getTime() + 3600000);
        callback(new Date(current));
        current.setTime(nextHour.getTime());
    }
}

/**
 * Uso do pacote por dia: horas, pessoas distintas e a hora de pico.
 *
 * Pessoas e pico são contados por hora tocada (quem ficou das 9h às 11h conta
 * nas três), enquanto as horas somam o tempo de fato — são perguntas
 * diferentes: "quantos passaram por aqui" e "quanto se usou".
 */
export function getPackageHistoryUsage(accessHistory) {
    const dailyData = {};

    const ensureDay = (key) => {
        if (!dailyData[key]) {
            dailyData[key] = { totalSeconds: 0, users: new Set(), usersByHour: {} };
        }
        return dailyData[key];
    };

    Object.values(accessHistory || {}).flat().forEach((access) => {
        const { userId, usageTimeSeconds } = access;
        const start = new Date(access.localDateTime);
        const end = usageTimeSeconds > 0
            ? new Date(start.getTime() + usageTimeSeconds * 1000)
            : new Date(start.getTime() + 1000);

        iterateTouchedHours(start, end, (hourTime) => {
            const day = ensureDay(dateKey(hourTime));
            const hourKey = `${pad(hourTime.getHours())}:00`;

            day.usersByHour[hourKey] = day.usersByHour[hourKey] || new Set();
            day.users.add(userId);
            day.usersByHour[hourKey].add(userId);
        });

        if (usageTimeSeconds > 0) {
            ensureDay(dateKey(start)).totalSeconds += usageTimeSeconds;
        }
    });

    const result = {};
    Object.entries(dailyData).forEach(([day, data]) => {
        let peakHour = '00:00';
        let peakCount = 0;

        Object.entries(data.usersByHour).forEach(([hour, users]) => {
            if (users.size > peakCount) {
                peakCount = users.size;
                peakHour = hour;
            }
        });

        result[day] = {
            hours: parseFloat((data.totalSeconds / 3600).toFixed(4)),
            users: data.users.size,
            peak: { hour: peakHour, count: peakCount },
        };
    });

    return result;
}

/** Uso de hoje por hora — a visão "Hoje" do gráfico. */
export function getDailyPackageUsage(accessHistory, currentDate = new Date()) {
    const todayAccesses = (accessHistory || {})[dateKey(currentDate)];
    if (!todayAccesses) return {};

    const hourlyData = {};

    todayAccesses.forEach((access) => {
        const { userId, usageTimeSeconds } = access;
        const start = new Date(access.localDateTime);
        const end = new Date(start.getTime() + usageTimeSeconds * 1000);

        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

        // Atravessando o dia, só a parte que ficou nele conta aqui.
        const seconds = startDay.getTime() === endDay.getTime()
            ? usageTimeSeconds
            : (new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999)
                .getTime() - start.getTime()) / 1000;

        const hourKey = `${pad(start.getHours())}:00`;
        hourlyData[hourKey] = hourlyData[hourKey] || { totalSeconds: 0, users: new Set() };
        hourlyData[hourKey].totalSeconds += seconds;
        hourlyData[hourKey].users.add(userId);
    });

    const result = {};
    Object.entries(hourlyData).forEach(([hour, data]) => {
        result[hour] = {
            hours: parseFloat((data.totalSeconds / 3600).toFixed(4)),
            users: data.users.size,
        };
    });

    return result;
}

// ─── Comparação com o costume ─────────────────────────────────────────────

function meanOf(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

/**
 * Traduz hoje e o costume no estado que a linha mostra.
 *
 * Sem costume há dois casos bem diferentes: a sessão nunca foi usada
 * ('unused') ou hoje é o primeiro dia dela ('first-day'). Barra vazia só pode
 * significar "não usaram" — nunca "ainda não sei comparar".
 */
export function buildUsageComparison({ value, baseline }) {
    const base = { value, baseline, ratio: 0 };

    if (baseline <= 0) {
        return value > 0
            ? { ...base, state: 'first-day', ratio: 1 }
            : { ...base, state: 'unused' };
    }
    if (value <= 0) return { ...base, state: 'idle' };

    const ratio = value / baseline;
    const state = Math.abs(ratio - 1) <= USAGE_ON_PAR_TOLERANCE
        ? 'on-par'
        : (ratio > 1 ? 'above' : 'below');

    return { ...base, ratio, state };
}

/** Total de uso da sessão por dia, no formato de chave do histórico. */
export function getSessionDailyTotals(sessionId, accessHistory) {
    const totals = {};

    Object.entries(accessHistory || {}).forEach(([day, accesses]) => {
        accesses.forEach((access) => {
            if (access.sessionId !== sessionId) return;
            totals[day] = (totals[day] || 0) + (access.usageTimeSeconds || 0);
        });
    });

    return totals;
}

/**
 * Hoje contra um dia normal daquela sessão.
 *
 * O costume é a média dos dias EM QUE ELA FOI USADA: dias parados (fim de
 * semana, feriado) entrariam como zero e rebaixariam o costume, fazendo todo
 * dia útil parecer acima da média. E a comparação é sempre da sessão consigo
 * mesma — cada serviço tem um ritmo (uma ferramenta de trabalho x um
 * streaming), então comparar sessões entre si não diria nada.
 */
export function getSessionUsageComparison(sessionId, accessHistory, now = new Date()) {
    const dailyTotals = filterByLastDays(
        getSessionDailyTotals(sessionId, accessHistory),
        USAGE_BASELINE_DAYS
    );
    const today = dateKey(now);

    const previousDays = Object.entries(dailyTotals)
        .filter(([day, seconds]) => day !== today && seconds > 0)
        .map(([, seconds]) => seconds);

    return buildUsageComparison({
        value: dailyTotals[today] || 0,
        baseline: meanOf(previousDays),
    });
}

export const USAGE_COPY = {
    idle: 'sem uso hoje',
    firstDay: 'sem costume ainda',
    onPar: 'no costume',
    above: (ratio) => `↑ ${formatMultiplier(ratio)} o costume`,
    below: (ratio) => `↓ ${Math.round(ratio * 100)}% do costume`,
};

/** Texto do badge de comparação. Vazio quando não há o que dizer. */
export function usageComparisonBadge({ state, ratio }) {
    switch (state) {
        case 'idle': return USAGE_COPY.idle;
        case 'first-day': return USAGE_COPY.firstDay;
        case 'on-par': return USAGE_COPY.onPar;
        case 'above': return USAGE_COPY.above(ratio);
        case 'below': return USAGE_COPY.below(ratio);
        default: return '';
    }
}

/** Explicação completa, no title da coluna. */
export function usageComparisonTitle({ state, value, baseline }) {
    if (state === 'unused') return 'Ainda sem uso registrado nesta sessão';
    if (state === 'first-day') {
        return `Hoje: ${formatDuration(value)} · Ainda sem outro dia de uso para comparar`;
    }

    const costume = `Costume: ${formatDuration(baseline)} por dia `
        + `(últimos ${USAGE_BASELINE_DAYS} dias)`;

    if (state === 'idle') return `Ninguém usou hoje · ${costume}`;
    return `Hoje: ${formatDuration(value)} · ${costume}`;
}

// ─── Quem está online ─────────────────────────────────────────────────────

/**
 * Quem está usando cada sessão agora, pela janela do heartbeat.
 *
 * Deduplica por usuário: a mesma pessoa reconectando não conta duas vezes.
 */
export function getOnlineBySession(accessHistory, now = new Date()) {
    const usersBySession = {};

    Object.values(accessHistory || {}).forEach((dayAccesses) => {
        dayAccesses.forEach((access) => {
            const start = new Date(access.localDateTime);
            const end = new Date(start.getTime() + (access.usageTimeSeconds || 0) * 1000);
            const secondsSinceEnd = Math.floor((now.getTime() - end.getTime()) / 1000);

            if (secondsSinceEnd < ONLINE_WINDOW_SECONDS && secondsSinceEnd >= 0) {
                usersBySession[access.sessionId] = usersBySession[access.sessionId] || new Set();
                usersBySession[access.sessionId].add(access.userId);
            }
        });
    });

    const result = {};
    Object.entries(usersBySession).forEach(([sessionId, users]) => {
        result[sessionId] = Array.from(users);
    });

    return result;
}

/**
 * Última vez que cada pessoa usou o pacote, no formato que o timeAgo entende.
 * O backend manda "YYYY-MM-DD HH:mm:ss"; o T no meio é o que faz o Date
 * interpretar como horário local em vez de arriscar UTC.
 */
export function normalizeLastUsage(usersLastUsage) {
    const result = {};
    Object.entries(usersLastUsage || {}).forEach(([userId, timestamp]) => {
        result[userId] = localDateTime(new Date(String(timestamp).replace(' ', 'T')));
    });
    return result;
}
