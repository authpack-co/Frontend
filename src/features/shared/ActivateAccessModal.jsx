import { NameFormModal } from '../../components/Modal.jsx';
import useActivateAccess from './useActivateAccess.js';

/**
 * Ativar um pacote pela chave, de dentro de "Meus acessos".
 *
 * A porta de entrada da tela vazia só existe enquanto não há acesso nenhum;
 * quem já tem um acesso não tinha por onde ativar o segundo. Este é o mesmo
 * pedido, agora ao alcance de um clique no ⚿ da sidebar.
 */
export default function ActivateAccessModal({ open, onClose }) {
    const { key, changeKey, error, sending, activate } = useActivateAccess({ onDone: onClose });

    return (
        <NameFormModal
            open={open}
            onClose={onClose}
            title="Ativar pacote por chave"
            placeholder="Cole sua chave de acesso"
            submitLabel="Ativar"
            // A chave é um UUID: 36 caracteres, nem um a mais.
            maxLength={36}
            value={key}
            onChange={changeKey}
            onSubmit={activate}
            busy={sending}
            error={error}
            note="O acesso não vale na hora: o dono do pacote ainda precisa aprovar o seu pedido"
        />
    );
}
