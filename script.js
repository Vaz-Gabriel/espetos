'use strict';

/* ============================
   CONSTANTES
   ============================ */
const TAXA_ENTREGA  = 5;
const HORA_ABERTURA = 20;
const HORA_FECHAMENTO = 23;
const WHATSAPP_NUM  = '5517988233089';

/* ============================
   ESTADO
   ============================ */
let carrinho = carregarCarrinho();

/* ============================
   INICIALIZAÇÃO
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  verificarHorario();
  renderCarrinho();
  mascararTelefone();
});

/* ============================
   HORÁRIO
   ============================ */
function verificarHorario() {
  const h = new Date().getHours();
  const aberto = h >= HORA_ABERTURA && h < HORA_FECHAMENTO;
  document.getElementById('closed-banner').classList.toggle('hidden', aberto);
}

/* ============================
   PERSISTÊNCIA
   ============================ */
function carregarCarrinho() {
  try {
    return JSON.parse(localStorage.getItem('vaz_carrinho')) || [];
  } catch {
    return [];
  }
}

function salvarCarrinho() {
  localStorage.setItem('vaz_carrinho', JSON.stringify(carrinho));
}

/* ============================
   TOAST
   ============================ */
let _toastTimer = null;
function mostrarToast(txt) {
  const el = document.getElementById('toast');
  el.textContent = txt;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ============================
   VIBRAÇÃO
   ============================ */
function vibrar(ms = 60) {
  navigator.vibrate?.(ms);
}

/* ============================
   ANIMAÇÃO CARD
   ============================ */
function animarCard(event) {
  const el = event.currentTarget;
  el.style.transform = 'scale(0.95)';
  setTimeout(() => (el.style.transform = ''), 180);
}

/* ============================
   ADICIONAR ITEM
   ============================ */
function addItem(nome, preco, event) {
  if (event) animarCard(event);
  vibrar();

  const item = carrinho.find(i => i.nome === nome);
  if (item) {
    item.qtd++;
  } else {
    carrinho.push({ nome, preco, qtd: 1 });
  }

  mostrarToast(`✅ ${nome} adicionado!`);
  renderCarrinho();
}

/* ============================
   AUMENTAR / DIMINUIR
   ============================ */
function aumentar(nome) {
  const item = carrinho.find(i => i.nome === nome);
  if (!item) return;
  item.qtd++;
  vibrar();
  renderCarrinho();
}

function diminuir(nome) {
  const idx = carrinho.findIndex(i => i.nome === nome);
  if (idx === -1) return;
  carrinho[idx].qtd--;
  if (carrinho[idx].qtd <= 0) carrinho.splice(idx, 1);
  vibrar();
  renderCarrinho();
}

function limparCarrinho() {
  if (carrinho.length === 0) return;
  if (!confirm('Limpar todos os itens do pedido?')) return;
  carrinho = [];
  renderCarrinho();
  mostrarToast('🗑 Pedido limpo!');
}

/* ============================
   RENDER CARRINHO
   ============================ */
function renderCarrinho() {
  const lista   = document.getElementById('lista');
  const empty   = document.getElementById('empty-cart');
  const resumo  = document.getElementById('resumo');
  const subEl   = document.getElementById('subtotal-val');
  const totalEl = document.getElementById('total-val');

  lista.innerHTML = '';

  if (carrinho.length === 0) {
    empty.classList.remove('hidden');
    resumo.classList.add('hidden');
    salvarCarrinho();
    return;
  }

  empty.classList.add('hidden');
  resumo.classList.remove('hidden');

  let subtotal = 0;

  carrinho.forEach(item => {
    subtotal += item.preco * item.qtd;
    const linhaPreco = `R$ ${(item.preco * item.qtd).toFixed(2).replace('.', ',')}`;

    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div class="item-name">
        ${sanitize(item.nome)}
        <span class="item-sub">${linhaPreco}</span>
      </div>
      <div class="item-controls">
        <button class="qty-btn" onclick="diminuir('${sanitize(item.nome)}')" aria-label="Diminuir">−</button>
        <span class="qty-num">${item.qtd}</span>
        <button class="qty-btn" onclick="aumentar('${sanitize(item.nome)}')" aria-label="Aumentar">+</button>
      </div>
    `;
    lista.appendChild(div);
  });

  const total = subtotal + TAXA_ENTREGA;
  subEl.textContent  = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

  salvarCarrinho();
}

/* ============================
   FINALIZAR PEDIDO
   ============================ */
function finalizarPedido() {
  const h = new Date().getHours();
  if (h < HORA_ABERTURA || h >= HORA_FECHAMENTO) {
    mostrarToast('🚫 Estamos fechados! Das 18h às 23h.');
    return;
  }

  const nome        = document.getElementById('nome').value.trim();
  const telefone    = document.getElementById('telefone').value.trim();
  const endereco    = document.getElementById('endereco').value.trim();
  const numero      = document.getElementById('numero').value.trim();
  const complemento = document.getElementById('complemento').value.trim();
  const pagamento   = document.getElementById('pagamento').value;

  // Validações
  const campos = [
    [nome,      'nome',      '⚠️ Informe seu nome.'],
    [telefone,  'telefone',  '⚠️ Informe seu telefone.'],
    [endereco,  'endereco',  '⚠️ Informe o endereço.'],
    [numero,    'numero',    '⚠️ Informe o número.'],
  ];

  for (const [val, id, msg] of campos) {
    if (!val) {
      document.getElementById(id).focus();
      mostrarToast(msg);
      return;
    }
  }

  if (!pagamento) {
    document.getElementById('pagamento').focus();
    mostrarToast('⚠️ Escolha a forma de pagamento.');
    return;
  }

  if (carrinho.length === 0) {
    mostrarToast('⚠️ Adicione itens ao pedido!');
    return;
  }

  // Montar mensagem
  const endCompleto = complemento
    ? `${endereco}, ${numero} – ${complemento}`
    : `${endereco}, ${numero}`;

  let msg = `🔥 *Pedido – Espetaria VAZ*\n`;
  msg += `\n👤 *Nome:* ${nome}`;
  msg += `\n📞 *Tel:* ${telefone}`;
  msg += `\n📍 *End:* ${endCompleto}`;
  msg += `\n\n🍢 *Itens:*\n`;

  carrinho.forEach(item => {
    const sub = (item.preco * item.qtd).toFixed(2).replace('.', ',');
    msg += `  • ${item.nome} x${item.qtd}  ➜  R$ ${sub}\n`;
  });

  const subtotal = carrinho.reduce((acc, i) => acc + i.preco * i.qtd, 0);
  const total    = subtotal + TAXA_ENTREGA;

  msg += `\n💰 Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  msg += `\n🚚 Entrega: R$ ${TAXA_ENTREGA.toFixed(2).replace('.', ',')}`;
  msg += `\n💵 *Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
  msg += `\n💳 Pagamento: ${pagamento}`;

  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/${WHATSAPP_NUM}?text=${encoded}`, '_blank');
}

/* ============================
   MÁSCARA DE TELEFONE
   ============================ */
function mascararTelefone() {
  const el = document.getElementById('telefone');
  if (!el) return;
  el.addEventListener('input', () => {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d+)$/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d+)$/, '($1) $2');
    }
    el.value = v;
  });
}

/* ============================
   UTILIDADES
   ============================ */
function sanitize(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
