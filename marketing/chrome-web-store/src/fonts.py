"""
Baixa Inter, Sora e Fira Code do Google Fonts e escreve fonts.css com os
woff2 embutidos em base64.

O embed não é capricho: o render roda offline no Chromium headless, e uma
fonte que não chega a tempo troca o desenho da marca por uma fallback —
o tipo da manchete é metade da imagem.
"""
import base64, os, re, subprocess

UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/120.0 Safari/537.36')
FAMILIES = ('Inter:wght@400;500;600;700;800'
            '&family=Sora:wght@600;700;800'
            '&family=Fira+Code:wght@500;600;700')
# Português cabe em latin; latin-ext entra para nomes próprios acentuados fora dela.
SUBSETS = ('latin', 'latin-ext')

here = os.path.dirname(os.path.abspath(__file__))
cache = os.path.join(here, '.fontcache')
os.makedirs(cache, exist_ok=True)


def fetch(url, dest=None):
    args = ['curl', '-sS', '-A', UA, url]
    if dest:
        subprocess.run(args + ['-o', dest], check=True)
        return None
    return subprocess.run(args, check=True, capture_output=True).stdout.decode()


def main():
    css = fetch(f'https://fonts.googleapis.com/css2?family={FAMILIES}&display=swap')
    faces = []
    for subset, block in re.findall(r'/\*\s*([a-z\-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})', css):
        if subset not in SUBSETS:
            continue
        url = re.search(r'url\((https://[^)]+)\)', block).group(1)
        path = os.path.join(cache, url.rsplit('/', 1)[-1])
        if not os.path.exists(path):
            fetch(url, path)
        data = base64.b64encode(open(path, 'rb').read()).decode()
        faces.append(block.replace(url, f'data:font/woff2;base64,{data}'))

    out = os.path.join(here, 'fonts.css')
    open(out, 'w').write('\n'.join(faces))
    print(f'fonts.css: {len(faces)} faces, {os.path.getsize(out) // 1024} KB')


if __name__ == '__main__':
    main()
