let chartDisc, chartHoras;
const COR_ACCENT = '#e8701a';
const COR_ACCENT2 = '#c9852f';

function saudacaoHora(){const h=new Date().getHours();return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';}

function initBanner(){
  const agora=new Date();
  const params=new URLSearchParams(location.search);
  const nome=params.get('nome');
  document.getElementById('welcomeMsg').textContent=
    nome ? `${saudacaoHora()}, ${nome}` : 'Central de Manutenção';
  document.getElementById('currentDate').textContent=
    agora.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  tick();setInterval(tick,30000);
}
function tick(){const d=new Date();const el=document.getElementById('clock');
  if(el)el.textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}

function animar(el,alvo,dec){
  const dur=1200,ini=performance.now();
  function step(t){const p=Math.min((t-ini)/dur,1);const e=1-Math.pow(1-p,3);
    el.textContent=Number((alvo*e).toFixed(dec)).toLocaleString('pt-BR');
    if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}

function pega(obj,chave){
  if(!obj)return 0;
  return obj['dim_centro_trabalho['+chave+']']??obj['['+chave+']']??obj[chave]??0;
}
function setText(id,txt){const el=document.getElementById(id);if(el&&txt!=null)el.textContent=txt;}

async function carregar(){
  try{
    const r=await fetch('dados.json?t='+Date.now());
    if(!r.ok)throw new Error('HTTP '+r.status);
    const d=await r.json();const t=d.totais||{};

    document.querySelectorAll('[data-kpi]').forEach(card=>{
      const val=t[card.dataset.kpi];const el=card.querySelector('.kpi-value');
      if(el&&val!=null)animar(el,Number(val),parseInt(el.dataset.decimals||'0',10));
    });
    document.querySelectorAll('[data-kpi-sub]').forEach(el=>{
      const val=t[el.dataset.kpiSub];const sfx=el.dataset.sufixo||'';
      if(val!=null)el.textContent=Number(val).toLocaleString('pt-BR')+' '+sfx;
    });

    setText('periodoSemana',d.periodo_semana);
    setText('periodoMes',d.periodo_mes||'no mês');
    setText('maturacaoAviso',d.maturacao_aviso||'');
    setText('badgeAtualizacao',d.atualizacao_texto?'Atualizado '+d.atualizacao_texto:'');

    const linhas=(d.por_disciplina||[]).filter(x=>pega(x,'disciplina'));
    const disc=linhas.map(x=>pega(x,'disciplina'));
    const ordens=linhas.map(x=>Number(pega(x,'OrdensFechadasSemana'))||0);
    const horas=linhas.map(x=>Number(pega(x,'HorasApontadasSemana'))||0);
    desenharGraficos(disc,ordens,horas);
  }catch(e){console.warn('Falha ao carregar dados.json:',e);}
}

function desenharGraficos(labels, ordens, horas) {
  const c1 = document.getElementById('chartDisciplina');
  const c2 = document.getElementById('chartHoras');
  if (chartDisc) chartDisc.destroy();
  if (chartHoras) chartHoras.destroy();
  const grid = { color: 'rgba(120,110,95,.12)' };
  const font = { family: 'Inter', size: 12 };

  // ---- Gráfico 1: Ordens (ordenado da maior p/ menor) ----
  const parOrdens = labels
    .map((l, i) => ({ l, v: ordens[i] }))
    .filter(x => x.v > 0)                       // remove disciplinas zeradas
    .sort((a, b) => b.v - a.v);                 // ordena desc
  const labelsOrd = parOrdens.map(x => x.l);
  const dadosOrd = parOrdens.map(x => x.v);

  if (c1) chartDisc = new Chart(c1, {
    type: 'bar',
    data: { labels: labelsOrd, datasets: [{ data: dadosOrd, backgroundColor: '#e8701a', borderRadius: 2, barThickness: 22 }] },
    options: { responsive: true, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid, ticks: { font } }, x: { grid: { display: false }, ticks: { font } } } }
  });

  // ---- Gráfico 2: Horas (ordenado da maior p/ menor) ----
  const parHoras = labels
    .map((l, i) => ({ l, v: horas[i] }))
    .filter(x => x.v > 0)                       // remove zeradas
    .sort((a, b) => b.v - a.v);                 // ordena desc
  const labelsHrs = parHoras.map(x => x.l);
  const dadosHrs = parHoras.map(x => x.v);

  if (c2) chartHoras = new Chart(c2, {
    type: 'bar',
    data: { labels: labelsHrs, datasets: [{ data: dadosHrs, backgroundColor: '#d15a1e', borderRadius: 2, barThickness: 22 }] },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, grid, ticks: { font } }, y: { grid: { display: false }, ticks: { font } } } }
  });
}

const toggle=document.getElementById('themeToggle');
if(toggle)toggle.addEventListener('click',function(){
  const novo=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',novo);
});

window.addEventListener('DOMContentLoaded',()=>{initBanner();carregar();setInterval(carregar,5*60*1000);});
