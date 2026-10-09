var WHATSAPP = '2347036071865', CART_KEY = 'ik_cart_v1', INFO_KEY = 'ik_info_v1', OPEN_H = 11, CLOSE_H = 18;

/* Menu data. "notice" = hours of advance notice needed (0 = same day). The admin panel will replace this later. */
var MENU = {
  platters: [
    { id:'platter-x', name:'X (Standard)', price:45000, notice:0, img:'images/platter-standard.jpg', items:['5 bole','Yam','Chicken','Turkey'] },
    { id:'platter-xx', name:'Xx (Supreme)', price:82000, notice:0, tag:'Most shared', img:'images/platter-supreme.jpg', items:['8 bole','Yam','Chicken','Turkey','Suya','Goat meat'] },
    { id:'platter-grammy', name:'Grammy Standard', price:150000, notice:0, img:'images/platter-grammy.jpg', items:['12 bole','Yam','Chicken','Turkey','Suya','Goat meat','Snail'] }
  ],
  combos: [
    { base:'Bole', sub:'Roasted plantain', price:15000, notice:0, proteins:['Chicken','Turkey','Suya','Goat Meat','Snail'] },
    { base:'Yam', sub:'Roasted or fried yam', price:15000, notice:0, proteins:['Chicken','Turkey','Suya','Goat Meat','Snail'] }
  ]
};

function naira(n){ return '\u20A6' + Number(n).toLocaleString('en-NG'); }
function esc(s){ var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
function slug(s){ return String(s).toLowerCase().replace(/\s+/g,'-'); }
function load(k, d){ try{ return JSON.parse(localStorage.getItem(k)) || d; }catch(e){ return d; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

/* ---------- shell: open/closed badge + mobile drawer ---------- */
function initReveal(){
  var els = document.querySelectorAll('.platter-grid>*,.combo-grid>*,.menu-grid>*,.gallery figure,.steps li,.quotes blockquote');
  els.forEach(function(el,i){ el.classList.add('rv'); el.style.transitionDelay = (i % 3) * 110 + 'ms'; });
  function settle(el){ setTimeout(function(){ el.classList.remove('rv','in'); el.style.transitionDelay = ''; }, 1300); }
  if(!('IntersectionObserver' in window)){ els.forEach(function(el){ el.classList.remove('rv'); }); return; }
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); settle(e.target); } }); }, { threshold:.12, rootMargin:'0px 0px -40px 0px' });
  els.forEach(function(el){ io.observe(el); });
}

function initShell(){
  var h = parseInt(new Intl.DateTimeFormat('en-GB',{hour:'numeric',hour12:false,timeZone:'Africa/Lagos'}).format(new Date()),10);
  var open = h >= OPEN_H && h < CLOSE_H;
  document.querySelectorAll('.open-badge').forEach(function(b){
    b.textContent = open ? 'Open now' : 'Closed. Opens 11am';
    b.classList.add(open ? 'is-open' : 'is-closed');
  });
  initReveal();
  var hb = document.getElementById('hamburger'), dr = document.getElementById('drawer'), ov = document.getElementById('drawer-overlay');
  if(!hb || !dr) return;
  function setDrawer(o){ dr.classList.toggle('open',o); ov.classList.toggle('open',o); hb.classList.toggle('open',o); hb.setAttribute('aria-expanded',o); }
  hb.addEventListener('click', function(){ setDrawer(!dr.classList.contains('open')); });
  ov.addEventListener('click', function(){ setDrawer(false); });
  dr.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ setDrawer(false); }); });
}

