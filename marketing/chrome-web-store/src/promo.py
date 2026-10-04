"""
As duas peças promocionais da ficha, que seguem regras próprias:

- tile pequeno (440x280): aparece em miniatura nas listas e buscas da loja.
  Screenshot não sobrevive a esse tamanho, então entra só a marca e uma frase.
- marquee (1400x560): é a peça de destaque. Pode ser recortado nas laterais
  conforme a superfície, então nada essencial encosta na borda.
"""
from _parts import ICON
from brand import signature
from icons import ico

TILE = '''<link rel="stylesheet" href="slides.css">
<style>
.stage{width:440px;height:280px;display:flex;flex-direction:column;justify-content:center;padding:0 38px}
.stage::before{background:
  radial-gradient(400px 250px at 110% -20%, rgba(42,114,220,.26), transparent 60%),
  radial-gradient(300px 210px at -12% 120%, rgba(96,158,250,.08), transparent 62%)}
.grid{background-size:34px 34px;-webkit-mask-image:radial-gradient(360px 240px at 50% 30%,#000,transparent 80%)}
.t-brand{display:flex;align-items:center;margin-bottom:20px}
.t-brand svg{display:block}
.t-h{font-family:var(--sora);font-weight:700;font-size:31px;line-height:1.14;letter-spacing:-.022em;color:#f6f4f1}
.t-h .g{background:linear-gradient(96deg,#8ab8fd,#609efa 54%,#2a72dc);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.t-foot{display:flex;align-items:center;gap:8px;margin-top:17px;font-size:12.5px;font-weight:600;color:var(--tx3)}
.t-foot i{width:5px;height:5px;border-radius:50%;background:var(--ac);box-shadow:0 0 0 3px rgba(42,114,220,.22)}
</style>
<div class="stage"><div class="grid"></div>
  <div style="position:relative">
    <div class="t-brand">''' + signature(30) + '''</div>
    <h1 class="t-h">Compartilhe o acesso,<br><span class="g">não a senha.</span></h1>
    <p class="t-foot"><i></i>Extensão para Chrome</p>
  </div>
</div>'''


def acc(name, domain, state=''):
    if state == 'wait':
        btn = '<span class="connect wait">Conectando<span class="spin"></span></span>'
    else:
        btn = f'<span class="connect">Conectar{ICON["open"]}</span>'
    return f'''<div class="acc">
      <div class="acc-h">{ico(domain, 38)}
        <span style="min-width:0"><b>{name}</b><span>{domain}</span></span></div>
      <div class="acc-a">{btn}</div></div>'''


MARQUEE = '''<link rel="stylesheet" href="slides.css">
<style>
.stage{width:1400px;height:560px;display:flex;align-items:center;gap:56px;padding:0 96px}
.stage::before{background:
  radial-gradient(940px 540px at 80% -18%, rgba(42,114,220,.18), transparent 60%),
  radial-gradient(700px 480px at -6% 118%, rgba(96,158,250,.07), transparent 62%)}
.grid{-webkit-mask-image:radial-gradient(1100px 560px at 46% 40%,#000,transparent 80%)}
.m-copy{position:relative;width:588px;flex:none}
.m-brand{display:flex;align-items:center;margin-bottom:24px}
.m-brand svg{display:block}
.m-h{font-family:var(--sora);font-weight:700;font-size:52px;line-height:1.09;letter-spacing:-.024em;color:#f6f4f1}
.m-h .g{background:linear-gradient(96deg,#8ab8fd,#609efa 52%,#2a72dc);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.m-sub{margin-top:18px;font-size:18px;line-height:1.52;color:var(--tx3)}
.m-sub b{color:var(--tx2);font-weight:600}
.m-meta{display:flex;align-items:center;gap:11px;margin-top:22px;font-size:13px;font-weight:600;color:var(--tx3)}
.m-meta span{display:flex;align-items:center;gap:7px}
.m-meta i{width:5px;height:5px;border-radius:50%;background:var(--ac)}
.m-meta em{width:1px;height:13px;background:var(--bd2)}
.m-art{position:relative;flex:1;min-width:0}
.m-art .panel{box-shadow:0 34px 80px rgba(0,0,0,.55)}
.m-art .acc-grid{grid-template-columns:repeat(2,1fr)}
.m-art .acc-a{margin-top:13px}
</style>
<div class="stage"><div class="grid"></div>
  <div class="m-copy">
    <div class="m-brand">''' + signature(34) + '''</div>
    <h1 class="m-h">Distribua acessos<br>sem entregar <span class="g">senhas.</span></h1>
    <p class="m-sub">A extensão compartilha a <b>sessão já autenticada</b>, cifrada com AES
      individual. Quem recebe entra em um clique — e você revoga quando quiser.</p>
    <p class="m-meta"><span><i></i>Grátis para começar</span><em></em>
      <span>Sem cofre de senhas</span><em></em><span>Revogação imediata</span></p>
  </div>
  <div class="m-art">
    <div class="panel">
      <div class="pkg-title"><h2>Meus acessos</h2><span class="tag">6 sessões</span></div>
      <p class="meta">Compartilhado por Ana Ribeiro · Engenharia</p>
      <div class="acc-grid" style="margin-top:15px">
        ''' + acc('Figma', 'figma.com', 'wait') + acc('Notion', 'notion.so') \
            + acc('Slack', 'slack.com') + acc('ChatGPT', 'chatgpt.com') + '''
      </div>
    </div>
    <div class="note ok" style="right:16px;top:-15px">''' + ICON['check'] + '''Abre já autenticado</div>
  </div>
</div>'''

open('promo-tile.html', 'w').write(TILE)
open('promo-marquee.html', 'w').write(MARQUEE)
print('wrote promo-tile.html e promo-marquee.html')
