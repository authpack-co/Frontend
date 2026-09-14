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

## Ícones dos serviços

`icons.py` repete a cadeia de fallback do `ServiceIcon` do app:

1. o serviço de favicons do Google (`google.com/s2/favicons`), pelo domínio;
2. o logo oficial em vetor, versionado em `src/vendor/icons/`.

O favicon real é sempre a primeira escolha — é o que a pessoa vê no painel. O
vetor entra quando a rede barra o endpoint (CI com egress fechado, máquina
offline); `NO_FAVICON_FETCH=1` força esse caminho. O que fica no PNG entregue
depende de onde o render rodou, então vale conferir a saída de
`python3 icons.py`, que imprime a origem de cada ícone.

Cada ícone fica num chip claro, e não solto sobre o painel. Favicon é arte
feita para fundo claro: no `#1b1c1e` do tema escuro, o preto do Notion e do
GitHub sumiria, e o laranja do Figma passaria a disputar com o acento do
Niango. Com o chip, cada marca aparece como na aba do navegador.

Os vetores de `src/vendor/icons/` vêm do simple-icons (CC0, licença junto dos
arquivos). A cor de cada glifo é como a marca se apresenta hoje, não o que o
simple-icons guarda: o registro dele para a OpenAI ainda é o roxo de duas
identidades atrás, enquanto o favicon do chatgpt.com é preto.

## Regerar

```sh
cd src
npm i -D playwright        # só o pacote; o Chromium do ambiente já serve
python3 fonts.py           # baixa e embute Inter, Sora e Fira Code
python3 icons.py           # confere a origem dos ícones (favicon ou vetor)
python3 slides.py          # escreve slide-1.html … slide-5.html
node shot.mjs              # renderiza em ../niango-N.png
```

`shot.mjs` fixa viewport 1280×800 e `deviceScaleFactor: 1` — a loja recusa
qualquer coisa que não seja exatamente 1280×800 (ou 640×400). Renderizar em 2x
e reduzir depois só amolece o texto, então o desenho já nasce no tamanho final.

Onde mexer:

- **texto das telas** — `slides.py`, no topo de cada bloco `s1`…`s5`;
- **quais serviços aparecem** — `SERVICES` em `icons.py`, mais as chamadas
  de `row()` e `acc()` em `build.py` / `slides.py`;
- **pedaços de UI** (sidebar, tabela, gráfico, pessoas) — `build.py`;
- **moldura, cabeçalho, ícones** — `_parts.py`;
- **cores, tipografia, componentes** — `slides.css`.
