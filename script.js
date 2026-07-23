// ============ SAUDAÇÃO + DATA + RELÓGIO ============
function atualizarSaudacao() {
  const agora = new Date();
  const hora = agora.getHours();
  let saudacao = 'Bom dia';
  if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';
  else if (hora >= 18 || hora < 5) saudacao = 'Boa noite';

  // Nome: como o iframe não acessa o usuário do SharePoint,
  // você pode passar por parâmetro na URL: ...?nome=Murilo
  const params = new URLSearchParams(window.location.search);
  const nome = params.get('nome');
  const alvo = document.getElementById('welcomeMsg');
  if (nome) {
    alvo.textContent = `👋 ${saudacao}, ${nome}!`;
  } else {
    alvo.textContent = `👋 ${saudacao}! Bem-vindo à Central de Manutenção`;
  }

  const opcoes = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('currentDate').textContent =
    agora.toLocaleDateString('pt-BR', opcoes);
}

function atualizarRelogio() {
  const agora = new Date();
  const h = String(agora.getHours()).padStart(2, '0');
  const m = String(agora.getMinutes()).padStart(2, '0');
  document.getElementById('clock').textContent = `${h}:${m}`;
}

// ============ ANIMAÇÃO DOS NÚMEROS (COUNT-UP) ============
function animarNumeros() {
  document.querySelectorAll('.kpi-value').forEach(el => {
    const alvo = parseFloat(el.dataset.target);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const duracao = 1400;
    const inicio = performance.now();
    function passo(t) {
      const prog = Math.min((t - inicio) / duracao, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      const valor = (alvo * ease).toFixed(dec);
      el.textContent = Number(valor).toLocaleString('pt-BR');
      if (prog < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  });
}

// ============ TEMA CLARO/ESCURO ============
document.getElementById('themeToggle').addEventListener('click', function () {
  const atual = document.documentElement.getAttribute('data-theme');
  const novo = atual === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', novo);
  this.textContent = novo === 'dark' ? '☀️' : '🌙';
});

// ============ GRÁFICO ============
function criarGrafico() {
  const ctx = document.getElementById('osChart');
  if (!ctx || typeof Chart === 'undefined') return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      datasets: [
        {
          label: 'OS Abertas',
          data: [52, 48, 61, 55, 47, 47],
          backgroundColor: 'rgba(0,120,212,.75)',
          borderRadius: 6
        },
        {
          label: 'OS Concluídas',
          data: [45, 50, 54, 58, 44, 51],
          backgroundColor: 'rgba(16,124,16,.75)',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,.15)' } }, x: { grid: { display: false } } }
    }
  });
}

// ============ INICIALIZAÇÃO ============
window.addEventListener('DOMContentLoaded', () => {
  atualizarSaudacao();
  atualizarRelogio();
  setInterval(atualizarRelogio, 30000);
  animarNumeros();
  criarGrafico();
});