/* ---------- cart ---------- */
function initCart(){
  var cart = load(CART_KEY, {}), info = load(INFO_KEY, {area:'', when:''});
  document.body.insertAdjacentHTML('beforeend',
    '<div class="cart-overlay" id="cart-overlay"></div>' +
    '<aside class="cart-drawer" id="cart-drawer" aria-label="Your order">' +
      '<div class="cart-head"><h3>Your order</h3><button class="cart-close" id="cart-close" aria-label="Close order">\u2715</button></div>' +
      '<div class="cart-items" id="cart-items"></div>' +
      '<div class="cart-foot">' +
        '<label class="field"><span>Delivery area in Lagos</span><input id="cart-area" type="text" placeholder="e.g. Lekki Phase 1" autocomplete="off"></label>' +
        '<label class="field" id="when-wrap" hidden><span>Preferred date and time</span><input id="cart-when" type="datetime-local"></label>' +
        '<div class="row"><span>Subtotal</span><strong id="cart-sub">\u20A60</strong></div>' +
        '<p class="note">Delivery fee depends on your area. We confirm it on WhatsApp before you pay.</p>' +
        '<p class="err" id="cart-err" role="alert" hidden></p>' +
        '<button class="btn" id="checkout-btn" disabled>Send order on WhatsApp</button>' +
        '<button class="clear" id="clear-btn" type="button" hidden>Clear order</button>' +
      '</div></aside>');
  document.body.insertAdjacentHTML('beforeend',
    '<div class="toast" id="toast" role="status" aria-live="polite">' +
      '<span class="toast-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' +
      '<span class="toast-msg"><b id="toast-name"></b><span>Added to your order</span></span>' +
      '<button class="toast-view cart-open-btn" type="button">View</button><i class="toast-bar"></i></div>');
  var $ = function(id){ return document.getElementById(id); };
  var toast = $('toast'), toastTimer = null;
  function showToast(name){
    $('toast-name').textContent = name;
    clearTimeout(toastTimer);
    toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
    toastTimer = setTimeout(hideToast, 2800);
  }
  function hideToast(){ clearTimeout(toastTimer); toast.classList.remove('show'); }
  var drawer = $('cart-drawer'), overlay = $('cart-overlay'), area = $('cart-area'), when = $('cart-when');
  area.value = info.area || ''; when.value = info.when || '';

  function ids(){ return Object.keys(cart); }
  function render(){
    var list = $('cart-items'), sub = 0, count = 0, notice = 0;
    list.innerHTML = '';
    if(!ids().length) list.innerHTML = '<p class="empty">Your order is empty. Add a combo or a platter to start.</p>';
    ids().forEach(function(id){
      var l = cart[id]; sub += l.price * l.qty; count += l.qty; notice = Math.max(notice, l.notice || 0);
      var row = document.createElement('div'); row.className = 'line';
      row.innerHTML = '<div><h4>' + esc(l.name) + '</h4><span>' + naira(l.price) + (l.notice ? ' \u00B7 needs ' + l.notice + 'h notice' : '') + '</span>' +
        '<div class="qty"><button data-a="dec" aria-label="Fewer">\u2212</button><b>' + l.qty + '</b><button data-a="inc" aria-label="More">+</button></div></div>' +
        '<strong>' + naira(l.price * l.qty) + '</strong>';
      row.querySelector('[data-a=dec]').onclick = function(){ qty(id,-1); };
      row.querySelector('[data-a=inc]').onclick = function(){ qty(id,1); };
      list.appendChild(row);
    });
    $('cart-sub').textContent = naira(sub);
    $('when-wrap').hidden = !notice;
    $('checkout-btn').disabled = !count;
    $('clear-btn').hidden = !count;
    document.querySelectorAll('.cart-fab').forEach(function(f){
      f.classList.toggle('show', count > 0);
      var c = f.querySelector('.cart-count'); if(c){ if(c.textContent != count){ c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick'); } c.textContent = count; }
      var t = f.querySelector('#fab-total'); if(t) t.textContent = naira(sub);
    });
    document.body.classList.toggle('has-items', count > 0);
    save(CART_KEY, cart);
  }
  function qty(id, d){ if(!cart[id]) return; cart[id].qty += d; if(cart[id].qty <= 0) delete cart[id]; render(); }
  function add(id, name, price, notice){
    if(cart[id]) cart[id].qty++; else cart[id] = { name:name, price:price, qty:1, notice:notice || 0 };
    render();
  }
  function setOpen(o){ if(o) hideToast(); drawer.classList.toggle('open',o); overlay.classList.toggle('open',o); }

  document.addEventListener('click', function(e){
    var b = e.target.closest('.add');
    if(b && b.dataset.id){
      add(b.dataset.id, b.dataset.name, Number(b.dataset.price), Number(b.dataset.notice) || 0);
      showToast(b.dataset.name);
      var t = b.textContent; b.textContent = 'Added'; b.classList.add('added');
      setTimeout(function(){ b.textContent = t; b.classList.remove('added'); }, 900);
    }
    if(e.target.closest('.cart-open-btn')) setOpen(true);
  });
  $('cart-close').onclick = overlay.onclick = function(){ setOpen(false); };
  $('clear-btn').onclick = function(){ if(confirm('Clear your whole order?')){ cart = {}; render(); } };
  [area, when].forEach(function(el){ el.addEventListener('input', function(){ save(INFO_KEY, { area:area.value, when:when.value }); }); });

  $('checkout-btn').onclick = function(){
    var err = $('cart-err'), needsWhen = !$('when-wrap').hidden;
    err.hidden = true;
    if(!area.value.trim()){ err.textContent = 'Add your delivery area so we can quote the fee.'; err.hidden = false; area.focus(); return; }
    if(needsWhen && !when.value){ err.textContent = 'Choose a date and time for the items that need notice.'; err.hidden = false; when.focus(); return; }
    var sub = 0, lines = ['Hi Inflammation Kitchen, I would like to order:', ''];
    ids().forEach(function(id){ var l = cart[id]; sub += l.price * l.qty; lines.push('- ' + l.qty + 'x ' + l.name + ' (' + naira(l.price * l.qty) + ')'); });
    lines.push('', 'Subtotal: ' + naira(sub), 'Delivery area: ' + area.value.trim());
    if(needsWhen){ lines.push('Preferred date and time: ' + new Date(when.value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})); }
    lines.push('', 'Please confirm the delivery fee, my total and how to pay. Thank you.');
    window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');
  };
  window.addEventListener('storage', function(e){ if(e.key === CART_KEY){ cart = load(CART_KEY, {}); render(); } });
  render();
}

document.addEventListener('DOMContentLoaded', function(){ initShell(); initCart(); });
