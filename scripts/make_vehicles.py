# Otoparktaki araçların üstten görünüş çizimleri (sağa bakar). Her tür x renk x stil için bir PNG
# üretir ve src/game/vehicleImages.ts dosyasını yazar. Çalıştırma: python3 scripts/make_vehicles.py
# (skia-python gerekir: pip install skia-python)
import os, skia

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'vehicles')
CELL = 96  # bir hücre (px); telefonda ~33pt x3 ekran yoğunluğu

# src/game/palette.ts COLORS ile aynı sıra (oyunda kullanılan ilk 8 renk)
COLORS = ['#E53935', '#FF7A00', '#FFC400', '#1FAF4B', '#00B5D1', '#2962FF', '#8E2DE2', '#FF4FA8']
HIDDEN = '#3A5274'
KINDS = {'car': 2, 'bus': 3, 'truck': 4}
STYLES = ['klasik', 'parlak', 'retro', 'neon']
# Market kaplamaları: aracın kendi renginin açık/koyu tonlarıyla desen (renk asla değişmez)
WRAPS = ['yaris', 'taksi', 'kamuflaj', 'alev', 'karbon', 'ahsap', 'puantiye', 'altin']
ALL_STYLES = STYLES + WRAPS

def rgb(h): h = h.lstrip('#'); return [int(h[i:i+2], 16) for i in (0, 2, 4)]
def hexc(c): return '#%02x%02x%02x' % tuple(max(0, min(255, int(v))) for v in c)
def mix(h, t, to='#FFFFFF'): a, b = rgb(h), rgb(to); return hexc([x + (y - x) * t for x, y in zip(a, b)])
def col(h, a=255): r, g, b = rgb(h); return skia.Color(r, g, b, a)

def rrect(x0, y0, x1, y1, rx, ry=None):
    return skia.RRect.MakeRectXY(skia.Rect(x0, y0, x1, y1), rx, ry if ry is not None else rx)

def paint(color=None, alpha=255, shader=None, blur=0, stroke=0):
    p = skia.Paint(AntiAlias=True)
    if shader: p.setShader(shader)
    elif color: p.setColor(col(color, alpha))
    if blur: p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    if stroke: p.setStyle(skia.Paint.kStroke_Style); p.setStrokeWidth(stroke)
    return p

def body_path(x0, y0, x1, y1, rear, front):
    """Arka köşeler `rear`, ön köşeler `front` yarıçaplı gövde (sağ taraf ön)."""
    rr = skia.RRect()
    rr.setRectRadii(skia.Rect(x0, y0, x1, y1), [skia.Point(rear, rear), skia.Point(front, front), skia.Point(front, front), skia.Point(rear, rear)])
    return skia.Path().addRRect(rr)

def glass_shader(y0, y1):
    return skia.GradientShader.MakeLinear([(0, y0), (0, y1)], [col('#9FD3F5'), col('#2C4A6E'), col('#1B2D45')], [0, 0.45, 1])

def body_shader(c, y0, y1, style):
    if style == 'neon':
        return skia.GradientShader.MakeLinear([(0, y0), (0, y1)], [col('#2A2F45'), col('#161A28'), col('#0D1018')], [0, 0.5, 1])
    return skia.GradientShader.MakeLinear([(0, y0), (0, y1)], [col(mix(c, .35)), col(c), col(mix(c, .32, '#000000'))], [0, 0.45, 1])

def lights(cv, x0, y0, x1, y1, h, neon_color=None):
    # ön farlar: beyaz, belirgin (ön yön her renkte anlaşılsın)
    for yy in (y0 + h * 0.1, y1 - h * 0.1 - h * 0.2):
        cv.drawRRect(rrect(x1 - h * 0.12, yy, x1 - 1, yy + h * 0.2, 4), paint('#FFFFFF'))
        cv.drawRRect(rrect(x1 - h * 0.1, yy + h * 0.04, x1 + h * 0.06, yy + h * 0.16, 4), paint('#FFF4B0', 150, blur=3))
    # stop lambaları
    for yy in (y0 + h * 0.12, y1 - h * 0.12 - h * 0.16):
        cv.drawRRect(rrect(x0 + 1, yy, x0 + h * 0.08, yy + h * 0.16, 3), paint('#FF2E2E'))

