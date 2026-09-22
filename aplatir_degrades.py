"""Aplatit les degrades de fond en couleur unie, sur tout le site.

Trois comportements, parce que « degrade » recouvre trois choses differentes :

  - Les voiles sombres poses sur une photo (rgba(10,15,44,...)) sont GARDES :
    ils existent pour que le titre blanc reste lisible sur l'image. Les
    retirer rendrait 122 titres d'articles illisibles.
  - Les halos decoratifs (.page-hero::before / ::after : un radial-gradient
    qui s'eteint en transparent sur toute la surface) sont SUPPRIMES avec
    leur regle. Les aplatir donnerait un aplat colore opaque, l'inverse de
    l'effet voulu.
  - Tous les autres sont remplaces par leur premiere couleur non
    transparente. « transparent » comme premiere etape est frequent sur les
    filets separateurs, ou c'est la couleur du milieu qui compte.

Usage : python3 aplatir2.py [--appliquer]
"""
import os, re, sys, collections

GRAD = re.compile(r'(?:linear|radial)-gradient\(', re.I)
DIRECTION = re.compile(r'^\s*(to\s|[-\d.]+deg|ellipse|circle|at\s|closest|farthest)', re.I)
REGLE = re.compile(r'([^{}]+)\{([^{}]*)\}')

def args_haut_niveau(s):
    out, prof, cour = [], 0, ''
    for ch in s:
        if ch == '(': prof += 1
        elif ch == ')': prof -= 1
        if ch == ',' and prof == 0: out.append(cour); cour = ''
        else: cour += ch
    out.append(cour)
    return [a.strip() for a in out]

def bloc(src, i):
    j = src.index('(', i); prof = 0
    for k in range(j, len(src)):
        if src[k] == '(': prof += 1
        elif src[k] == ')':
            prof -= 1
            if prof == 0: return src[i:k+1], k + 1
    return None, i

def couleur(grad):
    parts = args_haut_niveau(grad[grad.index('(')+1:-1])
    if parts and DIRECTION.match(parts[0]): parts = parts[1:]
    for p in parts:
        c = re.sub(r'\s+[-\d.]+%\s*$', '', p).strip()
        if c and c.lower() != 'transparent': return c
    return None

def voile(g):      return 'rgba(10,15,44' in g.replace(' ', '')
def halo(sel, g):  return ('::before' in sel or '::after' in sel) and \
                          g.lower().startswith('radial-gradient') and 'transparent' in g

def aplatir_texte(texte, sel=''):
    """Remplace les degrades d'une chaine CSS. Retourne (texte, nb)."""
    res, prec, n, pos = [], 0, 0, 0
    for m in GRAD.finditer(texte):
        if m.start() < pos: continue
        g, fin = bloc(texte, m.start())
        if not g: continue
        pos = fin
        if voile(g): continue
        c = couleur(g)
        if not c: continue
        res.append(texte[prec:m.start()]); res.append(c); prec = fin; n += 1
    res.append(texte[prec:])
    return ''.join(res), n

def traiter_css(css):
    sortie, prec, n_apl, n_sup = [], 0, 0, 0
    for m in REGLE.finditer(css):
        sel, corps = m.group(1), m.group(2)
        if 'gradient' not in corps: continue
        sortie.append(css[prec:m.start()])
        gs = []
        pos = 0
        for g in GRAD.finditer(corps):
            if g.start() < pos: continue
            t, f = bloc(corps, g.start()); pos = f
            if t: gs.append(t)
        if any(halo(sel, g) for g in gs):
            n_sup += 1                      # la regle entiere disparait
        else:
            nc, k = aplatir_texte(corps)
            n_apl += k
            sortie.append(m.group(1) + '{' + nc + '}')
        prec = m.end()
    sortie.append(css[prec:])
    return ''.join(sortie), n_apl, n_sup

if __name__ == '__main__':
    ecrire = '--appliquer' in sys.argv
    tot_a = tot_s = tot_i = nf = 0
    for r, d, fs in os.walk('.'):
        d[:] = [x for x in d if x not in ('.git', 'node_modules')]
        for f in fs:
            if not f.endswith(('.html', '.css')): continue
            c = os.path.join(r, f)
            src = open(c, encoding='utf-8').read()
            if 'gradient' not in src: continue
            out, a, s_ = (traiter_css(src) if f.endswith('.css')
                          else (src, 0, 0))
            if f.endswith('.html'):
                out, a, s_ = src, 0, 0
                def par_style(m):
                    global a, s_
                    nc, x, y = traiter_css(m.group(1))
                    a += x; s_ += y
                    return '<style>' + nc + '</style>'
                out = re.sub(r'<style>(.*?)</style>', par_style, out, flags=re.S)
                # attributs style="" : pas de selecteur, donc jamais de halo
                def par_attr(m):
                    global tot_i
                    nc, k = aplatir_texte(m.group(1))
                    tot_i += k
                    return 'style="' + nc + '"'
                out = re.sub(r'style="([^"]*gradient[^"]*)"', par_attr, out)
            if (a or s_ or out != src):
                nf += 1; tot_a += a; tot_s += s_
                if ecrire: open(c, 'w', encoding='utf-8').write(out)
    print(f'{tot_a} dégradés aplatis · {tot_i} en attribut style · {tot_s} halos décoratifs supprimés'
          f' · {nf} fichiers{" — ÉCRIT" if ecrire else " — simulation"}')
