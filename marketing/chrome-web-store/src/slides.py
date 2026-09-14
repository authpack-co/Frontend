from _parts import MARK, ICON, head, page, winbar
from build import side, topbar, CHART, TABLE, person, row, GRID

def panel_head():
    return f'''<div class="pkg-title"><h2>Engenharia</h2><span class="tag">6 sessões</span></div>
      <p class="meta">Criado em 5 de abril de 2024</p>'''

def app_body(dim=False):
    return f'''<div class="app">
      {side()}
      <div class="main">
        {topbar()}
        <div class="panel">
          {panel_head()}
          <div style="display:grid;grid-template-columns:500px 1fr;gap:14px;margin-top:12px">
            <div>
              <p class="sec">Uso do pacote nos últimos 7 dias</p>
              <p class="sec-sub">Horas de uso por dia</p>
              {CHART}
            </div>
            <div style="border:1px solid var(--bd);border-radius:12px;padding:12px 14px">
              <p class="sec" style="margin-bottom:2px">Pessoas com acesso</p>
              {person('AR','Ana Ribeiro','agora mesmo','#f97316',online=True,creator=True)}
              {person('BA','Bruno Alves','há 2 horas','#7b57d4')}
              {person('CD','Carla Dias','agora mesmo','#4ade80',online=True,dark=True)}
            </div>
          </div>
          <p class="sec" style="margin:13px 0 7px">Minhas sessões</p>
          {TABLE}
        </div>
      </div>
    </div>'''

# ── 1 ────────────────────────────────────────────────────────────────────
s1 = page('.canvas{top:344px}', head(
    'Extensão para Chrome, Edge e Arc',
    'Distribua acessos sem entregar <span class="g">senhas.</span>',
    'O Niango compartilha a <b>sessão já autenticada</b>, cifrada com AES individual. '
    'Quem recebe entra em um clique — e nunca vê a credencial.') + f'''
  <div class="canvas"><div class="win">
    {winbar('app.niango.io/collection/engenharia')}
    {app_body()}
  </div></div>''')

# ── 2 ────────────────────────────────────────────────────────────────────
serv = [('C','#e8e6e3','ChatGPT','chatgpt.com','a','Adicionado'),
        ('N','#e8e6e3','Notion','notion.so','g','Adicionar'),
        ('S','#8a7bff','Slack','slack.com','g','Adicionar'),
        ('F','#0acf83','Figma','figma.com','g','Adicionar')]
drop = ''.join(f'''<div class="drop-i{' on' if k=='a' else ''}">
    <span class="ico" style="width:24px;height:24px;font-size:11px;color:{c}">{l}</span>
    <b>{n}</b><span class="mini {k}">{t}</span></div>''' for l,c,n,d,k,t in serv)

prog = ''.join(f'''<div style="display:flex;align-items:center;gap:10px;margin-top:11px">
    <span class="ico" style="width:24px;height:24px;font-size:11px;color:{c}">{l}</span>
    <span style="flex:1"><span style="display:block;font-size:11px;font-weight:600;margin-bottom:5px">{n}</span>
      <span class="bar"><i style="width:{w}"></i></span></span>
    <span style="width:14px;color:{'#4ade80' if w=='100%' else '#6d655a'};display:block">{ICON['check']}</span></div>'''
    for l,c,n,w in [('C','#e8e6e3','ChatGPT','100%'),('N','#e8e6e3','Notion','100%'),
                    ('S','#8a7bff','Slack','100%'),('F','#0acf83','Figma','46%')])

