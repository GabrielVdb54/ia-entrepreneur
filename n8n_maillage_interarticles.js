// Nœud : 🔗 Maillage inter-articles
// Reçoit en $input le résultat de "🔗 Fetch Articles DB" (liste Supabase)
// Lit parsed depuis "📝 Parser réponse"
// Retourne parsed avec content enrichi de liens inter-articles

const parsed = $('📝 Parser réponse').first().json;
const supabaseData = $input.first().json;
const allArticles = Array.isArray(supabaseData) ? supabaseData : [];

function normalize(text) {
  return text.toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c');
}

const STOP = new Set(['le','la','les','de','du','des','un','une','et','en','au','aux','par','sur','dans','avec','pour','que','qui','est','son','sa','ses','ce','cette','ces','plus','tout','tous','si','ou','mais','donc','car','ne','pas','se','il','elle','ils','elles','on','nous','vous','tres','bien','aussi','meme','encore','deja','lors','apres','avant','sans','guide','complet','pratique','2026','2025','tpe','pme']);
const GENERIC = new Set(['entreprise','entreprises','entrepreneur','entrepreneurs','activite','gestion','strategie','solution','service','services','equipe','client','clients','marche','secteur','projet','objectif']);

function extractKeywords(title) {
  const words = normalize(title).match(/\b[a-z]{4,}\b/g) || [];
  return words.filter(w => !STOP.has(w) && !GENERIC.has(w));
}

function findAnchor(keywords, bodyNorm, titleOrig) {
  const words = (titleOrig.match(/\b\w+\b/g) || []);
  for (const size of [3, 2]) {
    for (let i = 0; i <= words.length - size; i++) {
      const phrase = words.slice(i, i + size).join(' ');
      if (phrase.length < 6) continue;
      if (!extractKeywords(phrase).length) continue;
      if (bodyNorm.includes(normalize(phrase))) return phrase;
    }
  }
  return [...keywords].sort((a, b) => b.length - a.length).find(kw => kw.length >= 5 && bodyNorm.includes(normalize(kw))) || null;
}

function insertLink(content, anchor, url) {
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('\\b' + escaped + '\\b', 'i');
  let replaced = false;
  return content.replace(pattern, function(match, offset, str) {
    if (replaced) return match;
    const before = str.slice(0, offset);
    if (before.lastIndexOf('<') > before.lastIndexOf('>')) return match;
    if (before.lastIndexOf('<a ') > before.lastIndexOf('</a>')) return match;
    for (const h of ['h1', 'h2', 'h3']) {
      if (before.lastIndexOf('<' + h) > before.lastIndexOf('</' + h + '>')) return match;
    }
    replaced = true;
    return '<a href="' + url + '">' + match + '</a>';
  });
}

const newSlug = parsed.slug || '';
let content = parsed.content || '';
const bodyNorm = normalize(content);
const candidates = [];

for (const art of allArticles) {
  if (!art.slug || art.slug === newSlug || !art.title) continue;
  const url = '/blog/' + art.slug + '.html';
  if (content.includes(url)) continue;
  const kws = extractKeywords(art.title);
  if (!kws.length) continue;
  const score = kws.filter(kw => bodyNorm.includes(normalize(kw))).length;
  if (score >= 2) {
    const anchor = findAnchor(kws, bodyNorm, art.title);
    if (anchor) candidates.push({ score, anchor, url });
  }
}

candidates.sort(function(a, b) { return b.score - a.score || b.anchor.length - a.anchor.length; });

let linksAdded = 0;
for (const c of candidates) {
  if (linksAdded >= 3) break;
  if (content.includes(c.url)) continue;
  const newContent = insertLink(content, c.anchor, c.url);
  if (newContent !== content) {
    content = newContent;
    linksAdded++;
  }
}

return [{ json: { ...parsed, content } }];
