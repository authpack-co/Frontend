import { useState } from 'react';

/**
 * Avatar de pessoa com inicial em gradiente por trás da foto. Se a imagem
 * falhar, ela some e a inicial reaparece — nunca fica um quadrado quebrado.
 *
 * A cor é determinística pelo nome: a mesma pessoa tem sempre a mesma cor.
 */

const PALETTES = [
    ['#fb923c', '#ea580c'], ['#34d399', '#059669'], ['#a78bfa', '#7c3aed'],
    ['#f472b6', '#be185d'], ['#22d3ee', '#0e7490'], ['#a8a29e', '#57534e'],
];

function paletteFor(name) {
    const key = (name || '?').trim();
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
        hash = (hash + key.charCodeAt(i)) % PALETTES.length;
    }
    return PALETTES[hash];
}

export default function PersonAvatar({ name, picture, className = '' }) {
    const [broken, setBroken] = useState(false);
    const [c1, c2] = paletteFor(name);
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

    return (
        <span
            className={`${className} ph-avatar`.trim()}
            style={{ background: `linear-gradient(150deg, ${c1}, ${c2})` }}
        >
            <span className="ph-avatar-initial">{initial}</span>
            {picture && !broken && (
                <img src={picture} alt={name || ''} onError={() => setBroken(true)} />
            )}
        </span>
    );
}