s2 = page('.canvas{top:340px}', head(
    'Passo 01 · Captura',
    'Capture a sessão que <span class="g">você já tem aberta.</span>',
    'Sem API, sem SSO, sem digitar senha. A extensão lê a sessão ativa no navegador '
    'e guarda no pacote <b>cifrada com uma chave AES própria</b>.') + f'''
  <div class="canvas"><div class="win">
    {winbar('app.niango.io/collection/engenharia','Capturando…')}
    <div style="position:relative">
      <div style="filter:blur(2.5px) brightness(.42) saturate(.8)">{app_body()}</div>
      <div style="position:absolute;inset:0;background:rgba(0,0,0,.42)"></div>
      <div style="position:absolute;left:46px;top:28px;width:566px" class="modal">
        <div class="modal-h">
          <h3>Qual serviço você quer adicionar?</h3>
          <p>Busque pelo nome do serviço ou cole a URL para começar.</p>
          <div class="field">{ICON['search']}<span style="color:var(--tx)">notion</span><span
            style="width:1.5px;height:16px;background:var(--ac);margin-left:1px"></span></div>
          <div class="drop">{drop}</div>
          <p style="font-size:10.5px;color:var(--tx3);margin:12px 0 18px;display:flex;gap:7px;align-items:center">
            <span style="width:13px;height:13px;display:block">{ICON['lock']}</span>
            Esteja logado no serviço para funcionar corretamente.</p>
        </div>
      </div>
      <div class="modal" style="position:absolute;right:40px;top:150px;width:404px;padding:18px 20px 22px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b style="font-size:12.5px;font-weight:600">Capturando sessões…</b>
          <span style="font-size:11.5px;font-weight:700;color:var(--ac2);font-family:'Fira Code',monospace">3/4</span>
        </div>
        <div class="bar" style="margin-top:10px;height:6px"><i style="width:75%"></i></div>
        {prog}
      </div>
    </div>
  </div></div>''')


CODE_BOXES = ''.join(
    '<span style="width:44px;height:52px;border-radius:10px;background:var(--input);'
    'border:1px solid var(--bd3);display:grid;place-items:center;font-family:\'Fira Code\',monospace;'
    'font-size:21px;font-weight:700;color:var(--tx)">' + ch + '</span>' for ch in 'K7QM2X')

# ── 3 ────────────────────────────────────────────────────────────────────
s3 = page('.canvas{top:336px}', head(
    'Passo 02 · Distribuição',
    'Convide por link ou código — <span class="g">a senha não sai daqui.</span>',
    'Quem entra no pacote recebe a sessão, nunca a credencial. '
    'Funciona para <b>times, freelancers, suporte e acesso temporário</b>.') + f'''
  <div class="canvas"><div class="win">
    {winbar('app.niango.io/collection/engenharia','Pacote compartilhado')}
    <div style="position:relative">
      <div style="filter:blur(2.5px) brightness(.42) saturate(.8)">{app_body()}</div>
      <div style="position:absolute;inset:0;background:rgba(0,0,0,.42)"></div>
      <div class="modal" style="position:absolute;left:78px;top:26px;width:520px;padding-bottom:22px">
        <div class="modal-h">
          <h3>Compartilhar pacote</h3>
          <p>Quem abrir o link entra no pacote Engenharia.</p>
          <p style="font-size:10px;font-weight:700;letter-spacing:.09em;color:var(--tx3);margin-top:18px">LINK DO PACOTE</p>
          <div class="field" style="margin-top:7px;justify-content:space-between">
            <span style="color:var(--tx2);font-family:'Fira Code',monospace;font-size:11.5px">niango.io/i/eng-4k29xq</span>
            <span class="mini a">Copiar</span></div>
          <div style="display:flex;align-items:center;gap:12px;margin:16px 0 7px">
            <span style="flex:1;height:1px;background:var(--bd)"></span>
            <span style="font-size:10.5px;color:var(--tx3)">Ou use o código</span>
            <span style="flex:1;height:1px;background:var(--bd)"></span></div>
          <div style="display:flex;gap:8px;justify-content:center;margin-bottom:6px">{CODE_BOXES}</div>
        </div>
      </div>
      <div class="modal" style="position:absolute;right:38px;top:120px;width:400px;padding:16px 18px 10px">
        <p class="sec" style="font-size:12px;margin-bottom:4px">Pessoas com acesso</p>
        {person('AR','Ana Ribeiro','agora mesmo','#f97316',online=True,creator=True)}
        {person('BA','Bruno Alves','há 2 horas','#7b57d4')}
        {person('CD','Carla Dias','agora mesmo','#4ade80',online=True,dark=True)}
        {person('DM','Diego Matos','entrou pelo link','#3b82f6',action='Ver detalhes')}
      </div>
    </div>
  </div></div>''')

