let chartDisc, chartHoras;
let ultimoDataset = null;

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

function preencherMeters(totais){
  document.querySelectorAll('.kpi-card[data-meter="true"]').forEach(card=>{
    const parte=Number(totais[card.dataset.kpi])||0;
    const subEl=card.querySelector('[data-kpi-sub]');
    const total=subEl?Number(totais[subEl.dataset.kpiSub])||0:0;
    const pct=total>0?Math.max(0,Math.min(100,(parte/total)*100)):0;
    const fill=card.querySelector('.kpi-meter-fill');
    if(fill)requestAnimationFrame(()=>{fill.style.width=pct+'%';});
  });
}

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
    preencherMeters(t);

    setText('periodoSemana',d.periodo_semana);
    setText('periodoMes',d.periodo_mes||'no mês');
    setText('badgeAtualizacao',d.atualizacao_texto?'Atualizado '+d.atualizacao_texto:'');

    const avisoEl=document.getElementById('maturacaoAviso');
    if(avisoEl){
      if(d.maturacao_aviso){setText('maturacaoTexto',d.maturacao_aviso);avisoEl.hidden=false;}
      else{avisoEl.hidden=true;}
    }

    const linhas=(d.por_disciplina||[]).filter(x=>pega(x,'disciplina'));
    const disc=linhas.map(x=>pega(x,'disciplina'));
    const ordens=linhas.map(x=>Number(pega(x,'OrdensFechadasSemana'))||0);
    const horas=linhas.map(x=>Number(pega(x,'HorasApontadasSemana'))||0);
    ultimoDataset={disc,ordens,horas};
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    desenharGraficos(disc,ordens,horas);
  }catch(e){console.warn('Falha ao carregar dados.json:',e);}
}

function cssVar(nome){return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();}

// Rampa sequencial de laranja: quanto maior o valor, mais escuro o tom.
const RAMPA_CLARA=[0xf6,0xc4,0x93];
const RAMPA_ESCURA=[0xa8,0x44,0x0a];
function corRampa(t){
  const c=Math.max(0,Math.min(1,t));
  const r=Math.round(RAMPA_CLARA[0]+(RAMPA_ESCURA[0]-RAMPA_CLARA[0])*c);
  const g=Math.round(RAMPA_CLARA[1]+(RAMPA_ESCURA[1]-RAMPA_CLARA[1])*c);
  const b=Math.round(RAMPA_CLARA[2]+(RAMPA_ESCURA[2]-RAMPA_CLARA[2])*c);
  return `rgb(${r},${g},${b})`;
}
function coresPorMagnitude(valores){
  const max=Math.max(...valores),min=Math.min(...valores);
  if(max===min)return valores.map(()=>corRampa(1));
  return valores.map(v=>corRampa(.25+.75*((v-min)/(max-min))));
}

function tooltipTema(){
  return {
    enabled:true,
    displayColors:false,
    backgroundColor:cssVar('--surface-2')||'#fff',
    titleColor:cssVar('--text')||'#1c1a17',
    bodyColor:cssVar('--text-soft')||'#7a746c',
    borderColor:cssVar('--line')||'#e5e0d8',
    borderWidth:1,
    cornerRadius:8,
    padding:10,
    titleFont:{family:'Inter',size:12.5,weight:'700'},
    bodyFont:{family:'Inter',size:12,weight:'600'},
    callbacks:{
      label:(ctx)=>' '+Number(ctx.parsed.x??ctx.parsed.y).toLocaleString('pt-BR')
    }
  };
}

function desenharGraficos(labels, ordens, horas) {
  const c1 = document.getElementById('chartDisciplina');
  const c2 = document.getElementById('chartHoras');
  const empty1 = document.getElementById('emptyDisciplina');
  const empty2 = document.getElementById('emptyHoras');
  if (chartDisc) { chartDisc.destroy(); chartDisc = null; }
  if (chartHoras) { chartHoras.destroy(); chartHoras = null; }

  const corGrid = cssVar('--line') || 'rgba(120,110,95,.12)';
  const corTexto = cssVar('--text-soft') || '#7a746c';
  const font = { family: 'Inter', size: 12 };

  // Gráfico 1: Ordens fechadas por disciplina (sequencial, maior valor = tom mais escuro)
  const p1 = labels.map((l, i) => ({ l, v: ordens[i] })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  if (c1) {
    const temDados = p1.length > 0;
    c1.style.display = temDados ? '' : 'none';
    if (empty1) empty1.hidden = temDados;
    if (temDados) {
      const cores = coresPorMagnitude(p1.map(x => x.v));
      chartDisc = new Chart(c1, {
        type: 'bar',
        data: { labels: p1.map(x => x.l), datasets: [{ data: p1.map(x => x.v), backgroundColor: cores, borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }, borderSkipped: 'bottom', maxBarThickness: 22, categoryPercentage: .68, barPercentage: .9 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: 'easeOutQuart' },
          plugins: { legend: { display: false }, tooltip: tooltipTema() },
          scales: {
            y: { beginAtZero: true, grid: { color: corGrid }, ticks: { font, color: corTexto, precision: 0 } },
            x: { grid: { display: false }, ticks: { font, color: corTexto } }
          }
        }
      });
    }
  }

  // Gráfico 2: Horas apontadas por disciplina (sequencial, maior valor = tom mais escuro)
  const p2 = labels.map((l, i) => ({ l, v: horas[i] })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  if (c2) {
    const temDados = p2.length > 0;
    c2.style.display = temDados ? '' : 'none';
    if (empty2) empty2.hidden = temDados;
    if (temDados) {
      const cores = coresPorMagnitude(p2.map(x => x.v));
      chartHoras = new Chart(c2, {
        type: 'bar',
        data: { labels: p2.map(x => x.l), datasets: [{ data: p2.map(x => x.v), backgroundColor: cores, borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 }, borderSkipped: 'left', maxBarThickness: 22, categoryPercentage: .68, barPercentage: .9 }] },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: 'easeOutQuart' },
          plugins: { legend: { display: false }, tooltip: tooltipTema() },
          scales: {
            x: { beginAtZero: true, grid: { color: corGrid }, ticks: { font, color: corTexto, precision: 0 } },
            y: { grid: { display: false }, ticks: { font, color: corTexto }, afterFit: (scale) => { scale.width += 8; } }
          }
        }
      });
    }
  }
}

const toggle=document.getElementById('themeToggle');
if(toggle)toggle.addEventListener('click',function(){
  const novo=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',novo);
  if(ultimoDataset)desenharGraficos(ultimoDataset.disc,ultimoDataset.ordens,ultimoDataset.horas);
});

window.addEventListener('DOMContentLoaded',()=>{initBanner();carregar();setInterval(carregar,5*60*1000);});
