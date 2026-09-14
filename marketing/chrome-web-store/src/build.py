from _parts import MARK, ICON, head, page, winbar

GRID = 'grid-template-columns:292px 104px 236px 1fr'

def side(active='Engenharia'):
    rows = []
    for n, dot in [('Engenharia',0),('Design',0),('Financeiro',0),('Marketing',1)]:
        cls = ' on' if n == active else ''
        bell = '<i class="n"></i>' if dot else ''
        rows.append(f'<div class="pkg{cls}">{n}{bell}</div>')
    return f'''<div class="side">
      <div class="side-brand">{MARK}<b>Niango</b></div>
      <div class="nav">
        <div class="nav-item on">{ICON['folder']}Minha coleção</div>
        <div class="nav-item">{ICON['send']}Meus acessos</div>
      </div>
      <div class="side-label">PACOTES<span class="side-add">{ICON['plus']}</span></div>
      {''.join(rows)}
      <div class="plans"><b>Niango Planos</b><p>Compartilhe com muito mais pessoas.</p>
        <a>Fazer upgrade →</a></div>
    </div>'''

def topbar():
    return f'''<div class="topbar">
        <div class="search">{ICON['search']}Buscar sessões do pacote…</div>
        <span class="btn btn-g">{ICON['users']}<b style="color:var(--tx)">12</b> pessoas</span>
        <span class="btn btn-g">{ICON['share']}Compartilhar</span>
        <span class="btn btn-a">{ICON['plus']}Adicionar sessão</span>
      </div>'''

CHART = '''<svg viewBox="0 0 470 132" style="width:100%;height:116px;margin-top:6px">
  <defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f97316" stop-opacity=".28"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/>
  </linearGradient></defs>
  <path d="M26 74C48 70 92 46 136 49S202 92 246 86 312 30 356 22s48 26 88 52v38H26Z" fill="url(#a)"/>
  <path d="M26 74C48 70 92 46 136 49S202 92 246 86 312 30 356 22s48 26 88 52" fill="none"
    stroke="#f97316" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="#131416" stroke="#f97316" stroke-width="2">
    <circle cx="26" cy="74" r="3.4"/><circle cx="136" cy="49" r="3.4"/><circle cx="246" cy="86" r="3.4"/>
    <circle cx="356" cy="22" r="4.6"/><circle cx="444" cy="74" r="3.4"/></g>
  <text x="356" y="12" font-size="10.5" font-weight="700" fill="#d6d3cd" text-anchor="middle" font-family="Inter">7h 18m</text>
  <g font-size="9.5" fill="#9d9488" text-anchor="middle" font-family="Inter">
    <text x="26" y="126">Seg</text><text x="136" y="126">Ter</text><text x="246" y="126">Qua</text>
    <text x="356" y="126">Qui</text><text x="444" y="126">Sex</text></g>
</svg>'''

def person(ini, name, when, color, online=False, creator=False, action='Ver detalhes', danger=False, dark=False):
    tag = '<span class="pill">Criador</span>' if creator else ''
    d = ' danger' if danger else ''
    return f'''<div class="person">
      <div class="av{' on' if online else ''}" style="background:{color}{';color:#0b2c1e' if dark else ''}">{ini}</div>
      <div style="min-width:0;flex:1"><b>{name}</b><span>{when}</span></div>
      {tag}<span class="ghost{d}">{action}</span></div>'''

def row(letter, lcolor, name, domain, avs, using, time, trend, tclass, hi=False):
    stack = ''.join(f'<i style="background:{c}">{t}</i>' for c, t in avs)
    return f'''<div class="row{' hi' if hi else ''}" style="{GRID}">
      <div class="svc"><span class="ico" style="color:{lcolor}">{letter}</span>
        <span style="min-width:0"><b>{name}</b><span>{domain}</span></span></div>
      <div><span class="st"><i></i>Ativa</span></div>
      <div style="display:flex;align-items:center"><span class="stack">{stack}</span>
        <span class="using">{using}</span></div>
      <div><span class="time">{time}</span><br><span class="trend {tclass}">{trend}</span></div>
    </div>'''

TABLE = f'''<div class="tbl">
  <div class="tbl-h" style="{GRID}"><span>SERVIÇO</span><span>STATUS</span><span>USANDO AGORA</span><span>TEMPO DE USO HOJE</span></div>
  {row('F','#0acf83','Figma','figma.com',[('#4ade80','C'),('#7b57d4','B'),('#f97316','A')],'3 pessoas','2h 10m','↑ 1,8× o costume','up',hi=True)}
  {row('N','#e8e6e3','Notion','notion.so',[('#7b57d4','B'),('#f97316','A')],'2 pessoas','1h 24m','↓ 62% do costume','flat')}
  {row('L','#7b8cff','Linear','linear.app',[('#4ade80','C')],'1 pessoa','58m','no costume','flat')}
  {row('S','#8a7bff','Slack','slack.com',[('#f97316','A')],'1 pessoa','42m','↓ 38% do costume','flat')}
</div>'''
