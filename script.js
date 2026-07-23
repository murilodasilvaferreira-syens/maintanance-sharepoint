let chartDisc, chartHoras;

/* ================= BANNER: saudação, data, relógio ================= */
function saudacaoHora() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function initBanner() {
  const agora = new Date();
  const params = new URLSearchParams(location.search);
  const nome = params.get('nome');
  document.getElementById('welcomeMsg').textContent =
    '👋 ' + saudacaoHora() + (nome ? `, ${nome}!` : '! Central de Manutenção');
  document.getElementById('currentDate').textContent =
    agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  tick();
  setInterval(tick, 30000);
}

function tick() {
  const d = new Date();
  const el = document.getElementById('clock');
  if (el) el.textContent =
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ================= Animação count-up dos números ================= */
function animar(el, alvo, dec) {
  const dur = 1200, ini = performance.now();
  function step(t) {
    const p = Math.min((t - ini) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Number((alvo * e).toFixed(dec)).toLocaleString('pt-BR');
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ================= Helper: lê chave em vários formatos ================= */
function pega(obj, chave) {
  if (!obj) return 0;
  return obj['dim_centro_trabalho[' + chave + ']'] ??
         obj['[' + chave + ']'] ??
         obj[chave] ?? 0;
}

/* ================= Carrega dados.json ================= */
async function carregar() {
  try {
    const r = await fetch('dados.json?t=' + Date.now());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const t = d.totais || {};

    /* --- KPIs principais (data-kpi) --- */
    document.querySelectorAll('[data-kpi]').forEach(card => {
      const key = card.dataset.kpi;
      const val = t[key];
      const el = card.querySelector('.kpi-value');
      if (el && val != null) animar(el, Number(val), parseInt(el.dataset.decimals || '0', 10));
    });

    /* --- Subvalores (data-kpi-sub) --- */
    document.querySelectorAll('[data-kpi-sub]').forEach(el => {
      const key = el.dataset.kpiSub;
      const val = t[key];
      const sufixo = el.dataset.sufixo || '';
      if (val != null) el.textContent = Number(val).toLocaleString('pt-BR') + ' ' + sufixo;
    });

    /* --- Contexto --- */
    setText('periodoSemana', d.periodo_semana);
    setText('periodoMes', d.periodo_mes ? '📅 ' + d.periodo_mes : '');
    setText('maturacaoAviso', d.maturacao_aviso ? '⚠️ ' + d.maturacao_aviso : '');
    setText('badgeAtualizacao', d.atualizacao_texto ? 'Atualizado ' + d.atualizacao_texto : '');

    /* --- Gráficos por disciplina --- */
    const linhas = (d.por_disciplina || []).filter(x => pega(x, 'disciplina'));
    const disc   = linhas.map(x => pega(x, 'disciplina'));
    const ordens = linhas.map(x => Number(pega(x, 'OrdensFechadasSemana')) || 0);
    const horas  = linhas.map(x => Number(pega(x, 'HorasApontadasSemana')) || 0);
    desenharGraficos(disc, ordens, horas);

  } catch (e) {
    console.warn('Não foi possível carregar dados.json:', e);
  }
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el && txt != null) el.textContent = txt;
}

/* ================= Gráficos ================= */
function desenharGraficos(labels, ordens, horas) {
  const c1 = document.getElementById('chartDisciplina');
  const c2 = document.getElementById('chartHoras');
  if (chartDisc) chartDisc.destroy();
  if (chartHoras) chartHoras.destroy();
  const grid = { color: 'rgba(128,128,128,.15)' };

  if (c1) chartDisc = new Chart(c1, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Ordens', data: ordens, backgroundColor: 'rgba(16,124,16,.75)', borderRadius: 6 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid }, x: { grid: { display: false } } } }
  });

  if (c2) chartHoras = new Chart(c2, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Horas', data: horas, backgroundColor: 'rgba(0,120,212,.75)', borderRadius: 6 }] },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid }, y: { grid: { display: false } } } }
  });
}

/* ================= Tema claro/escuro ================= */
const toggle = document.getElementById('themeToggle');
if (toggle) toggle.addEventListener('click', function () {
  const novo = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', novo);
  this.textContent = novo === 'dark' ? '☀️' : '🌙';
});

/* ================= Inicialização ================= */
window.addEventListener('DOMContentLoaded', () => {
  initBanner();
  carregar();
  setInterval(carregar, 5 * 60 * 1000); // recarrega a cada 5 min
});
