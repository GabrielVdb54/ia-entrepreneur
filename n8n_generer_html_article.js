// Génère le fichier HTML complet de l'article
const parsed = $('📝 Parser réponse').first().json;
const imageUrl = (() => {
  try {
    const uploadResult = $input.first().json;
    return uploadResult.Key ? 'https://srmmlwvumrqcpdwwrxjh.supabase.co/storage/v1/object/public/' + uploadResult.Key : null;
  } catch(e) { return null; }
})();

const sourceUrl = (() => {
  try { return $('🔄 Loop Articles').first().json.url; } catch(e) {
    try { return $('Preparer Article Form').first().json.url; } catch(e2) { return null; }
  }
})();

const today = new Date();
const dateISO = today.toISOString().split('T')[0];
const dateDisplay = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const wordCount = (parsed.content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(function(w){ return w.length > 0; }).length;
const readTime = Math.max(4, Math.ceil(wordCount / 200));

const categoryLabel = parsed.category || "IA & Entreprise";
const heroImage = imageUrl || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&q=80';

const titleEsc = (parsed.title || '').replace(/"/g, '\\"');
const excerptRaw = parsed.excerpt || '';
const excerptShort = excerptRaw.substring(0, 160).replace(/"/g, '\\"');
const excerptMed = excerptRaw.substring(0, 200).replace(/"/g, '\\"');

const tagsHtml = (parsed.tags && parsed.tags.length > 0)
  ? '<div class="sidebar-card"><h4>Tags</h4><div class="tags-list">' + parsed.tags.map(function(t){ return '<span class="tag-item">' + t + '</span>'; }).join('') + '</div></div>'
  : '';

const excerptBlock = excerptRaw ? '<p class="article-excerpt">' + excerptRaw + '</p>' : '';

const ldJson = '{"@context":"https://schema.org","@type":"Article","headline":"' + titleEsc + '","description":"' + excerptShort + '","author":{"@type":"Organization","name":"IA-Entrepreneur","url":"https://ia-entrepreneur.fr"},"datePublished":"' + dateISO + '","dateModified":"' + dateISO + '","publisher":{"@type":"Organization","name":"IA-Entrepreneur"},"image":"' + heroImage + '"}';

let html = '<!DOCTYPE html>';
html += '<html lang="fr">';
html += '<head>';
html += '<meta name="robots" content="index, follow" />';
html += '<meta name="twitter:card" content="summary_large_image" />';
html += '<meta name="twitter:title" content="' + titleEsc + '" />';
html += '<meta name="twitter:description" content="' + excerptShort + '" />';
html += '<meta name="twitter:image" content="' + heroImage + '" />';
html += '<meta property="article:published_time" content="' + dateISO + '" />';
html += '<meta property="article:author" content="IA-Entrepreneur" />';
html += '<script async src="https://www.googletagmanager.com/gtag/js?id=G-SZG9XPNNNC"></script>';
html += '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-SZG9XPNNNC");</script>';
html += '<meta charset="UTF-8" />';
html += '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
html += '<title>' + parsed.title + ' | IA-Entrepreneur</title>';
html += '<meta name="description" content="' + excerptShort + '" />';
html += '<link rel="canonical" href="https://ia-entrepreneur.fr/blog/' + parsed.slug + '.html" />';
html += '<meta property="og:title" content="' + titleEsc + '" />';
html += '<meta property="og:description" content="' + excerptMed + '" />';
html += '<meta property="og:image" content="' + heroImage + '" />';
html += '<meta property="og:url" content="https://ia-entrepreneur.fr/blog/' + parsed.slug + '.html" />';
html += '<meta property="og:type" content="article" />';
html += '<script type="application/ld+json">' + ldJson + '</script>';
html += '<link rel="icon" type="image/png" href="/favicon.png" />';
html += '<link rel="preconnect" href="https://fonts.googleapis.com" />';
html += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />';
html += '<style>';
html += ':root{--bg:#FFFFFF;--bg2:#F5F7FF;--primary:#1A3CFF;--accent:#10B981;--text:#0A0F2C;--muted:#525880;--border:rgba(10,15,44,0.10);--card:rgba(10,15,44,0.04);--radius:14px}';
html += '*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}';
html += 'body{font-family:"Inter",sans-serif;background:var(--bg);color:var(--text);line-height:1.7}';
html += 'a{color:inherit;text-decoration:none}';
html += '.container{max-width:1120px;margin:0 auto;padding:0 24px}';
html += 'header{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,0.92);backdrop-filter:blur(18px);border-bottom:1px solid var(--border);box-shadow:0 2px 24px rgba(10,15,44,0.06)}';
html += '.header-inner{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}';
html += '.logo{font-size:1rem;font-weight:800;color:var(--text);letter-spacing:-0.02em;flex-shrink:0;line-height:1.2}';
html += '.logo span{color:var(--primary)}';
html += 'nav{display:flex;align-items:center;gap:2px}';
html += 'nav a{padding:6px 10px;border-radius:8px;font-size:0.78rem;font-weight:600;color:var(--muted);transition:color 0.2s,background 0.2s;white-space:nowrap}';
html += 'nav a:hover{color:var(--text);background:var(--card)}';
html += '.nav-cta{background:var(--accent)!important;color:#fff!important;border-radius:50px!important;padding:8px 16px!important;font-size:0.8rem!important;box-shadow:0 3px 16px rgba(16,185,129,0.35)!important}';
html += '.hamburger{display:none;flex-direction:column;gap:5px;padding:8px;background:none;border:none;cursor:pointer}';
html += '.hamburger span{display:block;width:24px;height:2px;background:var(--text);border-radius:2px}';
html += '.mobile-menu{display:none;flex-direction:column;gap:4px;padding:16px 24px 20px;background:rgba(255,255,255,0.98);border-top:1px solid var(--border)}';
html += '.mobile-menu.open{display:flex}';
html += '.mobile-menu a{padding:12px 16px;border-radius:var(--radius);font-weight:600;color:var(--muted)}';
html += '.article-hero{margin-top:68px;height:420px;position:relative;overflow:hidden}';
html += '.article-hero img{width:100%;height:100%;object-fit:cover}';
html += '.article-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,15,44,0.2) 0%,rgba(10,15,44,0.6) 100%)}';
html += '.article-hero-content{position:absolute;bottom:0;left:0;right:0;padding:40px;z-index:1;color:#fff}';
html += '.breadcrumb{display:flex;align-items:center;gap:8px;font-size:0.8rem;margin-bottom:16px;opacity:0.85}';
html += '.breadcrumb a{color:#fff}';
html += '.article-category{display:inline-block;padding:4px 14px;border-radius:50px;font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.3);margin-bottom:12px}';
html += '.article-meta{display:flex;align-items:center;gap:16px;font-size:0.82rem;opacity:0.85;margin-top:8px}';
html += '.article-layout{display:grid;grid-template-columns:1fr 320px;gap:48px;padding:56px 0 80px;align-items:start}';
html += '.article-title{font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:800;line-height:1.15;margin-bottom:20px}';
html += '.article-title .gradient{background:linear-gradient(135deg,#1A3CFF 0%,#10B981 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}';
html += '.article-excerpt{font-size:1.05rem;color:var(--muted);line-height:1.8;padding:20px 24px;border-left:3px solid var(--accent);background:rgba(16,185,129,0.04);border-radius:0 var(--radius) var(--radius) 0;margin-bottom:32px}';
html += '.article-body h2{font-size:1.5rem;font-weight:800;margin:40px 0 16px;color:var(--text);padding-bottom:8px;border-bottom:2px solid var(--border)}';
html += '.article-body h3{font-size:1.15rem;font-weight:700;margin:28px 0 12px;color:var(--text)}';
html += '.article-body p{font-size:1rem;color:#1a1f3a;line-height:1.9;margin-bottom:20px}';
html += '.article-body ul,.article-body ol{margin:16px 0 20px 24px}';
html += '.article-body li{font-size:1rem;color:#1a1f3a;line-height:1.8;margin-bottom:8px}';
html += '.article-body strong{color:var(--text);font-weight:700}';
html += '.article-body a{color:var(--primary);text-decoration:underline;text-decoration-color:rgba(26,60,255,0.3)}';
html += '.article-body>strong{font-weight:400;font-size:1rem;display:block;margin-bottom:20px;color:#1a1f3a;line-height:1.9}';
html += '.article-body table{width:100%;border-collapse:collapse;margin:24px 0}';
html += '.article-body th{background:var(--primary);color:#fff;padding:12px 16px;text-align:left;font-size:0.88rem}';
html += '.article-body td{padding:12px 16px;border-bottom:1px solid var(--border);font-size:0.88rem;color:#1a1f3a}';
html += '.article-body tr:nth-child(even) td{background:var(--bg2)}';
html += '.article-sidebar{position:sticky;top:88px}';
html += '.sidebar-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px}';
html += '.sidebar-card h4{font-size:0.9rem;font-weight:700;margin-bottom:12px}';
html += '.sidebar-cta{background:var(--primary);color:#fff;border-radius:var(--radius);padding:24px;text-align:center;margin-bottom:20px}';
html += '.sidebar-cta h4{color:#fff;font-size:1rem;font-weight:700;margin-bottom:8px}';
html += '.sidebar-cta p{color:rgba(255,255,255,0.8);font-size:0.82rem;margin-bottom:16px;line-height:1.6}';
html += '.sidebar-cta a{display:block;background:#fff;color:var(--primary);border-radius:50px;padding:10px 20px;font-weight:700;font-size:0.85rem;margin-bottom:8px;transition:transform 0.2s}';
html += '.sidebar-cta a:hover{transform:translateY(-2px)}';
html += '.sidebar-cta a.accent{background:var(--accent);color:#fff}';
html += '.tags-list{display:flex;flex-wrap:wrap;gap:6px}';
html += '.tag-item{padding:4px 12px;border-radius:50px;font-size:0.72rem;font-weight:700;background:rgba(26,60,255,0.07);color:var(--primary);border:1px solid rgba(26,60,255,0.15)}';
html += '.article-footer-cta{background:linear-gradient(135deg,rgba(26,60,255,0.05),rgba(16,185,129,0.05));border:1px solid var(--border);border-radius:20px;padding:40px;text-align:center;margin:48px 0}';
html += '.article-footer-cta h3{font-size:1.4rem;font-weight:800;margin-bottom:12px}';
html += '.article-footer-cta p{color:var(--muted);font-size:0.95rem;margin-bottom:24px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.7}';
html += '.btn-cta{display:inline-flex;align-items:center;gap:8px;padding:13px 28px;border-radius:50px;font-weight:700;font-size:0.95rem;text-decoration:none;transition:transform 0.2s,box-shadow 0.2s}';
html += '.btn-primary{background:var(--primary);color:#fff;box-shadow:0 4px 20px rgba(26,60,255,0.3)}';
html += '.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(26,60,255,0.45)}';
html += '.btn-accent{background:var(--accent);color:#fff;box-shadow:0 4px 20px rgba(16,185,129,0.3);margin-left:12px}';
html += 'footer{padding:40px 0 24px;border-top:1px solid var(--border)}';
html += '@media(max-width:900px){.article-layout{grid-template-columns:1fr}.article-sidebar{position:static}}';
html += '@media(max-width:768px){nav{display:none}.hamburger{display:flex}.article-hero{height:300px}.article-hero-content{padding:24px}.article-title{font-size:1.6rem}}';
html += '</style>';
html += '</head>';
html += '<body>';
html += '<header>';
html += '<div class="container">';
html += '<div class="header-inner">';
html += '<a href="/" class="logo" style="line-height:1.2;">IA<span>-</span>Entrepreneur<span style="display:block;font-size:0.58rem;font-weight:500;color:var(--muted);letter-spacing:0.03em;margin-top:2px;">Organisme de formation certifié Qualiopi</span></a>';
html += '<nav>';
html += '<a href="/">Accueil</a>';
html += '<a href="/formations-entreprises.html">Formations IA</a>';
html += '<a href="/apropos.html">À propos</a>';
html += '<a href="/blog.html">Blog</a>';
html += '<a href="mailto:contact@ia-entrepreneur.fr" style="display:flex;align-items:center;gap:4px;"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>contact@ia-entrepreneur.fr</a>';
html += '<a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" rel="noopener noreferrer" class="nav-cta">Appel gratuit</a>';
html += '</nav>';
html += '<button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>';
html += '</div>';
html += '</div>';
html += '<div class="mobile-menu" id="mobile-menu">';
html += '<a href="/">Accueil</a><a href="/formations-entreprises.html">Formations IA</a><a href="/apropos.html">À propos</a><a href="/blog.html">Blog</a>';
html += '<a href="mailto:contact@ia-entrepreneur.fr">contact@ia-entrepreneur.fr</a>';
html += '<a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" rel="noopener noreferrer" style="background:var(--accent);color:#fff;text-align:center;border-radius:var(--radius);margin-top:8px;padding:14px;display:block;font-weight:700;">Réserver un appel gratuit</a>';
html += '</div>';
html += '</header>';
html += '<div class="article-hero">';
html += '<img src="' + heroImage + '" alt="' + titleEsc + '" loading="eager" />';
html += '<div class="article-hero-content">';
html += '<div class="breadcrumb"><a href="/">Accueil</a><span>›</span><a href="/blog.html">Blog</a><span>›</span><span>' + categoryLabel + '</span></div>';
html += '<div class="article-category">' + categoryLabel + '</div>';
html += '<div class="article-meta"><span>📅 ' + dateDisplay + '</span><span>⏱ ' + readTime + ' min de lecture</span></div>';
html += '</div>';
html += '</div>';
html += '<div class="container">';
html += '<div class="article-layout">';
html += '<article>';
html += '<h1 class="article-title">' + parsed.title + '</h1>';
html += excerptBlock;
html += '<div class="article-body">' + parsed.content + '</div>';
html += '<div class="article-footer-cta">';
html += '<h3>Prêt à intégrer l\'IA dans votre activité ?</h3>';
html += '<p>Nos formateurs praticiens vous accompagnent pour intégrer l\'IA dans votre activité et former vos équipes aux outils qui font vraiment la différence.</p>';
html += '<a href="/formations-entreprises.html" class="btn-cta btn-primary">Voir les formations IA</a>';
html += '<a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" class="btn-cta btn-accent">Appel gratuit</a>';
html += '</div>';
html += '</article>';
html += '<aside class="article-sidebar">';
html += '<div class="sidebar-cta">';
html += '<h4>Prêt à intégrer l\'IA dans votre activité ?</h4>';
html += '<p>Formations IA et intégrations clé en main. Certifié Qualiopi, finançable OPCO.</p>';
html += '<a href="/formations-entreprises.html">Voir les formations IA</a>';
html += '<a href="https://calendly.com/gabriel-ia-entrepreneur/decouverte" target="_blank" class="accent">Appel gratuit</a>';
html += '</div>';
html += '<div class="sidebar-card">';
html += '<h4>Formations entreprises</h4>';
html += '<p style="font-size:0.82rem;color:var(--muted);line-height:1.6;margin-bottom:12px;">IA, prospection, management, vente. Finançable OPCO. Certifié Qualiopi.</p>';
html += '<a href="/formations-entreprises.html" style="display:block;text-align:center;padding:9px 16px;border-radius:50px;font-size:0.82rem;font-weight:700;color:var(--primary);border:1.5px solid rgba(26,60,255,0.2);background:rgba(26,60,255,0.04);">En savoir plus</a>';
html += '</div>';
html += tagsHtml;
html += '</aside>';
html += '</div>';
html += '</div>';
html += '<footer>';
html += '<div class="container">';
html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;padding:20px 0;border-bottom:1px solid var(--border);margin-bottom:24px;">';
html += '<div style="display:flex;align-items:center;gap:12px;">';
html += '<img src="/qualiopi-logo.png" alt="Qualiopi" style="height:40px;width:auto;" onerror="this.style.display=\'none\'" />';
html += '<div><div style="font-size:0.82rem;font-weight:800;">Certifié Qualiopi — Certificat n° 883211-1</div><div style="font-size:0.72rem;color:var(--muted);">NDA : 44 54 04871 54</div></div>';
html += '</div>';
html += '<a href="/qualiopi-certificat.pdf" target="_blank" style="font-size:0.78rem;font-weight:700;color:var(--primary);border:1px solid rgba(26,60,255,0.2);padding:7px 14px;border-radius:50px;background:rgba(26,60,255,0.04);">Voir le certificat</a>';
html += '</div>';
html += '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:16px;">';
html += '<div style="font-size:1rem;font-weight:800;">IA<span style="color:var(--primary)">-</span>Entrepreneur</div>';
html += '<div style="display:flex;gap:16px;flex-wrap:wrap;">';
html += '<a href="/" style="font-size:0.8rem;color:var(--muted);">Accueil</a>';
html += '<a href="/formations-entreprises.html" style="font-size:0.8rem;color:var(--muted);">Formations IA</a>';
html += '<a href="/apropos.html" style="font-size:0.8rem;color:var(--muted);">À propos</a>';
html += '<a href="/blog.html" style="font-size:0.8rem;color:var(--muted);">Blog</a>';
html += '<a href="/mentions-legales.html" style="font-size:0.8rem;color:var(--muted);">Mentions légales</a>';
html += '<a href="/cgv.html" style="font-size:0.8rem;color:var(--muted);">CGV</a>';
html += '<a href="mailto:contact@ia-entrepreneur.fr" style="font-size:0.8rem;color:var(--muted);">Contact</a>';
html += '</div>';
html += '</div>';
html += '<p style="font-size:0.72rem;color:var(--muted);opacity:0.6;">© ' + today.getFullYear() + ' IA-Entrepreneur — Clindit. Tous droits réservés. | NDA : 44 54 04871 54</p>';
html += '</div>';
html += '</footer>';
html += '<script>';
html += 'var h=document.getElementById("hamburger"),m=document.getElementById("mobile-menu");';
html += 'if(h)h.addEventListener("click",function(){h.classList.toggle("open");m.classList.toggle("open");});';
html += 'm&&m.querySelectorAll("a").forEach(function(l){l.addEventListener("click",function(){h.classList.remove("open");m.classList.remove("open");});});';
html += '</script>';
html += '</body>';
html += '</html>';

const base64Html = Buffer.from(html).toString('base64');

return [{ json: {
  html,
  base64Html,
  slug: parsed.slug,
  title: parsed.title,
  source_url: sourceUrl,
  cover_image_url: imageUrl,
  tags: parsed.tags,
  excerpt: parsed.excerpt
} }];
