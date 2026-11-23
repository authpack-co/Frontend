/**
 * Hostnames que só existem na máquina ou na rede de quem digitou: localhost,
 * IPs (v4 e v6), nomes de rede interna (.local, .internal…) e hosts de um
 * rótulo só (http://meu-servidor). Não têm favicon público nem HTTPS de
 * verdade — quem usa quer http://, e consultar serviços externos sobre eles
 * só vaza o nome da rede interna.
 *
 * `hostname` é o de uma URL já parseada: o IPv6 chega com colchetes.
 */
const LOCAL_SUFFIXES = ['localhost', 'local', 'internal', 'lan'];

export function isIpAddress(hostname) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith('[');
}

export function isLocalHostname(hostname) {
    const host = (hostname || '').toLowerCase();
    if (!host) return false;
    if (isIpAddress(host)) return true;
    if (!host.includes('.')) return true;

    return LOCAL_SUFFIXES.some((suffix) => host.endsWith(`.${suffix}`));
}
