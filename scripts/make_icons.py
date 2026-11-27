# Parxi ikonları ve harita süsleri: özgün, telifsiz, parlak çizgi-film tarzı.
#   assets/icons/<ad>.png   (sekme, görev, ödül ikonları; 160x160)
#   assets/map/<ad>.png     (harita arka plan süsleri; 240x240)
# Çalıştır: python3 scripts/make_icons.py
import os, math, skia

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_I = os.path.join(ROOT, 'assets', 'icons')
OUT_M = os.path.join(ROOT, 'assets', 'map')
INK = '#1A1D26'


def hx(h, a=255):
    h = h.lstrip('#')
    return skia.Color(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def mix(h, t, to='#FFFFFF'):
    h = h.lstrip('#'); to = to.lstrip('#')
    c = [int(h[i:i + 2], 16) for i in (0, 2, 4)]; d = [int(to[i:i + 2], 16) for i in (0, 2, 4)]
    return '#%02x%02x%02x' % tuple(int(a + (b - a) * t) for a, b in zip(c, d))


def P(**kw):
    p = skia.Paint(AntiAlias=True)
    for k, v in kw.items():
        getattr(p, 'set' + k)(v)
    return p


def grad(y0, y1, c):
    """Üstten açık, alta koyu parlak dolgu"""
    return skia.GradientShader.MakeLinear([(0, y0), (0, y1)], [hx(mix(c, .45)), hx(c), hx(mix(c, .3, '#000000'))], [0, .45, 1])


def shape(cv, path, color, y0, y1, ink=True, w=5):
    cv.drawPath(path, P(Shader=grad(y0, y1, color)))
    if ink:
        cv.drawPath(path, P(Style=skia.Paint.kStroke_Style, StrokeWidth=w, Color=hx(INK), StrokeJoin=skia.Paint.kRound_Join))


def rr(x0, y0, x1, y1, r):
    return skia.Path().addRRect(skia.RRect.MakeRectXY(skia.Rect(x0, y0, x1, y1), r, r))


def circ(x, y, r):
    return skia.Path().addCircle(x, y, r)


def poly(pts):
    p = skia.Path(); p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    p.close(); return p


def shine(cv, x0, y0, x1, y1, r=10):
    cv.drawRRect(skia.RRect.MakeRectXY(skia.Rect(x0, y0, x1, y1), r, r), P(Color=hx('#FFFFFF', 110)))


def shadow(cv, cx, cy, rx, ry):
    cv.drawOval(skia.Rect(cx - rx, cy - ry, cx + rx, cy + ry), P(Color=hx('#000000', 60)))


def star_path(cx, cy, R, r, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        a = math.radians(rot + i * 180 / n)
        rad = R if i % 2 == 0 else r
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return poly(pts)


# ---------- İkonlar (200x200 tuval, 160'a küçültülür) ----------

def i_clipboard(cv):
    shadow(cv, 100, 186, 62, 8)
    shape(cv, rr(38, 30, 162, 182, 18), '#7FB8E6', 30, 182)
    cv.drawRRect(skia.RRect.MakeRectXY(skia.Rect(50, 46, 150, 172), 8, 8), P(Color=hx('#F7FBFF')))
    shape(cv, rr(72, 18, 128, 44, 10), '#9AA3B2', 18, 44)
    cv.drawCircle(100, 22, 6, P(Color=hx(INK)))
    for k in range(4):
        y = 70 + k * 24
        on = k in (0, 2)
        cv.drawRRect(skia.RRect.MakeRectXY(skia.Rect(60, y - 8, 76, y + 8), 3, 3), P(Style=skia.Paint.kStroke_Style, StrokeWidth=3.5, Color=hx('#E8873A')))
        if on:
            p = skia.Path(); p.moveTo(62, y); p.lineTo(68, y + 6); p.lineTo(80, y - 10)
            cv.drawPath(p, P(Style=skia.Paint.kStroke_Style, StrokeWidth=5, Color=hx('#3BAA5C'), StrokeCap=skia.Paint.kRound_Cap))
        cv.drawRRect(skia.RRect.MakeRectXY(skia.Rect(86, y - 4, 140, y + 4), 4, 4), P(Color=hx('#5B7FB0')))


def i_person(cv, color='#3A86FF'):
    shadow(cv, 100, 186, 50, 8)
    shape(cv, rr(52, 96, 148, 182, 34), color, 96, 182)
    shape(cv, circ(100, 62, 36), '#FFD7B0', 26, 98)
    shine(cv, 70, 108, 90, 150, 10)


def i_people(cv):
    shadow(cv, 100, 188, 80, 8)
    for (x, c, s) in ((58, '#FF4FA8', .8), (142, '#3BAA5C', .8)):
        shape(cv, rr(x - 34 * s, 100, x + 34 * s, 178, 26), c, 100, 178)
        shape(cv, circ(x, 76, 26 * s), '#FFD7B0', 50, 100)
    shape(cv, rr(62, 96, 138, 186, 32), '#3A86FF', 96, 186)
    shape(cv, circ(100, 62, 32), '#FFD7B0', 30, 94)


def i_parking(cv):
    shadow(cv, 100, 188, 60, 8)
    shape(cv, rr(30, 24, 170, 164, 26), '#2962FF', 24, 164)
    cv.drawRRect(skia.RRect.MakeRectXY(skia.Rect(42, 36, 158, 152), 18, 18), P(Style=skia.Paint.kStroke_Style, StrokeWidth=5, Color=hx('#FFFFFF')))
    f = skia.Font(skia.Typeface('Arial', skia.FontStyle.Bold()), 104)
    cv.drawString('P', 66, 134, f, P(Color=hx('#FFFFFF')))
    shape(cv, rr(92, 160, 108, 190, 3), '#9AA3B2', 160, 190, w=4)


def i_car(cv, color='#E53935'):
    shadow(cv, 100, 168, 82, 9)
    body = poly([(20, 150), (24, 112), (56, 104), (78, 72), (130, 70), (156, 102), (182, 110), (184, 150)])
    shape(cv, body, color, 70, 150)
    cv.drawPath(poly([(84, 80), (126, 79), (146, 102), (72, 104)]), P(Color=hx('#BFE6FF')))
    cv.drawRect(skia.Rect(106, 80, 112, 104), P(Color=hx(color)))
    for x in (60, 146):
        shape(cv, circ(x, 152, 20), '#2B2F3A', 132, 172)
        cv.drawCircle(x, 152, 8, P(Color=hx('#C9D1DC')))
    shine(cv, 34, 114, 70, 122, 4)


def i_bus(cv):
    shadow(cv, 100, 172, 86, 9)
    shape(cv, rr(14, 52, 186, 152, 18), '#FFC400', 52, 152)
    for k in range(5):
        cv.drawRRect(skia.RRect.MakeRectXY(skia.Rect(24 + k * 31, 66, 48 + k * 31, 98), 5, 5), P(Color=hx('#BFE6FF')))
    cv.drawRect(skia.Rect(14, 110, 186, 118), P(Color=hx('#E8873A')))
    for x in (50, 150):
        shape(cv, circ(x, 156, 18), '#2B2F3A', 138, 174)
        cv.drawCircle(x, 156, 7, P(Color=hx('#C9D1DC')))


def i_truck(cv):
    shadow(cv, 100, 172, 88, 9)
    shape(cv, rr(10, 46, 128, 146, 10), '#8E2DE2', 46, 146)
    shape(cv, poly([(132, 74), (166, 74), (190, 108), (190, 146), (132, 146)]), '#FF7A00', 74, 146)
    cv.drawPath(poly([(140, 82), (162, 82), (180, 106), (140, 106)]), P(Color=hx('#BFE6FF')))
    for x in (40, 96, 162):
        shape(cv, circ(x, 152, 17), '#2B2F3A', 135, 169)
        cv.drawCircle(x, 152, 6, P(Color=hx('#C9D1DC')))
    shine(cv, 20, 56, 118, 66, 5)


def i_star(cv):
    shadow(cv, 100, 186, 56, 8)
    shape(cv, star_path(100, 100, 84, 38), '#FFC400', 16, 184, w=6)
    cv.drawPath(star_path(92, 84, 30, 13), P(Color=hx('#FFFFFF', 120)))


def i_bolt(cv):
    shadow(cv, 100, 188, 46, 7)
    shape(cv, poly([(112, 10), (40, 112), (92, 112), (76, 190), (160, 78), (106, 78), (130, 10)]), '#FF4D4D', 10, 190, w=6)


def i_shield(cv):
    shadow(cv, 100, 188, 56, 8)
    p = skia.Path(); p.moveTo(100, 14); p.cubicTo(140, 34, 170, 34, 174, 34); p.cubicTo(174, 120, 140, 166, 100, 186)
    p.cubicTo(60, 166, 26, 120, 26, 34); p.cubicTo(30, 34, 60, 34, 100, 14); p.close()
    shape(cv, p, '#3BAA5C', 14, 186, w=6)
    q = skia.Path(); q.moveTo(64, 100); q.lineTo(92, 128); q.lineTo(140, 74)
    cv.drawPath(q, P(Style=skia.Paint.kStroke_Style, StrokeWidth=16, Color=hx('#FFFFFF'), StrokeCap=skia.Paint.kRound_Cap, StrokeJoin=skia.Paint.kRound_Join))


def i_calendar(cv):
    shadow(cv, 100, 188, 66, 8)
    shape(cv, rr(30, 36, 170, 176, 20), '#FFFFFF', 36, 176)
    shape(cv, rr(30, 36, 170, 80, 20), '#E53935', 36, 80)
    cv.drawRect(skia.Rect(33, 64, 167, 80), P(Color=hx('#E53935')))
    for x in (68, 132):
        shape(cv, rr(x - 7, 22, x + 7, 52, 6), '#9AA3B2', 22, 52, w=4)
    f = skia.Font(skia.Typeface('Arial', skia.FontStyle.Bold()), 70)
    cv.drawString('7', 80, 156, f, P(Color=hx(INK)))


def i_flag(cv):
    shadow(cv, 100, 190, 60, 7)
    shape(cv, rr(40, 18, 54, 188, 6), '#9AA3B2', 18, 188, w=4)
    p = poly([(54, 24), (168, 24), (148, 62), (168, 100), (54, 100)])
    cv.save(); cv.clipPath(p, doAntiAlias=True)
    for i in range(6):
        for j in range(4):
            cv.drawRect(skia.Rect(54 + i * 20, 24 + j * 19, 74 + i * 20, 43 + j * 19), P(Color=hx(INK if (i + j) % 2 else '#FFFFFF')))
    cv.restore()
    cv.drawPath(p, P(Style=skia.Paint.kStroke_Style, StrokeWidth=5, Color=hx(INK), StrokeJoin=skia.Paint.kRound_Join))


def i_chest(cv):
    shadow(cv, 100, 186, 76, 9)
    shape(cv, rr(28, 92, 172, 176, 12), '#B8743C', 92, 176)
    p = skia.Path(); p.moveTo(28, 100); p.cubicTo(28, 40, 172, 40, 172, 100); p.close()
    shape(cv, p, '#C98545', 50, 100)
    for x in (52, 148):
        shape(cv, rr(x - 9, 56, x + 9, 176, 4), '#F2C94C', 56, 176, w=4)
    shape(cv, rr(84, 92, 116, 128, 6), '#F2C94C', 92, 128, w=4)
    cv.drawCircle(100, 108, 5, P(Color=hx(INK)))


def i_coin(cv):
    shadow(cv, 100, 186, 56, 8)
    shape(cv, circ(100, 96, 80), '#FFC400', 16, 176, w=6)
    cv.drawCircle(100, 96, 58, P(Style=skia.Paint.kStroke_Style, StrokeWidth=6, Color=hx('#E0A100')))
    cv.drawPath(star_path(100, 96, 34, 15), P(Color=hx('#FFF3B0')))


def i_home(cv):
    shadow(cv, 100, 186, 70, 8)
    shape(cv, rr(44, 84, 156, 176, 10), '#FFE8C2', 84, 176)
    shape(cv, poly([(24, 96), (100, 26), (176, 96), (160, 106), (100, 52), (40, 106)]), '#E53935', 26, 106)
    shape(cv, rr(84, 120, 116, 176, 8), '#3A86FF', 120, 176)
    shape(cv, rr(124, 104, 148, 128, 4), '#BFE6FF', 104, 128, w=4)


def i_map(cv):
    shadow(cv, 100, 188, 76, 8)
    p = poly([(20, 44), (72, 26), (128, 44), (180, 26), (180, 160), (128, 178), (72, 160), (20, 178)])
    shape(cv, p, '#9FE2A2', 26, 178)
    for xs in ((72, 26, 72, 160), (128, 44, 128, 178)):
        cv.drawLine(*xs, P(Color=hx('#5FA86A'), StrokeWidth=4))
    q = skia.Path(); q.moveTo(40, 150); q.cubicTo(70, 120, 100, 150, 120, 110); q.cubicTo(136, 80, 150, 90, 160, 64)
    cv.drawPath(q, P(Style=skia.Paint.kStroke_Style, StrokeWidth=6, Color=hx('#E53935'), PathEffect=skia.DashPathEffect.Make([12, 9], 0), StrokeCap=skia.Paint.kRound_Cap))
    shape(cv, circ(160, 56, 14), '#E53935', 42, 70, w=4)


def i_cart(cv):
    shadow(cv, 100, 188, 70, 8)
    p = poly([(30, 46), (176, 62), (160, 124), (54, 124)])
    shape(cv, p, '#FF7A00', 46, 124)
    cv.drawLine(14, 32, 34, 40, P(Color=hx(INK), StrokeWidth=8, StrokeCap=skia.Paint.kRound_Cap))
    cv.drawLine(54, 124, 60, 150, P(Color=hx(INK), StrokeWidth=7))
    cv.drawLine(60, 150, 160, 150, P(Color=hx(INK), StrokeWidth=7, StrokeCap=skia.Paint.kRound_Cap))
    for x in (72, 148):
        shape(cv, circ(x, 168, 13), '#2B2F3A', 155, 181, w=4)
    for k in range(3):
        cv.drawLine(80 + k * 30, 64, 76 + k * 28, 120, P(Color=hx('#FFFFFF', 140), StrokeWidth=5))


def i_gear(cv):
    shadow(cv, 100, 188, 60, 8)
    pts = []
    for i in range(16):
        a = math.radians(i * 22.5)
        r = 82 if i % 2 == 0 else 64
        pts.append((100 + r * math.cos(a), 96 + r * math.sin(a)))
    shape(cv, poly(pts), '#9AA3B2', 14, 178, w=6)
    shape(cv, circ(100, 96, 28), '#1F2A3D', 68, 124, w=5)


def i_garage(cv):
    i_car(cv, '#E53935')


def i_heart(cv):
    shadow(cv, 100, 186, 56, 8)
    p = skia.Path(); p.moveTo(100, 176); p.cubicTo(20, 120, 10, 70, 46, 42); p.cubicTo(72, 24, 96, 40, 100, 62)
    p.cubicTo(104, 40, 128, 24, 154, 42); p.cubicTo(190, 70, 180, 120, 100, 176); p.close()
    shape(cv, p, '#FF4D6D', 30, 176, w=6)
    shine(cv, 50, 56, 74, 70, 7)


def i_lock(cv):
    shadow(cv, 100, 188, 56, 8)
    cv.drawPath(rr(58, 28, 142, 112, 40), P(Style=skia.Paint.kStroke_Style, StrokeWidth=18, Color=hx(INK)))
    cv.drawPath(rr(58, 28, 142, 112, 40), P(Style=skia.Paint.kStroke_Style, StrokeWidth=10, Color=hx('#C9D1DC')))
    shape(cv, rr(36, 82, 164, 182, 20), '#FFC400', 82, 182, w=6)
    cv.drawCircle(100, 124, 13, P(Color=hx(INK)))
    cv.drawRect(skia.Rect(95, 124, 105, 156), P(Color=hx(INK)))


def chest_of(body, lid, band):
    def f(cv):
        shadow(cv, 100, 186, 76, 9)
        shape(cv, rr(28, 92, 172, 176, 12), body, 92, 176)
        p = skia.Path(); p.moveTo(28, 100); p.cubicTo(28, 40, 172, 40, 172, 100); p.close()
        shape(cv, p, lid, 50, 100)
        for x in (52, 148):
            shape(cv, rr(x - 9, 56, x + 9, 176, 4), band, 56, 176, w=4)
        shape(cv, rr(84, 92, 116, 128, 6), band, 92, 128, w=4)
        cv.drawCircle(100, 108, 5, P(Color=hx(INK)))
        shine(cv, 40, 64, 70, 74, 5)
    return f


def i_gem(cv):
    shadow(cv, 100, 186, 56, 8)
    outer = poly([(52, 40), (148, 40), (182, 82), (100, 178), (18, 82)])
    shape(cv, outer, '#4FA3FF', 40, 178, w=6)
    ln = P(Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=hx('#CFEAFF'), StrokeJoin=skia.Paint.kRound_Join)
    cv.drawLine(22, 82, 178, 82, ln)
    for a, b in (((76, 40), (62, 82)), ((124, 40), (138, 82)), ((62, 82), (100, 172)), ((138, 82), (100, 172)), ((76, 40), (100, 82)), ((124, 40), (100, 82))):
        cv.drawLine(*a, *b, ln)
    cv.drawPath(poly([(60, 48), (84, 48), (72, 74)]), P(Color=hx('#FFFFFF', 150)))


def i_ticket(cv):
    shadow(cv, 100, 186, 70, 8)
    p = skia.Path()
    p.moveTo(30, 40); p.lineTo(170, 40); p.quadTo(184, 40, 184, 54); p.lineTo(184, 78)
    p.arcTo(skia.Rect(166, 78, 202, 114), 270, -180, False)
    p.lineTo(184, 146); p.quadTo(184, 160, 170, 160); p.lineTo(30, 160); p.quadTo(16, 160, 16, 146); p.lineTo(16, 114)
    p.arcTo(skia.Rect(-2, 78, 34, 114), 90, -180, False)
    p.lineTo(16, 54); p.quadTo(16, 40, 30, 40); p.close()
    cv.save(); cv.rotate(-10, 100, 100)
    shape(cv, p, '#3BCE7A', 40, 160, w=6)
    dash = P(Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=hx('#E6FFEF'), PathEffect=skia.DashPathEffect.Make([8, 8], 0))
    cv.drawLine(52, 52, 52, 148, dash)
    f = skia.Font(skia.Typeface('Arial', skia.FontStyle.Bold()), 84)
    cv.drawString('P', 88, 128, f, P(Color=hx('#FFFFFF')))
    cv.drawString('P', 88, 128, f, P(Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=hx(INK)))
    cv.restore()


def i_wheel(cv):
    shadow(cv, 100, 188, 60, 8)
    cols = ['#E8453C', '#3A86FF', '#3BCE7A', '#FFB020', '#B04CFF', '#56CCF2', '#FF4D9A', '#2EC4B6']
    r = skia.Rect(22, 18, 178, 174)
    for i, c in enumerate(cols):
        p = skia.Path(); p.moveTo(100, 96); p.arcTo(r, i * 45, 45, False); p.close()
        cv.drawPath(p, P(Color=hx(c)))
    cv.drawCircle(100, 96, 78, P(Style=skia.Paint.kStroke_Style, StrokeWidth=10, Color=hx('#FFC400')))
    cv.drawCircle(100, 96, 78, P(Style=skia.Paint.kStroke_Style, StrokeWidth=3, Color=hx(INK)))
    shape(cv, circ(100, 96, 20), '#FFC400', 76, 116, w=5)
    shape(cv, poly([(84, 4), (116, 4), (100, 34)]), '#FFFFFF', 4, 34, w=5)


def i_x2(cv):
    shadow(cv, 100, 186, 60, 8)
    shape(cv, circ(100, 96, 80), '#FF7A1A', 16, 176, w=6)
    f = skia.Font(skia.Typeface('Arial', skia.FontStyle.Bold()), 78)
    cv.drawString('x2', 52, 124, f, P(Color=hx('#FFFFFF')))
    cv.drawString('x2', 52, 124, f, P(Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=hx(INK)))


def i_infinite(cv):
    i_heart(cv)
    f = skia.Font(skia.Typeface('Arial', skia.FontStyle.Bold()), 80)
    cv.drawString('\u221e', 62, 128, f, P(Color=hx('#FFFFFF')))


def i_trade(cv):
    shadow(cv, 100, 186, 66, 8)
    shape(cv, rr(14, 30, 186, 170, 30), '#2A4166', 30, 170, w=6)
    ar = P(Style=skia.Paint.kStroke_Style, StrokeWidth=10, Color=hx('#FFFFFF'), StrokeCap=skia.Paint.kRound_Cap, StrokeJoin=skia.Paint.kRound_Join)
    cv.drawLine(60, 100, 140, 100, ar); cv.drawLine(120, 80, 140, 100, ar); cv.drawLine(120, 120, 140, 100, ar)


ICONS = {
    'missions': i_clipboard, 'passenger': i_person, 'people': i_people, 'parking': i_parking,
    'car': i_car, 'bus': i_bus, 'truck': i_truck, 'star': i_star, 'bolt': i_bolt, 'shield': i_shield,
    'calendar': i_calendar, 'flag': i_flag, 'chest': i_chest, 'coin': i_coin, 'heart': i_heart, 'lock': i_lock,
    'gem': i_gem, 'ticket': i_ticket, 'wheel': i_wheel, 'x2': i_x2, 'infinite': i_infinite, 'trade': i_trade,
    'chest-bronze': chest_of('#9A5B2E', '#B06A36', '#E3A56B'), 'chest-silver': chest_of('#7C8796', '#98A4B3', '#E6EEF6'), 'chest-gold': chest_of('#D49A10', '#E8B320', '#FFF0A8'),
    'tab-home': i_home, 'tab-map': i_map, 'tab-market': i_cart, 'tab-garage': i_garage, 'tab-settings': i_gear,
}

# ---------- Harita süsleri (240x240) ----------


def m_house(cv, wall='#FFE8C2', roof='#E53935', door='#3A86FF'):
    shadow(cv, 120, 222, 86, 9)
    shape(cv, rr(48, 104, 192, 216, 6), wall, 104, 216)
    shape(cv, poly([(30, 114), (120, 34), (210, 114)]), roof, 34, 114)
    shape(cv, rr(104, 156, 136, 216, 6), door, 156, 216)
    for x in (62, 152):
        shape(cv, rr(x, 130, x + 28, 158, 4), '#BFE6FF', 130, 158, w=4)


def m_house2(cv):
    m_house(cv, '#CDE7FF', '#3A86FF', '#E8873A')


def m_tree(cv, c='#3BAA5C'):
    shadow(cv, 120, 224, 60, 8)
    shape(cv, rr(110, 150, 130, 222, 6), '#8A5A3B', 150, 222)
    for (x, y, r) in ((120, 70, 52), (82, 118, 44), (158, 118, 44), (120, 128, 50)):
        shape(cv, circ(x, y, r), c, y - r, y + r)
    shine(cv, 96, 40, 120, 54, 7)


def m_pine(cv, snow=False):
    shadow(cv, 120, 226, 54, 8)
    shape(cv, rr(110, 188, 130, 224, 5), '#8A5A3B', 188, 224)
    for k, (y0, w) in enumerate(((20, 50), (70, 70), (120, 90))):
        p = poly([(120, y0), (120 - w, y0 + 76), (120 + w, y0 + 76)])
        shape(cv, p, '#2E8B57', y0, y0 + 76)
        if snow:
            cv.drawPath(poly([(120, y0), (120 - w * .4, y0 + 30), (120 + w * .4, y0 + 30)]), P(Color=hx('#FFFFFF')))


def m_pine_snow(cv):
    m_pine(cv, True)


def m_shop(cv):
    shadow(cv, 120, 222, 92, 9)
    shape(cv, rr(36, 90, 204, 216, 6), '#FFE8C2', 90, 216)
    aw = poly([(26, 70), (214, 70), (204, 114), (36, 114)])
    cv.save(); cv.clipPath(aw, doAntiAlias=True)
    for k in range(10):
        cv.drawRect(skia.Rect(26 + k * 19, 70, 45 + k * 19, 114), P(Color=hx('#E53935' if k % 2 else '#FFFFFF')))
    cv.restore()
    cv.drawPath(aw, P(Style=skia.Paint.kStroke_Style, StrokeWidth=5, Color=hx(INK)))
    shape(cv, rr(52, 130, 112, 184, 4), '#BFE6FF', 130, 184, w=4)
    shape(cv, rr(132, 130, 186, 216, 4), '#3BAA5C', 130, 216, w=4)
    for (x, c) in ((64, '#FF7A00'), (82, '#FFC400'), (100, '#E53935')):
        cv.drawCircle(x, 176, 8, P(Color=hx(c)))


def m_stall(cv):
    shadow(cv, 120, 222, 80, 8)
    shape(cv, rr(50, 140, 190, 214, 6), '#C98545', 140, 214)
    for x in (56, 178):
        cv.drawRect(skia.Rect(x, 70, x + 6, 140), P(Color=hx(INK)))
    aw = poly([(36, 60), (204, 60), (196, 92), (44, 92)])
    cv.save(); cv.clipPath(aw, doAntiAlias=True)
    for k in range(9):
        cv.drawRect(skia.Rect(36 + k * 19, 60, 55 + k * 19, 92), P(Color=hx('#3A86FF' if k % 2 else '#FFFFFF')))
    cv.restore()
    cv.drawPath(aw, P(Style=skia.Paint.kStroke_Style, StrokeWidth=5, Color=hx(INK)))
    for k, c in enumerate(('#E53935', '#FFC400', '#3BAA5C', '#FF7A00', '#8E2DE2', '#E53935')):
        cv.drawCircle(70 + k * 20, 134, 10, P(Color=hx(c)))


def m_lamp(cv):
    shadow(cv, 120, 226, 30, 6)
    shape(cv, rr(112, 60, 128, 224, 6), '#3B4252', 60, 224, w=4)
    shape(cv, rr(92, 30, 148, 70, 14), '#FFE066', 30, 70, w=5)
    cv.drawCircle(120, 50, 40, P(Color=hx('#FFE066', 60)))


def m_boat(cv):
    shape(cv, poly([(30, 150), (210, 150), (180, 200), (60, 200)]), '#E53935', 150, 200)
    cv.drawRect(skia.Rect(116, 40, 124, 150), P(Color=hx(INK)))
    shape(cv, poly([(124, 44), (196, 136), (124, 136)]), '#FFFFFF', 44, 136)
    shape(cv, poly([(116, 60), (60, 136), (116, 136)]), '#FFC400', 60, 136)
    for k in range(3):
        cv.drawRect(skia.Rect(50 + k * 50, 206 + k % 2 * 6, 90 + k * 50, 212 + k % 2 * 6), P(Color=hx('#FFFFFF', 150)))


def m_crane(cv):
    shadow(cv, 120, 226, 60, 7)
    shape(cv, rr(96, 60, 120, 222, 2), '#FFC400', 60, 222, w=4)
    shape(cv, rr(40, 48, 220, 66, 2), '#FFC400', 48, 66, w=4)
    cv.drawLine(196, 66, 196, 140, P(Color=hx(INK), StrokeWidth=3))
    shape(cv, rr(176, 140, 216, 172, 3), '#3A86FF', 140, 172, w=4)
    shape(cv, rr(60, 180, 160, 222, 4), '#E53935', 180, 222, w=4)


def m_lighthouse(cv):
    shadow(cv, 120, 226, 50, 7)
    p = poly([(96, 80), (144, 80), (160, 220), (80, 220)])
    cv.save(); cv.clipPath(p, doAntiAlias=True)
    for k in range(5):
        cv.drawRect(skia.Rect(70, 80 + k * 28, 170, 94 + k * 28), P(Color=hx('#E53935')))
        cv.drawRect(skia.Rect(70, 94 + k * 28, 170, 108 + k * 28), P(Color=hx('#FFFFFF')))
    cv.restore()
    cv.drawPath(p, P(Style=skia.Paint.kStroke_Style, StrokeWidth=5, Color=hx(INK)))
    shape(cv, rr(94, 44, 146, 82, 6), '#FFE066', 44, 82)
    shape(cv, poly([(88, 46), (120, 18), (152, 46)]), '#3B4252', 18, 46)


def m_train(cv):
    shadow(cv, 120, 206, 110, 8)
    shape(cv, rr(14, 100, 226, 190, 20), '#2EC4B6', 100, 190)
    for k in range(5):
        cv.drawRRect(skia.RRect.MakeRectXY(skia.Rect(30 + k * 38, 116, 58 + k * 38, 144), 5, 5), P(Color=hx('#BFE6FF')))
    cv.drawRect(skia.Rect(14, 156, 226, 164), P(Color=hx('#FFFFFF')))
    for x in (50, 190):
        shape(cv, circ(x, 196, 14), '#2B2F3A', 182, 210, w=4)
    cv.drawLine(0, 214, 240, 214, P(Color=hx('#5B4636'), StrokeWidth=6))


def m_station(cv):
    shadow(cv, 120, 222, 96, 8)
    shape(cv, rr(30, 96, 210, 216, 6), '#FFE8C2', 96, 216)
    shape(cv, poly([(20, 100), (120, 52), (220, 100)]), '#9B5DE5', 52, 100)
    shape(cv, circ(120, 128, 20), '#FFFFFF', 108, 148, w=4)
    cv.drawLine(120, 128, 120, 116, P(Color=hx(INK), StrokeWidth=3)); cv.drawLine(120, 128, 130, 132, P(Color=hx(INK), StrokeWidth=3))
    for x in (48, 156):
        shape(cv, rr(x, 160, x + 36, 216, 14), '#3A86FF', 160, 216, w=4)


def m_plane(cv):
    shape(cv, rr(24, 100, 216, 140, 20), '#F4F7FB', 100, 140)
    shape(cv, poly([(110, 110), (70, 30), (96, 30), (150, 110)]), '#3A86FF', 30, 110)
    shape(cv, poly([(110, 130), (70, 210), (96, 210), (150, 130)]), '#3A86FF', 130, 210)
    shape(cv, poly([(30, 106), (16, 66), (34, 66), (56, 106)]), '#E53935', 66, 106)
    for k in range(6):
        cv.drawCircle(80 + k * 18, 116, 5, P(Color=hx('#3A86FF')))
    cv.drawPath(poly([(200, 108), (214, 120), (200, 132)]), P(Color=hx('#BFE6FF')))


def m_tower(cv):
    shadow(cv, 120, 226, 44, 7)
    shape(cv, poly([(104, 90), (136, 90), (146, 222), (94, 222)]), '#F4F7FB', 90, 222)
    shape(cv, rr(76, 46, 164, 94, 16), '#2EC4B6', 46, 94)
    cv.drawRRect(skia.RRect.MakeRectXY(skia.Rect(86, 58, 154, 80), 6, 6), P(Color=hx('#BFE6FF')))
    cv.drawLine(120, 46, 120, 20, P(Color=hx(INK), StrokeWidth=4)); cv.drawCircle(120, 18, 6, P(Color=hx('#E53935')))


def m_stadium(cv):
    shadow(cv, 120, 222, 110, 10)
    shape(cv, skia.Path().addOval(skia.Rect(14, 90, 226, 216)), '#E53935', 90, 216)
    cv.drawOval(skia.Rect(44, 112, 196, 194), P(Color=hx('#3BAA5C')))
    cv.drawOval(skia.Rect(44, 112, 196, 194), P(Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=hx('#FFFFFF')))
    cv.drawLine(120, 112, 120, 194, P(Color=hx('#FFFFFF'), StrokeWidth=3))
    for x in (28, 212):
        cv.drawRect(skia.Rect(x - 3, 30, x + 3, 120), P(Color=hx(INK)))
        shape(cv, rr(x - 16, 20, x + 16, 40, 4), '#FFE066', 20, 40, w=3)


def m_flag(cv):
    shadow(cv, 120, 226, 40, 6)
    cv.drawRect(skia.Rect(80, 30, 90, 224), P(Color=hx(INK)))
    shape(cv, poly([(90, 34), (200, 58), (90, 90)]), '#E53935', 34, 90)


def m_umbrella(cv):
    shadow(cv, 120, 226, 70, 8)
    cv.drawRect(skia.Rect(116, 80, 124, 224), P(Color=hx('#8A5A3B')))
    p = skia.Path(); p.moveTo(20, 100); p.cubicTo(40, 20, 200, 20, 220, 100); p.close()
    cv.save(); cv.clipPath(p, doAntiAlias=True)
    for k in range(7):
        cv.drawRect(skia.Rect(20 + k * 29, 20, 49 + k * 29, 100), P(Color=hx('#FF4FA8' if k % 2 else '#FFFFFF')))
    cv.restore()
    cv.drawPath(p, P(Style=skia.Paint.kStroke_Style, StrokeWidth=5, Color=hx(INK)))


def m_palm(cv):
    shadow(cv, 120, 226, 50, 7)
    q = skia.Path(); q.moveTo(110, 224); q.cubicTo(100, 160, 130, 110, 120, 70)
    cv.drawPath(q, P(Style=skia.Paint.kStroke_Style, StrokeWidth=20, Color=hx('#A0673F'), StrokeCap=skia.Paint.kRound_Cap))
    for a in (-160, -120, -60, -20, -90):
        r = math.radians(a)
        x, y = 120 + 90 * math.cos(r), 70 + 60 * math.sin(r) + 40
        leaf = skia.Path(); leaf.moveTo(120, 70); leaf.quadTo((120 + x) / 2, min(y, 70) - 30, x, y)
        leaf.quadTo((120 + x) / 2, min(y, 70) - 6, 120, 76); leaf.close()
        shape(cv, leaf, '#3BAA5C', 20, 120, w=4)
    for x in (110, 128):
        shape(cv, circ(x, 82, 9), '#8A5A3B', 73, 91, w=3)


def m_mountain(cv, snow=False):
    shadow(cv, 120, 222, 110, 8)
    shape(cv, poly([(4, 218), (90, 40), (150, 140), (176, 100), (236, 218)]), '#8C7A6B' if not snow else '#7D8FA6', 40, 218)
    cv.drawPath(poly([(90, 40), (66, 90), (80, 84), (92, 98), (106, 82), (116, 92)]), P(Color=hx('#FFFFFF')))
    if snow:
        cv.drawPath(poly([(176, 100), (164, 124), (176, 118), (190, 126)]), P(Color=hx('#FFFFFF')))


def m_mountain_snow(cv):
    m_mountain(cv, True)


def m_cactus(cv):
    shadow(cv, 120, 226, 46, 7)
    shape(cv, rr(98, 40, 142, 224, 22), '#3BAA5C', 40, 224)
    shape(cv, rr(50, 100, 80, 170, 15), '#3BAA5C', 100, 170)
    shape(cv, rr(60, 150, 104, 172, 10), '#3BAA5C', 150, 172)
    shape(cv, rr(162, 80, 192, 140, 15), '#3BAA5C', 80, 140)
    shape(cv, rr(138, 124, 180, 146, 10), '#3BAA5C', 124, 146)
    shape(cv, circ(120, 40, 10), '#FF4FA8', 30, 50, w=3)


def m_pyramid(cv):
    shadow(cv, 120, 222, 110, 8)
    shape(cv, poly([(10, 218), (120, 50), (230, 218)]), '#E9C46A', 50, 218)
    cv.drawPath(poly([(120, 50), (230, 218), (130, 218)]), P(Color=hx('#000000', 40)))
    for k in range(1, 5):
        y = 50 + k * 34
        cv.drawLine(120 - (y - 50) * .65, y, 120 + (y - 50) * .65, y, P(Color=hx('#B08A3E'), StrokeWidth=3))


def m_snowman(cv):
    shadow(cv, 120, 226, 56, 7)
    shape(cv, circ(120, 172, 52), '#FFFFFF', 120, 224)
    shape(cv, circ(120, 96, 38), '#FFFFFF', 58, 134)
    shape(cv, rr(92, 30, 148, 62, 4), '#1F2A3D', 30, 62)
    cv.drawRect(skia.Rect(80, 58, 160, 66), P(Color=hx('#1F2A3D')))
    shape(cv, poly([(120, 98), (150, 104), (120, 108)]), '#FF7A00', 98, 108, w=3)
    for y in (150, 176, 200):
        cv.drawCircle(120, y, 5, P(Color=hx(INK)))
    cv.drawRect(skia.Rect(82, 128, 158, 140), P(Color=hx('#E53935')))


def m_mesa(cv):
    shadow(cv, 120, 222, 110, 8)
    shape(cv, poly([(10, 218), (40, 90), (70, 80), (180, 84), (204, 100), (230, 218)]), '#D9734A', 80, 218)
    for k in range(3):
        y = 120 + k * 32
        cv.drawLine(30, y, 214, y + 4, P(Color=hx('#A84F2E'), StrokeWidth=4))


def m_bridge(cv):
    cv.drawRect(skia.Rect(0, 150, 240, 164), P(Color=hx('#E53935')))
    for x in (50, 190):
        shape(cv, rr(x - 10, 30, x + 10, 220, 3), '#E53935', 30, 220, w=4)
    q = skia.Path(); q.moveTo(0, 60); q.quadTo(120, 190, 240, 60)
    cv.drawPath(q, P(Style=skia.Paint.kStroke_Style, StrokeWidth=5, Color=hx(INK)))
    for x in range(20, 230, 20):
        cv.drawLine(x, 150, x, 60 + abs(120 - x) ** 2 / 110, P(Color=hx(INK), StrokeWidth=2))
    cv.drawRect(skia.Rect(0, 190, 240, 240), P(Color=hx('#56CCF2', 120)))


def m_ferris(cv):
    shadow(cv, 120, 226, 76, 8)
    cv.drawLine(120, 110, 70, 222, P(Color=hx(INK), StrokeWidth=8)); cv.drawLine(120, 110, 170, 222, P(Color=hx(INK), StrokeWidth=8))
    cv.drawCircle(120, 110, 90, P(Style=skia.Paint.kStroke_Style, StrokeWidth=8, Color=hx('#9B5DE5')))
    for k in range(8):
        a = math.radians(k * 45)
        x, y = 120 + 90 * math.cos(a), 110 + 90 * math.sin(a)
        cv.drawLine(120, 110, x, y, P(Color=hx('#9B5DE5'), StrokeWidth=3))
        shape(cv, rr(x - 13, y - 6, x + 13, y + 16, 6), ['#E53935', '#FFC400', '#3BAA5C', '#3A86FF'][k % 4], y - 6, y + 16, w=3)
    shape(cv, circ(120, 110, 12), '#FFC400', 98, 122, w=4)


def m_tent(cv):
    shadow(cv, 120, 222, 96, 8)
    p = poly([(20, 216), (120, 40), (220, 216)])
    cv.save(); cv.clipPath(p, doAntiAlias=True)
    for k in range(10):
        cv.drawRect(skia.Rect(20 + k * 20, 40, 40 + k * 20, 216), P(Color=hx('#E53935' if k % 2 else '#FFE066')))
    cv.restore()
    cv.drawPath(p, P(Style=skia.Paint.kStroke_Style, StrokeWidth=5, Color=hx(INK)))
    shape(cv, poly([(120, 40), (120, 10), (150, 22)]), '#3A86FF', 10, 40, w=3)


def m_balloon(cv):
    for (x, y, c) in ((80, 80, '#E53935'), (150, 60, '#3A86FF'), (120, 120, '#FFC400')):
        q = skia.Path(); q.moveTo(x, y + 40); q.quadTo(x + 10, y + 90, x - 4, y + 150)
        cv.drawPath(q, P(Style=skia.Paint.kStroke_Style, StrokeWidth=2, Color=hx(INK)))
        shape(cv, skia.Path().addOval(skia.Rect(x - 30, y - 36, x + 30, y + 40)), c, y - 36, y + 40, w=4)
        shine(cv, x - 18, y - 22, x - 8, y - 4, 5)


def m_skyscraper(cv):
    shadow(cv, 120, 226, 90, 7)
    for (x0, x1, top, c) in ((30, 90, 70, '#3B4F7A'), (96, 160, 20, '#2C3E66'), (166, 214, 100, '#4A5F8E')):
        shape(cv, rr(x0, top, x1, 222, 4), c, top, 222)
        for yy in range(top + 14, 210, 18):
            for xx in range(x0 + 8, x1 - 10, 14):
                if (xx * 7 + yy * 3) % 5:
                    cv.drawRect(skia.Rect(xx, yy, xx + 8, yy + 10), P(Color=hx('#FFE066' if (xx + yy) % 3 else '#56CCF2')))


def m_castle(cv):
    shadow(cv, 120, 222, 106, 8)
    shape(cv, rr(40, 110, 200, 218, 4), '#D8C7A8', 110, 218)
    for (x0, x1, top) in ((22, 70, 60), (170, 218, 60), (96, 144, 34)):
        shape(cv, rr(x0, top, x1, 218, 3), '#E6D8BE', top, 218)
        shape(cv, poly([(x0 - 6, top), ((x0 + x1) / 2, top - 46), (x1 + 6, top)]), '#9B5DE5', top - 46, top)
    shape(cv, rr(104, 160, 136, 218, 16), '#8A5A3B', 160, 218)
    shape(cv, poly([(120, -10 + 34), (120, 4), (146, 10)]), '#FFC400', 4, 24, w=3)


def m_rocket(cv):
    shape(cv, poly([(84, 176), (60, 214), (96, 196)]), '#E53935', 176, 214)
    shape(cv, poly([(156, 176), (180, 214), (144, 196)]), '#E53935', 176, 214)
    p = skia.Path(); p.moveTo(120, 14); p.cubicTo(170, 60, 160, 150, 150, 196); p.lineTo(90, 196); p.cubicTo(80, 150, 70, 60, 120, 14); p.close()
    shape(cv, p, '#F4F7FB', 14, 196)
    shape(cv, circ(120, 96, 20), '#56CCF2', 76, 116, w=5)
    shape(cv, poly([(98, 200), (142, 200), (120, 236)]), '#FF7A00', 200, 236, ink=False)


def m_planet(cv):
    shape(cv, circ(120, 120, 70), '#F15BB5', 50, 190)
    cv.drawOval(skia.Rect(20, 104, 220, 140), P(Style=skia.Paint.kStroke_Style, StrokeWidth=10, Color=hx('#FFE066')))
    cv.drawCircle(96, 96, 14, P(Color=hx('#FFFFFF', 70)))


def m_star(cv):
    shape(cv, star_path(120, 120, 100, 44), '#FFE066', 20, 220, w=6)


MAP_PROPS = {
    'house': m_house, 'house2': m_house2, 'tree': m_tree, 'pine': m_pine, 'pineSnow': m_pine_snow, 'shop': m_shop,
    'stall': m_stall, 'lamp': m_lamp, 'boat': m_boat, 'crane': m_crane, 'lighthouse': m_lighthouse, 'train': m_train,
    'station': m_station, 'plane': m_plane, 'tower': m_tower, 'stadium': m_stadium, 'flag': m_flag, 'umbrella': m_umbrella,
    'palm': m_palm, 'mountain': m_mountain, 'mountainSnow': m_mountain_snow, 'cactus': m_cactus, 'pyramid': m_pyramid,
    'snowman': m_snowman, 'mesa': m_mesa, 'bridge': m_bridge, 'ferris': m_ferris, 'tent': m_tent, 'balloon': m_balloon,
    'skyscraper': m_skyscraper, 'castle': m_castle, 'rocket': m_rocket, 'planet': m_planet, 'star': m_star,
}


def render(fn, size, path, base=200):
    surf = skia.Surface(size, size)
    cv = surf.getCanvas(); cv.clear(skia.ColorTRANSPARENT)
    cv.scale(size / base, size / base)
    fn(cv)
    surf.makeImageSnapshot().save(path, skia.kPNG)


if __name__ == '__main__':
    os.makedirs(OUT_I, exist_ok=True); os.makedirs(OUT_M, exist_ok=True)
    for k, fn in ICONS.items():
        render(fn, 160, os.path.join(OUT_I, f'{k}.png'))
    for k, fn in MAP_PROPS.items():
        render(fn, 200, os.path.join(OUT_M, f'{k}.png'), 240)
    # React Native için require tablosu
    lines = ['// scripts/make_icons.py üretir; elle düzenleme.', '/* eslint-disable @typescript-eslint/no-require-imports */', 'export const ICONS = {']
    lines += [f"  '{k}': require('../../assets/icons/{k}.png')," for k in ICONS]
    lines += ['} as const;', 'export type IconName = keyof typeof ICONS;', '', 'export const MAP_PROPS = {']
    lines += [f"  {k}: require('../../assets/map/{k}.png')," for k in MAP_PROPS]
    lines += ['} as const;', 'export type MapProp = keyof typeof MAP_PROPS;', '']
    open(os.path.join(ROOT, 'src', 'ui', 'icons.ts'), 'w').write('\n'.join(lines))
    print(len(ICONS), 'ikon,', len(MAP_PROPS), 'süs')
