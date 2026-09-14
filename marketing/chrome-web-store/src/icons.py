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
        out[domain] = (uri, 'favicon') if uri else (_vendored(filename, color), 'vetor')
    return out


ICONS = build(prefer_google=os.environ.get('NO_FAVICON_FETCH') != '1')
SOURCES = {d: src for d, (_, src) in ICONS.items()}


def ico(domain, box=26, extra=''):
    """O tile de ícone: chip claro com o favicon dentro.

    O chip não é enfeite. Favicon é arte feita para fundo claro — sobre o
    #1b1c1e do painel, o preto do Notion e do GitHub simplesmente sumiria, e o
    laranja do Figma passaria a disputar com o acento do Niango. Com o chip,
    cada marca aparece como a pessoa a vê na aba do navegador.
    """
    uri = ICONS[domain][0]
    return (f'<span class="ico{extra}" style="width:{box}px;height:{box}px">'
            f'<img src="{uri}" alt=""></span>')


if __name__ == '__main__':
    for d, (_, origem) in ICONS.items():
        print(f'{d:14} {origem}')
