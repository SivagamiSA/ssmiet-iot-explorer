"""Responsive audit for IoT Explorer (permanent requirement, every stage).
Usage:  1) npm run dev   2) python3 scripts/responsive-check.py [url] [route ...]
Checks every viewport for: horizontal overflow, touch targets < 44px, inputs < 16px font (iOS zoom).
Add new routes (e.g. /login /register /admin) as extra args. Needs: pip install playwright && playwright install chromium
"""
import sys
from playwright.sync_api import sync_playwright

SIZES = {  # name: (width, height)
    "phone-small 320": (320, 568), "phone iPhone-SE 375": (375, 667), "phone 390": (390, 844),
    "phone-large 430": (430, 932), "tablet-portrait 768": (768, 1024), "tablet-landscape 1024": (1024, 768),
    "laptop 1280": (1280, 800), "desktop 1536": (1536, 864), "phone-landscape 844": (844, 390),
}
JS = """() => {
  const vw = document.documentElement.clientWidth, out = {overflow: [], small: [], input: []};
  if (document.documentElement.scrollWidth > vw) out.overflow.push('PAGE scrollWidth ' + document.documentElement.scrollWidth + ' > ' + vw);
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || cs.visibility === 'hidden' || cs.display === 'none') return;
    if (r.right > vw + 1 && !el.closest('.scroll-x') && cs.position !== 'fixed') out.overflow.push(el.tagName + '.' + String(el.className).slice(0, 50));
    const tap = el.matches('a[href], button, input, select, textarea, [role=button]');
    if (tap && (r.height < 43.5 || r.width < 43.5)) {
      const inline = el.tagName === 'A' && cs.display === 'inline' ; // inline text links inside paragraphs are exempt
      if (!inline) out.small.push(el.tagName + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    if (el.matches('input, select, textarea') && parseFloat(cs.fontSize) < 16) out.input.push(el.tagName + ' ' + cs.fontSize);
  });
  return out;
}"""
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
routes = sys.argv[2:] or ["/"]
bad = 0
with sync_playwright() as p:
    br = p.chromium.launch()
    for route in routes:
        for name, (w, h) in SIZES.items():
            pg = br.new_page(viewport={"width": w, "height": h}, has_touch=True, is_mobile=w < 800)
            pg.goto(base + route, wait_until="networkidle")
            res = pg.evaluate(JS)
            # also test the open mobile menu where a hamburger exists
            ham = pg.query_selector("button[aria-controls=mobile-menu]")
            if ham and ham.is_visible():
                ham.click(); pg.wait_for_timeout(150)
                m = pg.evaluate(JS)
                for k in res: res[k] += ["(menu open) " + x for x in m[k] if x not in res[k]]
            n = sum(len(v) for v in res.values()); bad += n
            print(("PASS " if n == 0 else "FAIL ") + f"{route:10} {name}")
            for k, v in res.items():
                for x in sorted(set(v))[:6]: print(f"      {k}: {x}")
            pg.close()
    br.close()
print("\nALL CLEAR" if bad == 0 else f"\n{bad} issue(s) found")
sys.exit(1 if bad else 0)
