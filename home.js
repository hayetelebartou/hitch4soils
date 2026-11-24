/* Page d'accueil : calculateur, compteur, formulaire, total des promesses */

/* Taux de secours : unités de chaque monnaie pour 1 euro (BCE, 1er juillet 2026).
   Le site essaie de les mettre à jour automatiquement à l'ouverture. */
var RATES = {EUR:1, CHF:0.9234, TRY:53.1266, USD:1.1383, CNY:7.7342};
var RATES_DATE = "2026-07-01";
var RATES_URL = "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=CHF,TRY,USD,CNY";

var capTouched = false;
var STATS = null;

function locale(){ return lang === "fr" ? "fr-CH" : "en-GB"; }

function fmtMoney(n, code){
  return new Intl.NumberFormat(locale(), {style:"currency", currency:code, minimumFractionDigits: Math.abs(n % 1) > 1e-9 ? 2 : 0, maximumFractionDigits:2}).format(n);
}

function fmtDate(iso){
  var p = String(iso).split("-");
  return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : iso;
}

/* Arrondi "propre" à 2 chiffres significatifs (ex. 2656 → 2700) */
function niceRound(x){
  if (!isFinite(x) || x <= 0) return 0;
  var mag = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / mag) * mag;
}

function computeAmount(rate, km, cap, noCap){
  var raw = Math.max(0, rate) * Math.max(0, km) / 100;
  var capped = !noCap && cap > 0 && raw > cap;
  return {raw: raw, total: capped ? cap : raw, capped: capped};
}

function toEuro(amount, code){
  return amount / (RATES[code] || 1);
}

function updateCalc(){
  var code  = document.getElementById("currency").value;
  var rate  = parseFloat(document.getElementById("rate").value) || 0;
  var more  = parseFloat(document.getElementById("km").value) || 0;
  var km    = more;
  var cap   = parseFloat(document.getElementById("cap").value) || 0;
  var noCap = document.getElementById("nocap").checked;
  document.getElementById("cap").disabled = noCap;
  document.getElementById("cap-cur").textContent = code;
  var r = computeAmount(rate, km, cap, noCap);
  var t = T[lang];
  var text = t.r_base.replace("%km%", km).replace("%rate%", rate);
  if (r.capped) text += " " + t.r_capped.replace("%cap%", fmtMoney(cap, code)).replace("%raw%", fmtMoney(r.raw, code));
  document.getElementById("result-text").textContent = text;
  document.getElementById("result-amount").textContent = fmtMoney(r.total, code);
  var nf = new Intl.NumberFormat(locale());
  var eurLine = code === "EUR"
    ? t.r_eur_same
    : t.r_eur.replace("%eur%", fmtMoney(toEuro(r.total, code), "EUR")).replace("%date%", fmtDate(RATES_DATE));
  document.getElementById("result-eur").textContent = eurLine;
}

function onCurrencyChange(){
  if (!capTouched){
    var code = document.getElementById("currency").value;
    document.getElementById("cap").value = niceRound(50 * (RATES[code] || 1));
  }
  updateCalc();
}

function renderStats(){
  var el = document.getElementById("stats");
  if (!STATS){ el.hidden = true; return; }
  el.textContent = T[lang].stats_line
    .replace("%n%", STATS.count)
    .replace("%eur%", fmtMoney(STATS.total, "EUR"));
  el.hidden = false;
}

/* Lit le CSV publié : on cherche les lignes par leur libellé, ex. « Nombre de promesses,12 » */
function parseStats(csv){
  var out = {};
  csv.split(/\r?\n/).forEach(function(line){
    var i = line.lastIndexOf(",");
    if (i < 0) return;
    var label = line.slice(0, i).replace(/"/g, "").toLowerCase();
    var num = parseFloat(line.slice(i + 1).replace(/"/g, ""));
    if (isNaN(num)) return;
    if (label.indexOf("km utilis") === 0) out.km = num;
    if (label.indexOf("nombre de promesses") === 0) out.count = num;
    if (label.indexOf("total promis") === 0) out.total = num;
  });
  return (out.count !== undefined && out.total !== undefined && out.count > 0) ? out : null;
}

langHooks.push(function(){
  updateCalc();
  renderStats();
});

document.getElementById("currency").addEventListener("change", onCurrencyChange);
["rate","km","cap","nocap"].forEach(function(id){
  var el = document.getElementById(id);
  el.addEventListener("input", function(){ if (id === "cap") capTouched = true; updateCalc(); });
  el.addEventListener("change", updateCalc);
});

/* Le formulaire Google s'affiche directement dans la page dès que formUrl est un vrai lien */
if (/^https:\/\/docs\.google\.com\/forms\//.test(CONFIG.formUrl)){
  var frame = document.getElementById("form-frame");
  frame.src = CONFIG.formUrl + (CONFIG.formUrl.indexOf("?") >= 0 ? "&" : "?") + "embedded=true";
  frame.hidden = false;
}

initPage();

/* Total des promesses (affiché seulement si statsUrl est rempli et qu'il y a au moins une promesse) */
if (CONFIG.statsUrl){
  try {
    fetch(CONFIG.statsUrl).then(function(res){ return res.ok ? res.text() : Promise.reject(); }).then(function(csv){
      STATS = parseStats(csv); renderStats();
    }).catch(function(){});
  } catch (e) {}
}

/* Mise à jour automatique des taux (si la connexion le permet) */
try {
  fetch(RATES_URL).then(function(res){ return res.ok ? res.json() : Promise.reject(); }).then(function(data){
    if (data && data.rates && data.date){
      ["CHF","TRY","USD","CNY"].forEach(function(c){ if (data.rates[c]) RATES[c] = data.rates[c]; });
      RATES_DATE = data.date;
      if (!capTouched) onCurrencyChange(); else updateCalc();
    }
  }).catch(function(){});
} catch (e) {}
