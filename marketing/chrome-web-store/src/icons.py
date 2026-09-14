"""
Ícone de cada serviço, com a mesma cadeia de fallback do ServiceIcon do app
(src/components/ServiceIcon.jsx):

  1) o serviço de favicons do Google, derivado do domínio
  2) o logo oficial em vetor, versionado em vendor/icons/ (simple-icons, CC0)

O favicon real é sempre a primeira escolha — é o que a pessoa vê no painel. O
vetor entra quando a rede não deixa (CI com egress fechado, máquina offline):
melhor o logo oficial em curva do que um quadrado vazio ou uma inicial.

Tudo vira data URI porque o render roda offline no Chromium headless: ícone
que não chega a tempo deixa buraco na imagem que vai para a loja.
"""
import base64, os, re, subprocess

GOOGLE_SIZE = 128
# Superfície do tile — a mesma --ap-bg-card-alt do tema escuro.
CHIP_BG = '#1b1c1e'
# Abaixo disto o glifo encosta no fundo do tile e vira mancha.
MIN_CONTRAST = 3.0
# Tom claro do tema, para as marcas que no escuro se apresentam invertidas.
REVERSED = '#E8E6E3'
here = os.path.dirname(os.path.abspath(__file__))
cache = os.path.join(here, '.iconcache')

# domínio → (rótulo, arquivo em vendor/icons, cor do glifo)
#
# A cor é como a marca se apresenta hoje, não o que o simple-icons guarda: o
# registro dele para a OpenAI ainda é o roxo #412991 de duas identidades atrás,
# enquanto o favicon do chatgpt.com é preto.
SERVICES = {
    'figma.com':   ('Figma',   'figma.svg',  '#F24E1E'),
    'notion.so':   ('Notion',  'notion.svg', '#000000'),
    'slack.com':   ('Slack',   'slack.svg',  '#4A154B'),
    'linear.app':  ('Linear',  'linear.svg', '#5E6AD2'),
    'chatgpt.com': ('ChatGPT', 'openai.svg', '#0D0D0D'),
    'github.com':  ('GitHub',  'github.svg', '#181717'),
}


def _lum(hex_color):
    """Luminância relativa (WCAG), para medir o glifo contra o tile."""
    out = []
    for i in (1, 3, 5):
        c = int(hex_color[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = out
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def on_dark(hex_color):
    """A cor do glifo sobre o tile escuro.

    Metade destas marcas é preta ou quase — #000 do Notion, #181717 do GitHub,
    a berinjela do Slack: no tile escuro elas desapareceriam. E não é caso de
    clarear o matiz, que devolveria um Slack rosa. Marca que não tem contraste
    no escuro é justamente a que já publica uma versão invertida, então é essa
    que entra. Quem tem contraste (Figma, Linear) fica com a cor de sempre.
    """
    l1, l2 = _lum(hex_color), _lum(CHIP_BG)
    contrast = (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)
    return hex_color if contrast >= MIN_CONTRAST else REVERSED


def _google(domain):
    """Tenta o endpoint de favicons do Google. Devolve None se a rede barrar."""
    os.makedirs(cache, exist_ok=True)
    path = os.path.join(cache, f'{domain}.png')
    if not os.path.exists(path) or not os.path.getsize(path):
        url = f'https://www.google.com/s2/favicons?domain={domain}&sz={GOOGLE_SIZE}'
        done = subprocess.run(['curl', '-sSf', '--max-time', '20', '-o', path, url],
                              capture_output=True)
        if done.returncode != 0 or not os.path.exists(path) or not os.path.getsize(path):
            if os.path.exists(path):
                os.remove(path)
            return None
    return 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()


def _vendored(filename, color):
    svg = open(os.path.join(here, 'vendor', 'icons', filename)).read()
    # Os dois conjuntos desenham em currentColor ou sem fill nenhum; fixar a cor
    # no próprio <svg> serve aos dois sem tocar nos paths.
    svg = re.sub(r'\sfill="[^"]*"', '', svg, count=1)
    svg = svg.replace('<svg', f'<svg fill="{color}"', 1)
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode()).decode()


def build(prefer_google=True):
    """domínio → (data URI, origem)."""
    out = {}
    for domain, (_, filename, color) in SERVICES.items():
        uri = _google(domain) if prefer_google else None
        out[domain] = (uri, 'favicon') if uri else (_vendored(filename, on_dark(color)), 'vetor')
    return out


ICONS = build(prefer_google=os.environ.get('NO_FAVICON_FETCH') != '1')
SOURCES = {d: src for d, (_, src) in ICONS.items()}


def ico(domain, box=26, glyph=None, extra=''):
    """O tile de ícone do painel: quadrado escuro com a marca dentro.

    O glifo vai em pixel inteiro, não em porcentagem da caixa. 64% de 26px dá
    16,64px: o meio-pixel joga a imagem para uma posição fracionária, e o que
    era para ser um ícone centrado sai meio borrado e visivelmente torto no
    tamanho em que ele de fato aparece.
    """
    uri = ICONS[domain][0]
    glyph = glyph if glyph is not None else round(box * 0.62 / 2) * 2
    return (f'<span class="ico{extra}" style="width:{box}px;height:{box}px">'
            f'<img src="{uri}" alt="" width="{glyph}" height="{glyph}"></span>')


if __name__ == '__main__':
    for d, (_, origem) in ICONS.items():
        print(f'{d:14} {origem}')
