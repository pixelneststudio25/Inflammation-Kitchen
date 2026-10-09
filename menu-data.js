/* ===== Settings: paste your Supabase values here (anon public key only, never the service_role key) ===== */
var SUPABASE_URL = 'PASTE_YOUR_PROJECT_URL';
var SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_PUBLIC_KEY';
var WHATSAPP = '2347036071865';

/* Built-in menu, used until a menu is published from the admin panel. notice = hours of advance notice (0 = same day). */
var DEFAULT_MENU = {
  settings: { open:'11:00', close:'18:00', paused:false, pauseMessage:'' },
  platters: [
    { id:'platter-x', name:'X (Standard)', price:45000, notice:0, soldOut:false, tag:'', img:'images/platter-standard.jpg', items:['5 bole','Yam','Chicken','Turkey'] },
    { id:'platter-xx', name:'Xx (Supreme)', price:82000, notice:0, soldOut:false, tag:'Most shared', img:'images/platter-supreme.jpg', items:['8 bole','Yam','Chicken','Turkey','Suya','Goat meat'] },
    { id:'platter-grammy', name:'Grammy Standard', price:150000, notice:0, soldOut:false, tag:'', img:'images/platter-grammy.jpg', items:['12 bole','Yam','Chicken','Turkey','Suya','Goat meat','Snail'] }
  ],
  combos: [
    { base:'Bole', sub:'Roasted plantain', price:15000, notice:0, proteins:[{name:'Chicken'},{name:'Turkey'},{name:'Suya'},{name:'Goat Meat'},{name:'Snail'}] },
    { base:'Yam', sub:'Roasted or fried yam', price:15000, notice:0, proteins:[{name:'Chicken'},{name:'Turkey'},{name:'Suya'},{name:'Goat Meat'},{name:'Snail'}] }
  ]
};
var MENU = JSON.parse(JSON.stringify(DEFAULT_MENU));

function naira(n){ return '\u20A6' + Number(n).toLocaleString('en-NG'); }
function esc(s){ var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
function slug(s){ return String(s).toLowerCase().replace(/\s+/g,'-'); }

/* Loads the published menu from Supabase. Falls back to the built-in menu if anything is missing or slow. */
window.menuReady = (function(){
  var load = new Promise(function(done){
    if(!window.supabase || SUPABASE_URL.indexOf('PASTE') === 0) return done();
    try{
      window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY).from('menu_published').select('data').eq('id',1).single().then(function(r){
        var d = r && r.data && r.data.data;
        if(d && d.platters && d.combos){ MENU = d; MENU.settings = Object.assign({}, DEFAULT_MENU.settings, d.settings); }
        done();
      }, done);
    }catch(e){ done(); }
  });
  return Promise.race([load, new Promise(function(r){ setTimeout(r, 2500); })]);
})();

/* ---------- shared card builders (home page and menu page) ---------- */
function addBtn(id, name, price, notice, sold){
  if(sold) return '<button class="add" disabled>Sold out</button>';
  return '<button class="add" data-id="' + esc(id) + '" data-name="' + esc(name) + '" data-price="' + price + '" data-notice="' + (notice || 0) + '">Add to order</button>';
}
function platterCardHTML(p){
  return '<article class="platter pl' + (p.tag ? ' big' : '') + (p.soldOut ? ' is-sold' : '') + '"><div class="p-img"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy">' +
    (p.tag ? '<span class="p-ribbon">' + esc(p.tag) + '</span>' : '') + '<h3>' + esc(p.name) + '</h3></div><div class="p-body"><p class="p-label">What\'s inside</p><ul class="p-list">' +
    (p.items || []).map(function(i){ return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' + (p.notice ? '<span class="tag">Order ' + p.notice + 'h ahead</span>' : '') +
    '<div class="p-foot"><span class="price">' + naira(p.price) + '</span>' + addBtn(p.id, p.name + ' platter', p.price, p.notice, p.soldOut) + '</div></div></article>';
}
function comboBuilderHTML(c){
  var first = c.proteins.filter(function(p){ return !p.soldOut; })[0];
  var chips = c.proteins.map(function(p){
    return '<label><input type="radio" name="' + slug(c.base) + '" value="' + esc(p.name) + '"' + (p.soldOut ? ' disabled' : '') + (first && p.name === first.name ? ' checked' : '') + '><span>' + esc(p.name) + (p.soldOut ? ' (sold out)' : '') + '</span></label>';
  }).join('');
  return '<article class="combo" data-base="' + esc(c.base) + '" data-price="' + c.price + '" data-notice="' + (c.notice || 0) + '"><div class="c-img"><img src="" alt="' + esc(c.base) + ' combo" loading="lazy"></div><div class="c-body"><h3>' + esc(c.base) + ' combo</h3><p class="sub">' + esc(c.sub) + '</p>' +
    '<fieldset class="chips"><legend>Pick your protein</legend>' + chips + '</fieldset><div class="p-foot"><span class="price">' + naira(c.price) + '</span><button class="add combo-add"' + (first ? '' : ' disabled') + '>' + (first ? 'Add to order' : 'Sold out') + '</button></div></div></article>';
}
function initComboBuilders(root){
  (root || document).querySelectorAll('.combo').forEach(function(card){
    var base = card.dataset.base, btn = card.querySelector('.combo-add'), img = card.querySelector('.c-img img');
    function sync(){
      var on = card.querySelector('input:checked'); if(!on) return;
      var p = on.value;
      btn.dataset.id = slug(base) + '-' + slug(p); btn.dataset.name = base + ' and ' + p;
      btn.dataset.price = card.dataset.price; btn.dataset.notice = card.dataset.notice;
      img.src = 'images/' + slug(base) + '-' + slug(p) + '.jpg';
    }
    card.addEventListener('change', sync); sync();
  });
}
function proteinCardHTML(c, p){
  var id = slug(c.base) + '-' + slug(p.name), nm = c.base + ' and ' + p.name;
  return '<article class="platter' + (p.soldOut ? ' is-sold' : '') + '"><div class="p-img"><img src="images/' + id + '.jpg" alt="' + esc(nm) + '" loading="lazy"></div><div class="p-body"><h3>' + esc(nm) + '</h3>' +
    (c.notice ? '<span class="tag">Order ' + c.notice + 'h ahead</span>' : '') + '<div class="p-foot"><span class="price">' + naira(c.price) + '</span>' + addBtn(id, nm, c.price, c.notice, p.soldOut) + '</div></div></article>';
}
