"""
Os três blocos promocionais da ficha. Cada um responde a uma superfície, e é
isso que decide o conteúdo — nenhum é o outro redimensionado:

- pequeno (440x280): aparece em miniatura nas listas e buscas. Screenshot não
  sobrevive a esse tamanho, então entra só a marca e uma frase.
- grande (920x680): o bloco em pé, com espaço para a frase e uma amostra da
  interface. É o único dos três em formato retrato.
- marquee (1400x560): a peça de destaque, deitada. Pode ser recortada nas
  laterais conforme onde é exibida, então nada essencial encosta na borda.
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

LARGE = '''<link rel="stylesheet" href="slides.css">
<style>
.stage{width:920px;height:680px;padding:0 56px}
.stage::before{background:
  radial-gradient(700px 480px at 104% -14%, rgba(42,114,220,.22), transparent 60%),
  radial-gradient(520px 420px at -10% 112%, rgba(96,158,250,.08), transparent 62%)}
.grid{-webkit-mask-image:radial-gradient(760px 520px at 50% 18%,#000,transparent 80%)}
.l-copy{position:relative;padding-top:58px}
.l-brand{display:flex;align-items:center;margin-bottom:26px}
.l-brand svg{display:block}
.l-h{font-family:var(--sora);font-weight:700;font-size:41px;line-height:1.11;letter-spacing:-.023em;color:#f6f4f1}
.l-h .g{background:linear-gradient(96deg,#8ab8fd,#609efa 52%,#2a72dc);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.l-sub{margin-top:16px;font-size:16.5px;line-height:1.52;color:var(--tx3);max-width:680px}
.l-sub b{color:var(--tx2);font-weight:600}
.l-art{position:absolute;left:56px;right:56px;top:300px}
.l-art .panel{box-shadow:0 30px 70px rgba(0,0,0,.5)}
.l-art .acc-grid{grid-template-columns:repeat(3,1fr);gap:13px}
.l-art .acc{padding:13px}
.l-art .acc-h .ico{width:34px;height:34px}
.l-art .acc-h b{font-size:12.5px}
.l-art .acc-a{margin-top:12px}
</style>
<div class="stage"><div class="grid"></div>
  <div class="l-copy">
    <div class="l-brand">''' + signature(32) + '''</div>
    <h1 class="l-h">Distribua acessos<br>sem entregar <span class="g">senhas.</span></h1>
    <p class="l-sub">A sessão já autenticada vai cifrada com AES individual. Quem recebe
      <b>entra em um clique e nunca vê a credencial</b> — e você revoga quando quiser.</p>
  </div>
  <div class="l-art">
    <div class="panel">
      <div class="pkg-title"><h2>Meus acessos</h2><span class="tag">6 sessões</span></div>
      <p class="meta">Compartilhado por Ana Ribeiro · Engenharia</p>
      <div class="acc-grid" style="margin-top:14px">
        ''' + acc('Figma', 'figma.com', 'wait') + acc('Notion', 'notion.so') \
            + acc('Slack', 'slack.com') + acc('Linear', 'linear.app') \
            + acc('ChatGPT', 'chatgpt.com') + acc('GitHub', 'github.com') + '''
      </div>
    </div>
  </div>
</div>'''

open('promo-tile.html', 'w').write(TILE)
open('promo-large.html', 'w').write(LARGE)
open('promo-marquee.html', 'w').write(MARQUEE)
print('wrote promo-tile.html, promo-large.html e promo-marquee.html')