def wheels(cv, xs, y0, y1, h):
    for x in xs:
        cv.drawRRect(rrect(x - h * 0.13, y0 - h * 0.04, x + h * 0.13, y0 + h * 0.1, 4), paint('#14161E'))
        cv.drawRRect(rrect(x - h * 0.13, y1 - h * 0.1, x + h * 0.13, y1 + h * 0.04, 4), paint('#14161E'))

# Üstü açık kabin: src/game/cabin.ts CABIN ile AYNI oranlar (görselin tamamına göre).
CABIN = {'car': (0.22, 0.58, 0.19, 0.81), 'bus': (0.08, 0.83, 0.2, 0.8), 'truck': (0.06, 0.66, 0.19, 0.81)}
CAPS = {'car': 4, 'bus': 6, 'truck': 8}

def cabin(cv, kind, W, H, base):
    """Saydam tavan: koyu cam pencere + kapasite kadar boş koltuk. Kenarlar aracın renginde kalır."""
    a0, a1, b0, b1 = CABIN[kind]
    x0, x1, y0, y1 = a0 * W, a1 * W, b0 * H, b1 * H
    cw, ch = x1 - x0, y1 - y0
    r = min(cw, ch) * 0.22
    cv.drawRRect(rrect(x0, y0, x1, y1, r), paint(mix(base, .72, '#0C101C'), 245))
    cv.drawRRect(rrect(x0, y0, x1, y1, r), paint(mix(base, .55), 200, stroke=1.6))
    pad = max(2, ch * 0.08)
    cols = CAPS[kind] // 2
    cellW, cellH = (cw - pad * 2) / cols, (ch - pad * 2) / 2
    seat = max(4, min(cellW * 0.8, cellH * 0.92))
    for c in range(cols):
        for rr in range(2):
            cx = x0 + pad + cellW * (c + 0.5)
            cy = y0 + pad + cellH * (rr + 0.5)
            cv.drawRRect(rrect(cx - seat / 2, cy - seat / 2, cx + seat / 2, cy + seat / 2, seat * 0.26), paint(mix(base, .08, '#000000'), 255))
            # sırtlık (arkada, sola doğru): yön belli olsun
            cv.drawRRect(rrect(cx - seat / 2, cy - seat / 2, cx - seat * 0.22, cy + seat / 2, seat * 0.2), paint(mix(base, .45, '#000000'), 255))

def wrap(cv, st, path, base, x0, y0, x1, y1, h):
    """Kaplama deseni, gövde yoluna kırpılmış; yalnız tabanın açık/koyu tonları."""
    if st not in WRAPS:
        return
    light, dark = mix(base, .62), mix(base, .45, '#000000')
    cv.save(); cv.clipPath(path, skia.ClipOp.kIntersect, True)
    L = x1 - x0; cy = (y0 + y1) / 2
    if st == 'yaris':
        for off in (-h * 0.13, h * 0.05):
            cv.drawRect(skia.Rect(x0, cy + off, x1, cy + off + h * 0.08), paint(light))
    elif st == 'taksi':
        sq = h * 0.11; n = int(L / sq) + 1
        for row in (0, 1):
            for k in range(n):
                cv.drawRect(skia.Rect(x0 + k * sq, cy - sq + row * sq, x0 + (k + 1) * sq, cy + row * sq), paint(dark if (k + row) % 2 else light))
    elif st == 'kamuflaj':
        import random
        r = random.Random(7 + int(L))
        for k in range(int(L / h * 7)):
            px, py = x0 + r.random() * L, y0 + r.random() * h
            rad = h * (0.08 + r.random() * 0.1)
            cv.drawOval(skia.Rect(px - rad * 1.5, py - rad, px + rad * 1.5, py + rad), paint(dark if k % 2 else light, 230))
    elif st == 'alev':
        for side in (0, 1):
            ys = y0 if side == 0 else y1
            sgn = 1 if side == 0 else -1
            p = skia.Path(); p.moveTo(x1, ys)
            tongues = max(3, int(L / h * 2))
            for k in range(tongues + 1):
                xx = x1 - (L * 0.75) * k / tongues
                depth = h * (0.38 - 0.25 * k / tongues)
                p.lineTo(xx + h * 0.08, ys + sgn * depth); p.lineTo(xx - h * 0.04, ys + sgn * depth * 0.35)
            p.lineTo(x1 - L * 0.8, ys); p.close()
            cv.drawPath(p, paint(light))
    elif st == 'karbon':
        step = h * 0.09
        k = -h
        while k < L + h:
            cv.drawLine(x0 + k, y0, x0 + k + h, y1, paint(dark, 150, stroke=h * 0.03))
            cv.drawLine(x0 + k + h, y0, x0 + k, y1, paint(dark, 90, stroke=h * 0.02))
            k += step
    elif st == 'ahsap':
        for yy0 in (y0, y1 - h * 0.24):
            cv.drawRect(skia.Rect(x0, yy0, x1, yy0 + h * 0.24), paint(dark))
            for g in range(3):
                gy = yy0 + h * (0.05 + g * 0.07)
                cv.drawLine(x0, gy, x1, gy + h * 0.02, paint(mix(base, .65, '#000000'), 160, stroke=1.5))
    elif st == 'puantiye':
        rad = h * 0.07; gap = h * 0.26
        row = 0; yy = y0 + gap / 2
        while yy < y1:
            xx = x0 + (gap / 2 if row % 2 else 0) + gap / 3
            while xx < x1:
                cv.drawCircle(xx, yy, rad, paint(light)); xx += gap
            yy += gap * 0.75; row += 1
    elif st == 'altin':
        for off in (h * 0.09, h * 0.91):
            cv.drawLine(x0, y0 + off * 0 + (y1 - y0) * (0.09 if off < h / 2 else 0.91), x1, y0 + (y1 - y0) * (0.09 if off < h / 2 else 0.91), paint('#F2C94C', stroke=h * 0.05))
    cv.restore()

