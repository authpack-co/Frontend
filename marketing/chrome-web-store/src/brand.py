"""
A marca da Niango, lida de src/components/BrandLogo.jsx.

Os traçados não são copiados para cá de propósito. O kit já mora no app, com a
fonte convertida em curvas; duplicar aqui garantiria que um dia o logo da loja
ficasse uma versão atrás do logo do produto. Lendo da fonte, a imagem da ficha
e a tela do usuário mostram a mesma marca sempre.

Qual lockup usar segue a regra do próprio tema (theme-tokens.css): o wordmark é
a marca padrão — é ele que o AppShell põe na sidebar — e a assinatura (símbolo
+ nome) entra onde a marca precisa do ícone junto. Numa peça de loja, que vive
solta fora do produto, o ícone precisa vir junto.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'src', 'components', 'BrandLogo.jsx'))


def _consts(path):
    src = open(path, encoding='utf-8').read()
    found = dict(re.findall(r"const (\w+) = '([^']+)';", src))
    missing = {'BLUE', 'GO', 'NAME', 'WORD_NIAN', 'WORD_GO'} - found.keys()
    if missing:
        raise SystemExit(f'BrandLogo.jsx mudou de forma: faltam {sorted(missing)}')
    return found


C = _consts(SOURCE)
BLUE = C['BLUE']


def wordmark(height=24, nian='currentColor', go='#609efa'):
    """"niango" com o "go" em azul — a marca padrão, a mesma da sidebar.

    O par de cores vem do tema: no escuro o nome é branco e o "go" é o Azul
    claro (--ap-accent-strong), que é o wordmark negativo do kit.
    """
    return (f'<svg height="{height}" viewBox="6.6 13.3 298.5 88.4" role="img" aria-label="Niango" '
            f'style="display:block;width:auto">'
            f'<path fill="{nian}" d="{C["WORD_NIAN"]}"/>'
            f'<path fill="{go}" d="{C["WORD_GO"]}"/></svg>')


def signature(height=30, name='#e7e9ed'):
    """Símbolo + nome, para onde a marca aparece fora do produto."""
    return (f'<svg height="{height}" viewBox="0 0 991.22 240" role="img" aria-label="Niango" '
            f'style="display:block;width:auto">'
            f'<circle cx="120" cy="120" r="120" fill="{BLUE}"/>'
            f'<path fill="#fff" d="{C["GO"]}"/>'
            f'<path fill="{name}" d="{C["NAME"]}"/></svg>')


def symbol(size=28):
    """Só o disco azul com o "go" branco."""
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 240 240" role="img" aria-label="Niango" '
            f'style="display:block">'
            f'<circle cx="120" cy="120" r="120" fill="{BLUE}"/>'
            f'<path fill="#fff" d="{C["GO"]}"/></svg>')


if __name__ == '__main__':
    print('lido de', SOURCE)
    print('azul da marca:', BLUE)
    for nome, fn in (('wordmark', wordmark), ('assinatura', signature), ('símbolo', symbol)):
        print(f'{nome:12} {len(fn())} bytes')