# ── 4 ────────────────────────────────────────────────────────────────────
def acc(l, c, n, d, state=''):
    if state == 'wait':
        btn = '<span class="connect wait">Conectando<span class="spin"></span></span>'
    else:
        btn = f'<span class="connect">Conectar{ICON["open"]}</span>'
    return f'''<div class="acc">
      <div class="acc-h"><span class="ico" style="color:{c}">{l}</span>
        <span style="min-width:0"><b>{n}</b><span>{d}</span></span></div>
      <div class="acc-a">{btn}<span class="det">Detalhes</span></div></div>'''

s4 = page('.canvas{top:340px}', head(
    'Passo 03 · Quem recebe',
    'Um clique em <span class="g">Conectar</span> e o serviço abre logado.',
    'A extensão injeta a sessão na aba: nada para configurar, nada para copiar, '
    '<b>nenhuma senha digitada</b>.') + f'''
  <div class="canvas"><div class="win">
    {winbar('app.niango.io/shared/engenharia','Pronto para conectar')}
    <div class="app">
      {side()}
      <div class="main">
        <div class="topbar">
          <div class="search">{ICON['search']}Buscar nos meus acessos…</div>
          <span class="btn btn-g">{ICON['folder']}Engenharia</span>
        </div>
        <div class="panel">
          <div class="pkg-title"><h2>Meus acessos</h2><span class="tag">6 sessões</span></div>
          <p class="meta">Compartilhado por Ana Ribeiro · Engenharia</p>
          <div class="acc-grid" style="margin-top:16px">
            {acc('F','#0acf83','Figma','figma.com','wait')}
            {acc('N','#e8e6e3','Notion','notion.so')}
            {acc('S','#8a7bff','Slack','slack.com')}
            {acc('L','#7b8cff','Linear','linear.app')}
            {acc('C','#e8e6e3','ChatGPT','chatgpt.com')}
            {acc('G','#e8e6e3','GitHub','github.com')}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="note ok" style="right:96px;top:104px">{ICON['check']}Abre já autenticado — sem senha</div>
  </div>''')

# ── 5 ────────────────────────────────────────────────────────────────────
s5 = page('.canvas{top:336px}', head(
    'Controle',
    'Revogue quando quiser: <span class="g">por pessoa, por pacote, por sessão.</span>',
    'Veja quem está conectado agora e quanto tempo cada um usou. '
    'Acabou o contrato? <b>Você encerra um acesso — não troca uma senha.</b>') + f'''
  <div class="canvas"><div class="win">
    {winbar('app.niango.io/collection/engenharia','Acesso revogado')}
    <div class="app">
      {side()}
      <div class="main">
        {topbar()}
        <div class="panel">
          <div style="display:grid;grid-template-columns:1fr 430px;gap:18px">
            <div>
              <div class="pkg-title"><h2>Engenharia</h2><span class="tag">12 pessoas</span></div>
              <p class="meta">Uso do pacote nos últimos 7 dias · Horas de uso por dia</p>
              {CHART}
              <div style="display:flex;gap:10px;margin-top:6px">
                <span class="btn btn-g">{ICON['users']}3 usando agora</span>
                <span class="btn btn-g">{ICON['cal']}7 dias</span>
                <span class="btn btn-g" style="color:#f87171;border-color:rgba(239,68,68,.32)">
                  {ICON['slash']}Revogar pacote</span>
              </div>
            </div>
            <div style="border:1px solid var(--bd);border-radius:12px;padding:12px 14px">
              <p class="sec" style="font-size:12px;margin-bottom:2px">Pessoas com acesso</p>
              {person('AR','Ana Ribeiro','agora mesmo','#f97316',online=True,creator=True)}
              {person('BA','Bruno Alves','há 2 horas · 4h 12m','#7b57d4',action='Revogar',danger=True)}
              {person('CD','Carla Dias','agora mesmo · 1h 40m','#4ade80',online=True,dark=True,action='Revogar',danger=True)}
              {person('DM','Diego Matos','há 3 dias · 22m','#3b82f6',action='Revogar',danger=True)}
            </div>
          </div>
          <p class="sec" style="margin:13px 0 7px">Minhas sessões</p>
          {TABLE}
        </div>
      </div>
    </div>
  </div></div>''')

for i, s in enumerate([s1, s2, s3, s4, s5], 1):
    open(f'slide-{i}.html', 'w').write(s)
print('wrote 5 slides')