def draw(kind, c, style, hidden=False):
    n = KINDS[kind]
    W, H = CELL * n, CELL
    surf = skia.Surface(W, H); cv = surf.getCanvas(); cv.clear(skia.ColorTRANSPARENT)
    m = H * 0.1                         # kenar payı (hücrede komşuyla arası açık)
    x0, y0, x1, y1 = m, m, W - m, H - m
    h = y1 - y0
    base = HIDDEN if hidden else c
    st = 'klasik' if hidden else style
    # gölge
    cv.drawRRect(rrect(x0 + 3, y0 + 6, x1 + 3, y1 + 6, h * 0.3), paint('#000000', 110, blur=6))
    if kind == 'car':
        wheels(cv, [x0 + (x1 - x0) * 0.22, x0 + (x1 - x0) * 0.76], y0, y1, h)
        path = body_path(x0, y0, x1, y1, h * 0.22, h * 0.42)
        cv.drawPath(path, paint(shader=body_shader(base, y0, y1, st)))
        wrap(cv, st, path, base, x0, y0, x1, y1, h)
        L = x1 - x0
        # kaput çizgileri (önde)
        cv.drawLine(x0 + L * 0.8, y0 + h * 0.35, x1 - h * 0.18, y0 + h * 0.38, paint(mix(base, .35, '#000000'), 120, stroke=2))
        cv.drawLine(x0 + L * 0.8, y1 - h * 0.35, x1 - h * 0.18, y1 - h * 0.38, paint(mix(base, .35, '#000000'), 120, stroke=2))
        # arka cam, tavan, ön cam (ön cam büyük ve öne yakın)
        cv.drawRRect(rrect(x0 + L * 0.13, y0 + h * 0.2, x0 + L * 0.25, y1 - h * 0.2, h * 0.1), paint(shader=glass_shader(y0, y1)))
        roof = '#F4F1DE' if st == 'retro' else mix(base, .22)
        cv.drawRRect(rrect(x0 + L * 0.25, y0 + h * 0.16, x0 + L * 0.55, y1 - h * 0.16, h * 0.14), paint(roof))
        wrap(cv, st, skia.Path().addRRect(rrect(x0 + L * 0.25, y0 + h * 0.16, x0 + L * 0.55, y1 - h * 0.16, h * 0.14)), base, x0, y0, x1, y1, h)
        if not hidden: cabin(cv, 'car', W, H, base)
        win = skia.Path(); win.moveTo(x0 + L * 0.57, y0 + h * 0.18); win.lineTo(x0 + L * 0.7, y0 + h * 0.1)
        win.lineTo(x0 + L * 0.7, y1 - h * 0.1); win.lineTo(x0 + L * 0.57, y1 - h * 0.18); win.close()
        p = paint(shader=glass_shader(y0, y1)); p.setPathEffect(skia.CornerPathEffect.Make(h * 0.08)); cv.drawPath(win, p)
        # aynalar
        for yy in (y0 - h * 0.06, y1 - h * 0.04):
            cv.drawRRect(rrect(x0 + L * 0.6, yy, x0 + L * 0.66, yy + h * 0.1, 3), paint(mix(base, .3, '#000000')))
        if st == 'retro':
            for yy in (y0 + h * 0.4, y0 + h * 0.52):
                cv.drawRect(skia.Rect(x0 + L * 0.72, yy, x1 - h * 0.1, yy + h * 0.07), paint('#F4F1DE'))
                cv.drawRect(skia.Rect(x0 + h * 0.05, yy, x0 + L * 0.12, yy + h * 0.07), paint('#F4F1DE'))
    elif kind == 'bus':
        wheels(cv, [x0 + (x1 - x0) * 0.16, x0 + (x1 - x0) * 0.82], y0, y1, h)
        path = body_path(x0, y0, x1, y1, h * 0.16, h * 0.3)
        cv.drawPath(path, paint(shader=body_shader(base, y0, y1, st)))
        wrap(cv, st, path, base, x0, y0, x1, y1, h)
        L = x1 - x0
        roof = '#F4F1DE' if st == 'retro' else mix(base, .28)
        cv.drawRRect(rrect(x0 + L * 0.04, y0 + h * 0.14, x0 + L * 0.85, y1 - h * 0.14, h * 0.12), paint(roof))
        wrap(cv, st, skia.Path().addRRect(rrect(x0 + L * 0.04, y0 + h * 0.14, x0 + L * 0.85, y1 - h * 0.14, h * 0.12)), base, x0, y0, x1, y1, h)
        # yan camlar (iki kenarda şerit)
        for yy in (y0 + h * 0.04, y1 - h * 0.14):
            cv.drawRRect(rrect(x0 + L * 0.06, yy, x0 + L * 0.84, yy + h * 0.1, 3), paint(shader=glass_shader(y0, y1)))
        if hidden:
            for k in range(3):  # tavan menfezleri (gizli araç kapalı kalır)
                xx = x0 + L * (0.18 + k * 0.22)
                cv.drawRRect(rrect(xx, y0 + h * 0.36, xx + L * 0.1, y1 - h * 0.36, 4), paint(mix(base, .25, '#000000'), 140))
        else:
            cabin(cv, 'bus', W, H, base)
        # geniş ön cam
        cv.drawRRect(rrect(x0 + L * 0.87, y0 + h * 0.1, x0 + L * 0.95, y1 - h * 0.1, h * 0.08), paint(shader=glass_shader(y0, y1)))
    else:  # tır: arkada dorse, önde kabin
        wheels(cv, [x0 + (x1 - x0) * 0.1, x0 + (x1 - x0) * 0.2, x0 + (x1 - x0) * 0.6, x0 + (x1 - x0) * 0.88], y0, y1, h)
        L = x1 - x0
        cab_x = x0 + L * 0.74
        trailer = body_path(x0, y0 + h * 0.02, cab_x - h * 0.06, y1 - h * 0.02, h * 0.1, h * 0.1)
        cv.drawPath(trailer, paint(shader=body_shader(base, y0, y1, st)))
        wrap(cv, st, trailer, base, x0, y0, cab_x - h * 0.06, y1, h)
        for k in range(6):  # dorse kaburgaları
            xx = x0 + L * 0.05 + k * (cab_x - x0 - L * 0.08) / 6
            cv.drawLine(xx, y0 + h * 0.12, xx, y1 - h * 0.12, paint(mix(base, .3, '#000000'), 110, stroke=2))
        if st == 'retro':
            cv.drawRect(skia.Rect(x0 + L * 0.03, y0 + h * 0.44, cab_x - h * 0.1, y0 + h * 0.56), paint('#F4F1DE'))
        if not hidden: cabin(cv, 'truck', W, H, base)
        cv.drawRect(skia.Rect(cab_x - h * 0.08, y0 + h * 0.35, cab_x + 2, y1 - h * 0.35), paint('#2A2F3B'))  # bağlantı
        cab = body_path(cab_x, y0, x1, y1, h * 0.12, h * 0.34)
        cv.drawPath(cab, paint(shader=body_shader(mix(base, .12, '#000000') if st != 'neon' else base, y0, y1, st)))
        cv.drawRRect(rrect(cab_x + (x1 - cab_x) * 0.52, y0 + h * 0.1, cab_x + (x1 - cab_x) * 0.74, y1 - h * 0.1, h * 0.08), paint(shader=glass_shader(y0, y1)))
        cv.drawRRect(rrect(cab_x + (x1 - cab_x) * 0.1, y0 + h * 0.2, cab_x + (x1 - cab_x) * 0.48, y1 - h * 0.2, h * 0.08), paint(mix(base, .25)))
    if not hidden:
        lights(cv, x0, y0, x1, y1, h)
    if st == 'parlak':
        cv.drawRRect(rrect(x0 + h * 0.2, y0 + h * 0.06, x0 + (x1 - x0) * 0.5, y0 + h * 0.16, h * 0.05), paint('#FFFFFF', 140))
        cv.drawRRect(rrect(x0 + h * 0.25, y0 + h * 0.08, x0 + (x1 - x0) * 0.3, y0 + h * 0.12, h * 0.02), paint('#FFFFFF', 220))
    # dış çizgi: açık renklerde de kenar belirgin olsun
    outline = c if st == 'neon' else '#E0A800' if st == 'altin' else mix(base, .45, '#000000')
    ow = 4 if st == 'neon' else 2.5
    if kind == 'truck':
        cv.drawPath(body_path(x0, y0 + h * 0.02, x0 + (x1 - x0) * 0.74 - h * 0.06, y1 - h * 0.02, h * 0.1, h * 0.1), paint(outline, stroke=ow))
        cv.drawPath(body_path(x0 + (x1 - x0) * 0.74, y0, x1, y1, h * 0.12, h * 0.34), paint(outline, stroke=ow))
    else:
        r0, r1 = (h * 0.22, h * 0.42) if kind == 'car' else (h * 0.16, h * 0.3)
        cv.drawPath(body_path(x0, y0, x1, y1, r0, r1), paint(outline, stroke=ow))
    if st == 'neon':
        g = paint(c, 160, blur=6, stroke=5)
        cv.drawRRect(rrect(x0, y0, x1, y1, h * 0.3), g)
    return surf.makeImageSnapshot()

