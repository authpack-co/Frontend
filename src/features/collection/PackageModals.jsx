import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmModal, NameFormModal } from '../../components/Modal.jsx';
import { useNotify } from '../../components/Notifications.jsx';
import { api } from '../../lib/api.js';
import { usePackages } from '../../lib/packages.jsx';
import { validateName } from '../../lib/validate.js';

/**
 * Criar, renomear e excluir pacote.
 *
 * Nenhum dos três tem rota própria: não há nada para restaurar num formulário
 * em branco nem numa confirmação, e ressuscitar um "tem certeza?" depois de um
 * F5, sem o contexto que levou até ele, é pior do que não restaurar nada.
 */

export function CreatePackageModal({ open, onClose }) {
    const [name, setName] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const { reload } = usePackages();
    const notify = useNotify();
    const navigate = useNavigate();

    async function handleSubmit() {
        const reason = validateName(name);
        if (reason) return setError(reason);
        if (busy) return undefined;

        setError(null);
        setBusy(true);

        try {
            const created = await api.createPackage(name.trim());
            await reload();
            notify('success', 'Pacote criado.');
            onClose();
            setName('');
            // Leva para o pacote novo: criar e não ver o resultado seria
            // deixar a pessoa procurando o que ela acabou de fazer.
            if (created?.id) navigate(`/collection/${created.id}`);
        } catch (err) {
            console.error('[Package] create error:', err);
            notify('error', 'Não foi possível criar pacote.');
        } finally {
            setBusy(false);
        }

        return undefined;
    }

    return (
        <NameFormModal
            open={open}
            onClose={onClose}
            title="Crie um novo pacote"
            placeholder="Nome do pacote..."
            value={name}
            onChange={(value) => { setName(value); setError(null); }}
            onSubmit={handleSubmit}
            busy={busy}
            error={error}
            note="Crie pacotes para organizar suas sessões e facilitar o compartilhamento com outras pessoas"
        />
    );
}

export function RenamePackageModal({ pkg, open, onClose }) {
    const [name, setName] = useState(pkg.name);
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
            await api.renamePackage(pkg.id, name.trim());
            await reload();
            notify('success', 'Pacote atualizado.');
            onClose();
        } catch (err) {
            console.error('[Package] rename error:', err);
            notify('error', 'Não foi possível editar o pacote.');
        } finally {
            setBusy(false);
        }

        return undefined;
    }

    return (
        <NameFormModal
            open={open}
            onClose={onClose}
            title="Editar pacote"
            placeholder="Nome do pacote..."
            value={name}
            onChange={(value) => { setName(value); setError(null); }}
            onSubmit={handleSubmit}
            busy={busy}
            error={error}
            note="Esta ação apenas altera o nome do pacote, a chave privada permanecerá a mesma"
        />
    );
}

export function DeletePackageModal({ pkg, open, onClose }) {
    const [busy, setBusy] = useState(false);
    const { reload } = usePackages();
    const notify = useNotify();
    const navigate = useNavigate();

    async function handleConfirm() {
        setBusy(true);

        try {
            await api.deletePackage(pkg.id);
            await reload();
            notify('success', 'Pacote excluído.');
            onClose();
            // A URL do pacote deixou de existir; ficar nela mostraria "não
            // encontrado" logo depois de uma exclusão bem-sucedida.
            navigate('/collection');
        } catch (err) {
            console.error('[Package] delete error:', err);
            notify('error', 'Não foi possível excluir o pacote.');
            setBusy(false);
        }
    }

    return (
        <ConfirmModal
            open={open}
            onClose={onClose}
            title="Excluir pacote"
            confirmLabel="Excluir"
            busy={busy}
            onConfirm={handleConfirm}
        >
            Tem certeza de que deseja excluir <strong>{pkg.name}</strong>?
        </ConfirmModal>
    );
}

/** Sair de um pacote que compartilharam com você. */
export function AbortAccessModal({ pkg, open, onClose }) {
    const [busy, setBusy] = useState(false);
    const { reload } = usePackages();
    const notify = useNotify();
    const navigate = useNavigate();

    async function handleConfirm() {
        setBusy(true);

        try {
            await api.abortPackageAccess(pkg.id);
            await reload();
            notify('success', 'Acesso encerrado.');
            onClose();
            navigate('/shared');
        } catch (err) {
            console.error('[Package] abort access error:', err);
            notify('error', 'Não foi possível encerrar o acesso.');
            setBusy(false);
        }
    }

    return (
        <ConfirmModal
            open={open}
            onClose={onClose}
            title="Encerrar acesso"
            confirmLabel="Encerrar"
            busy={busy}
            onConfirm={handleConfirm}
        >
            Tem certeza de que deseja encerrar o acesso a <strong>{pkg.name}</strong>?
        </ConfirmModal>
    );
}
