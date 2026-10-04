/**
 * Validação dos campos de formulário, porte do utils.validateField.
 *
 * Nome de pacote e de sessão: até 30 caracteres, a mesma regra do backend
 * (middlewares/validators.js). O input aceita 50 de propósito — passar do
 * limite mostra a mensagem, em vez de o campo travar sem explicação.
 */

const FORBIDDEN = /[<>/"'{};]/;
export const NAME_MAX = 30;

/** Devolve a mensagem de erro, ou null quando o nome serve. */
export function validateName(value) {
    const trimmed = (value || '').trim();

    if (!trimmed) return 'O nome não pode estar vazio.';
    if (trimmed.length > NAME_MAX) return `O nome deve ter no máximo ${NAME_MAX} caracteres.`;
    if (FORBIDDEN.test(trimmed)) return 'O nome contém caracteres não permitidos.';

    return null;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateKey(value) {
    const trimmed = (value || '').trim();

    if (!trimmed) return 'A chave não pode estar vazia.';
    if (!UUID_V4.test(trimmed)) return 'Chave inválida.';

    return null;
}
