let chartDisc, chartHoras;

function saudacaoHora(){const h=new Date().getHours();return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';}

function initBanner(){
  const agora=new Date();
  const params=new URLSearchParams(location.search);
  const nome=params.get('nome');
  document.getElementById('welcomeMsg').textContent=
    '👋 '+saudacaoHora()+(nome?`, ${nome}!`:'! Central de Manutenção');
  document.getElementById('currentDate').textContent=
    agora.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  tick();setInterval(tick,30000);
}
function tick(){const d=new Date();document.getElementById('clock').textContent=
  String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}

function animar(el,alvo,dec){
  const dur=1200,ini=performance.now();
  function step(t){const p=Math.min((t-ini)/dur,1);const e=1-Math.pow(1-p,3);
    el.textContent=Number((alvo*e).toFixed(dec)).toLocaleString('pt-BR');
    if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}

async function carregar(){
  try{
    const r=await fetch('dados.json?t='+Date.now());
    if(!r.ok)throw new Error(r.status);
    const d=await r.json();

    // KPIs
    document.querySelectorAll('[data-kpi]').forEach(card=>{
      const key=card.dataset.kpi;
      const val=d.totais?.[key];
      const el=card.querySelector('.kpi-value');
      if(el&&val!=null)animar(el,val,parseInt(el.dataset.decimals||'0',10));
    });
    // Subvalores
    document.querySelectorAll('[data-kpi-sub]').forEach(el=>{
      const key=el.dataset.kpiSub;const val=d.totais?.[key];
      if(val!=null){
        const txt=el.textContent.replace(/^—\s*/,'');
        el.textContent=Number(val).toLocaleString('pt-BR')+' '+txt.replace(/^\d+\s*/,'');
      }
    });

    // Contexto
    if(d.periodo_semana)document.getElementById('periodoSemana').textContent=d.periodo_semana;
    if(d.maturacao_aviso)document.getElementById('maturacaoAviso').textContent='⚠️ '+d.maturacao_aviso;
    if(d.atualizacao_texto)document.getElementById('badgeAtualizacao').textContent='Atualizado '+d.atualizacao_texto;

    // Gráficos por disciplina
    const disc=(d.por_disciplina||[]).map(x=>x['[disciplina]']||x.disciplina);
    const ordens=(d.por_disciplina||[]).map(x=>x['[OrdensFechadasSemana]']??x.OrdensFechadasSemana??0);
    const horas=(d.por_disciplina||[]).map(x=>x['[HorasApontadasSemana]']??x.HorasApontadasSemana??0);
    desenharGraficos(disc,ordens,horas);

  }catch(e){console.warn('Falha ao carregar dados.json',e);}
}

function desenharGraficos(labels,ordens,horas){
  const c1=document.getElementById('chartDisciplina');
  const c2=document.getElementById('chartHoras');
  if(chartDisc)chartDisc.destroy();if(chartHoras)chartHoras.destroy();
  const grid={color:'rgba(128,128,128,.15)'};
  if(c1)chartDisc=new Chart(c1,{type:'bar',data:{labels,datasets:[{label:'Ordens',data:ordens,backgroundColor:'rgba(16,124,16,.75)',borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid},x:{grid:{display:false}}}}});
  if(c2)chartHoras=new Chart(c2,{type:'bar',data:{labels,datasets:[{label:'Horas',data:horas,backgroundColor:'rgba(0,120,212,.75)',borderRadius:6}]},options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grid},y:{grid:{display:false}}}}});
}

document.getElementById('themeToggle').addEventListener('click',function(){
  const novo=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',novo);
  this.textContent=novo==='dark'?'☀️':'🌙';
});

window.addEventListener('DOMContentLoaded',()=>{initBanner();carregar();setInterval(carregar,5*60*1000);});
