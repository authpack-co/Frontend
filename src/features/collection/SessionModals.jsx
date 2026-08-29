import { useState } from 'react';
import { ConfirmModal, NameFormModal } from '../../components/Modal.jsx';
import { useNotify } from '../../components/Notifications.jsx';
import { api } from '../../lib/api.js';
import { usePackages } from '../../lib/packages.jsx';
import { validateName } from '../../lib/validate.js';

export function RenameSessionModal({ session, open, onClose }) {
    const [name, setName] = useState(session.name);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const { reload } = usePackages();
    const notify = useNotify();

    async function handleSubmit() {
        const reason = validateName(name);
        if (reason) return setError(reason);
        if (busy) return undefined;

        setError(null);
        setBusy(true);

        try {
            await api.renameSession(session.id, name.trim());
            await reload();
            notify('success', 'Sessão atualizada.');
            onClose();
        } catch (err) {
            console.error('[Session] rename error:', err);
            notify('error', 'Não foi possível editar a sessão.');
        } finally {
            setBusy(false);
        }

        return undefined;
    }

    return (
        <NameFormModal
            open={open}
            onClose={onClose}
            title="Editar sessão"
            placeholder="Nome da sessão..."
            value={name}
            onChange={(value) => { setName(value); setError(null); }}
            onSubmit={handleSubmit}
            busy={busy}
            error={error}
            note="Esta ação apenas altera o nome da sessão, a conexão permanecerá a mesma"
        />
    );
}

export function DeleteSessionModal({ session, open, onClose }) {
    const [busy, setBusy] = useState(false);
    const { reload } = usePackages();
    const notify = useNotify();

    async function handleConfirm() {
        setBusy(true);

        try {
            await api.deleteSession(session.id);
            await reload();
            notify('success', 'Sessão excluída.');
            onClose();
        } catch (err) {
            console.error('[Session] delete error:', err);
            notify('error', 'Não foi possível excluir a sessão.');
            setBusy(false);
        }
    }

    return (
        <ConfirmModal
            open={open}
            onClose={onClose}
            title="Excluir sessão"
            confirmLabel="Excluir"
            busy={busy}
            onConfirm={handleConfirm}
        >
            Tem certeza de que deseja excluir <strong>{session.name}</strong>?
        </ConfirmModal>
    );
}

/** Tira uma pessoa do pacote. Quem criou não pode ser removido. */
export function RemoveUserModal({ pkg, user, open, onClose }) {
    const [busy, setBusy] = useState(false);
    const { reload } = usePackages();
    const notify = useNotify();

    async function handleConfirm() {
        setBusy(true);

        try {
            await api.removeUserFromPackage(pkg.id, user.id);
            await reload();
            notify('success', 'Acesso removido.');
            onClose();
        } catch (err) {
            console.error('[Package] remove user error:', err);
            notify('error', 'Não foi possível remover o acesso.');
            setBusy(false);
        }
    }

    return (
        <ConfirmModal
            open={open}
            onClose={onClose}
            title="Remover acesso"
            confirmLabel="Remover"
            busy={busy}
            onConfirm={handleConfirm}
        >
            Tem certeza de que deseja remover <strong>{user.name}</strong> do pacote?
        </ConfirmModal>
    );
}
