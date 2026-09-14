# Imagens do carrossel da Chrome Web Store

Cinco telas 1280×800 (o tamanho que a loja pede) para a ficha da extensão.
Os PNGs prontos estão em `niango-1.png` … `niango-5.png`.

| # | Arquivo | Assunto |
|---|---|---|
| 1 | `niango-1.png` | Posicionamento — "Distribua acessos sem entregar senhas" + painel |
| 2 | `niango-2.png` | Passo 01 · captura da sessão já aberta |
| 3 | `niango-3.png` | Passo 02 · distribuição por link ou código |
| 4 | `niango-4.png` | Passo 03 · quem recebe conecta em um clique |
| 5 | `niango-5.png` | Controle e revogação por pessoa, pacote ou sessão |

## Como as telas são feitas

Não são capturas do app rodando: são mockups em HTML/CSS que reusam os tokens
de `public/assets/styles/theme-tokens.css` (tema escuro) e a mesma linguagem de
componente do painel. Isso mantém a ficha fiel à interface sem depender de um
backend com dados de exemplo, e deixa cada texto editável em um arquivo.

Os ícones dos serviços são monogramas na cor característica de cada um — a
mesma escolha do mockup da landing. Logotipos de terceiros ficam de fora de
propósito: a loja trata marca alheia em screenshot como sugestão de vínculo.

## Regerar

```sh
cd src
npm i -D playwright        # só o pacote; o Chromium do ambiente já serve
python3 fonts.py           # baixa e embute Inter, Sora e Fira Code
python3 slides.py          # escreve slide-1.html … slide-5.html
node shot.mjs              # renderiza em ../niango-N.png
```

`shot.mjs` fixa viewport 1280×800 e `deviceScaleFactor: 1` — a loja recusa
qualquer coisa que não seja exatamente 1280×800 (ou 640×400). Renderizar em 2x
e reduzir depois só amolece o texto, então o desenho já nasce no tamanho final.

Onde mexer:

- **texto das telas** — `slides.py`, no topo de cada bloco `s1`…`s5`;
- **pedaços de UI** (sidebar, tabela, gráfico, pessoas) — `build.py`;
- **moldura, cabeçalho, ícones** — `_parts.py`;
- **cores, tipografia, componentes** — `slides.css`.
