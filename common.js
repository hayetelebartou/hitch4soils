/* Partagé par toutes les pages : langue, textes, liens de CONFIG */
function readLang(){
  try {
    var s = localStorage.getItem("lang");
    if (s === "fr" || s === "en") return s;
  } catch (e) {}
  return "en";   /* langue par défaut : anglais */
}

var lang = readLang();
var langHooks = [];   /* fonctions à rappeler quand la langue change (ex. le calculateur) */

function setLang(l){
  lang = l;
  try { localStorage.setItem("lang", l); } catch (e) {}
  document.documentElement.lang = l;
  var t = T[l];
  document.querySelectorAll("[data-i18n]").forEach(function(el){ el.textContent = t[el.getAttribute("data-i18n")]; });
  document.querySelectorAll("[data-i18n-html]").forEach(function(el){ el.innerHTML = t[el.getAttribute("data-i18n-html")]; });
  /* Long texte : les paragraphes sont séparés par une ligne vide */
  document.querySelectorAll("[data-i18n-paras]").forEach(function(el){
    el.innerHTML = "";
    String(t[el.getAttribute("data-i18n-paras")]).split("\n\n").forEach(function(par){
      var p = document.createElement("p");
      p.textContent = par;
      el.appendChild(p);
    });
  });
  document.querySelectorAll("[data-i18n-alt]").forEach(function(el){ el.setAttribute("alt", t[el.getAttribute("data-i18n-alt")]); });
  document.querySelectorAll("[data-i18n-title]").forEach(function(el){ el.setAttribute("title", t[el.getAttribute("data-i18n-title")]); });
  document.querySelectorAll(".lang button").forEach(function(b){ b.setAttribute("aria-pressed", b.getAttribute("data-lang") === l ? "true" : "false"); });
  var pageTitle = t[document.body.getAttribute("data-title")];
  if (pageTitle) document.title = pageTitle;
  langHooks.forEach(function(f){ f(); });
}

function initPage(){
  document.querySelectorAll(".lang button").forEach(function(b){
    b.addEventListener("click", function(){ setLang(b.getAttribute("data-lang")); });
  });
  /* <a data-link="potUrl"> reçoit CONFIG.potUrl, etc. */
  document.querySelectorAll("[data-link]").forEach(function(el){
    var url = CONFIG[el.getAttribute("data-link")];
    if (url && url !== "#") { el.setAttribute("href", url); }
    else { el.setAttribute("href", "#"); }
  });
  setLang(lang);
}
