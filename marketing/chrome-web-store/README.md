# Imagens da ficha na Chrome Web Store

As sete peças da ficha da extensão, cada uma no tamanho exato que a loja
aceita. Os PNGs prontos estão nesta pasta.

## Carrossel — 1280×800

| # | Arquivo | Assunto |
|---|---|---|
| 1 | `niango-1.png` | Posicionamento — "Distribua acessos sem entregar senhas" + painel |
| 2 | `niango-2.png` | Passo 01 · captura da sessão já aberta |
| 3 | `niango-3.png` | Passo 02 · distribuição por link ou código |
| 4 | `niango-4.png` | Passo 03 · quem recebe conecta em um clique |
| 5 | `niango-5.png` | Controle e revogação por pessoa, pacote ou sessão |

## Peças promocionais

| Arquivo | Tamanho | Onde aparece |
|---|---|---|
| `niango-promo-440x280.png` | 440×280 | tile pequeno, nas listas e buscas da loja |
| `niango-marquee-1400x560.png` | 1400×560 | marquee, na vitrine de destaque |

As duas seguem regras próprias, e não são o carrossel reduzido. O tile é visto
em miniatura: screenshot não sobrevive a esse tamanho, então leva só a marca e
uma frase — daí ele dizer "Compartilhe o acesso, não a senha" em vez de repetir
a manchete da tela 1. O marquee pode ser recortado nas laterais conforme a
superfície, então nada essencial encosta na borda; a mensagem e a marca ficam à
esquerda, onde sobrevivem a qualquer corte.

Nenhuma das duas leva canal alfa — a loja recusa. O Playwright já grava RGB
opaco quando a página tem fundo sólido, que é o caso; vale conferir com
`python3 -c "print(open('arquivo.png','rb').read(26)[25])"`, que deve imprimir
`2` (RGB).

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

Cada ícone fica num tile escuro, o mesmo `--ap-bg-card-alt` do painel. No
caminho do vetor isso exige escolher a cor do glifo: metade destas marcas é
preta ou quase — o `#000` do Notion, o `#181717` do GitHub, a berinjela do
Slack — e sumiria no escuro. Clarear o matiz devolveria um Slack rosa, então
`on_dark()` mede o contraste contra o tile e, abaixo de 3:1, usa o tom claro
do tema: marca sem contraste no escuro é justamente a que já publica uma
versão invertida. Figma e Linear passam no teste e ficam com a cor de sempre.
Pelo caminho do favicon a questão não existe — o PNG já vem colorido.

O glifo é dimensionado em pixel inteiro, não em porcentagem da caixa: 64% de
26px dá 16,64px, e o meio-pixel tira o ícone do centro e o deixa borrado
justamente no tamanho em que ele aparece.

Os vetores de `src/vendor/icons/` vêm do simple-icons (CC0, licença junto dos
arquivos), com o `viewBox` já recentrado na caixa real do desenho por
`normalize_icons.mjs` — o viewBox de origem não promete arte centrada, e a do
Figma encostava à esquerda. É um passo de uma vez só; o resultado fica
versionado e o build não depende dele.

A cor de cada glifo é como a marca se apresenta hoje, não o que o simple-icons
guarda: o registro dele para a OpenAI ainda é o roxo de duas identidades
atrás, enquanto o favicon do chatgpt.com é preto.

## Regerar

```sh
cd src
npm i -D playwright        # só o pacote; o Chromium do ambiente já serve
python3 fonts.py           # baixa e embute Inter, Sora e Fira Code
python3 icons.py           # confere a origem dos ícones (favicon ou vetor)
python3 slides.py          # escreve slide-1.html … slide-5.html
python3 promo.py           # escreve promo-tile.html e promo-marquee.html
node shot.mjs              # renderiza as sete peças na pasta acima
```

`shot.mjs` renderiza cada peça no seu próprio viewport com
`deviceScaleFactor: 1` — a loja recusa o que não bate exato, e renderizar em 2x
para reduzir depois só amolece o texto, então o desenho já nasce no tamanho de
entrega.

Onde mexer:

- **texto das telas** — `slides.py`, no topo de cada bloco `s1`…`s5`;
- **tile e marquee** — `promo.py` (cada um com o seu bloco `<style>`);
- **quais serviços aparecem** — `SERVICES` em `icons.py`, mais as chamadas
  de `row()` e `acc()` em `build.py` / `slides.py`;
- **pedaços de UI** (sidebar, tabela, gráfico, pessoas) — `build.py`;
- **moldura, cabeçalho, ícones** — `_parts.py`;
- **cores, tipografia, componentes** — `slides.css`.
