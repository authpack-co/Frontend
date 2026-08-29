/**
 * Validação dos campos de formulário, porte do utils.validateField.
 *
 * O limite de 20 caracteres num input que aceita 50 é herdado: o maxlength do
 * HTML sempre foi mais frouxo que a regra. Mantido como está para o texto de
 * erro continuar sendo o mesmo que a pessoa já conhece.
 */

const FORBIDDEN = /[<>/"'{};]/;

/** Devolve a mensagem de erro, ou null quando o nome serve. */
export function validateName(value) {
    const trimmed = (value || '').trim();

    if (!trimmed) return 'O nome não pode estar vazio.';
    if (trimmed.length > 20) return 'O nome deve ter no máximo 20 caracteres.';
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