def main():
    os.makedirs(OUT, exist_ok=True)
    lines = ['// Bu dosya scripts/make_vehicles.py tarafından üretilir, elle düzenleme.',
             "import { ImageSourcePropType } from 'react-native';", '',
             'type Kind = \'car\' | \'bus\' | \'truck\';', '',
             '/** [tür][stil][renk] → görsel; gizli araçlar için hidden[tür] */',
             'export const VEHICLE_IMAGES: Record<Kind, Record<string, ImageSourcePropType[]>> = {']
    for kind in KINDS:
        lines.append(f'  {kind}: {{')
        for style in ALL_STYLES:
            reqs = []
            for i, c in enumerate(COLORS):
                name = f'{kind}-{style}-{i}.png'
                draw(kind, c, style).save(os.path.join(OUT, name), skia.kPNG)
                reqs.append(f"require('../../assets/vehicles/{name}')")
            lines.append(f'    {style}: [' + ', '.join(reqs) + '],')
        lines.append('  },')
    lines.append('};')
    lines.append('')
    lines.append('export const HIDDEN_IMAGES: Record<Kind, ImageSourcePropType> = {')
    for kind in KINDS:
        name = f'{kind}-hidden.png'
        draw(kind, HIDDEN, 'klasik', hidden=True).save(os.path.join(OUT, name), skia.kPNG)
        lines.append(f"  {kind}: require('../../assets/vehicles/{name}'),")
    lines.append('};')
    open(os.path.join(ROOT, 'src', 'game', 'vehicleImages.ts'), 'w').write('\n'.join(lines) + '\n')

if __name__ == '__main__':
    main()
