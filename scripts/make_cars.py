# Parxi garaj arabaları: özgün, telifsiz, yumuşak çizimli yan görünüşler (sağa bakar).
import skia, math
W, H = 640, 320
GROUND = 262

def hx(h, a=255):
    h = h.lstrip('#'); return skia.Color(int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), a)
def mix(h, t, to='#FFFFFF'):
    h=h.lstrip('#'); to=to.lstrip('#')
    c=[int(h[i:i+2],16) for i in (0,2,4)]; d=[int(to[i:i+2],16) for i in (0,2,4)]
    return '#%02x%02x%02x' % tuple(int(a+(b-a)*t) for a,b in zip(c,d))

def poly(pts, close=True):
    p = skia.Path(); p.moveTo(*pts[0])
    for q in pts[1:]: p.lineTo(*q)
    if close: p.close()
    return p

def fill(c, path, color, corner=0, shader=None, alpha=255):
    paint = skia.Paint(AntiAlias=True)
    if shader: paint.setShader(shader)
    else: paint.setColor(hx(color, alpha) if isinstance(color,str) else color)
    if corner: paint.setPathEffect(skia.CornerPathEffect.Make(corner))
    c.drawPath(path, paint)

def stroke(c, path, color, w, corner=0, alpha=255):
    paint = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=w, Color=hx(color, alpha))
    paint.setStrokeCap(skia.Paint.kRound_Cap); paint.setStrokeJoin(skia.Paint.kRound_Join)
    if corner: paint.setPathEffect(skia.CornerPathEffect.Make(corner))
    c.drawPath(path, paint)

def vgrad(y0, y1, cols, pos=None):
    return skia.GradientShader.MakeLinear([(0,y0),(0,y1)], [hx(x) for x in cols], pos)

def body(c, pts, color, corner=26, top=None, bottom=GROUND-18, arches=None):
    """Gövde: dikey ışık gradyanı, omuz parlaklığı, koyu eşik, çamurluk boşlukları, dış çizgi."""
    ys=[p[1] for p in pts]; xs=[p[0] for p in pts]; y0=min(ys); x0=min(xs); x1=max(xs)
    path = poly(pts)
    sh = vgrad(y0, bottom, [mix(color,.45), mix(color,.12), color, mix(color,.38,'#000000')], [0,.3,.62,1])
    fill(c, path, None, corner, sh)
    c.save()
    clip = skia.Path(path); pe = skia.CornerPathEffect.Make(corner) if corner else None
    if pe:
        p2 = skia.Path(); skia.Paint(PathEffect=pe).getFillPath(path, p2); clip = p2
    c.clipPath(clip, doAntiAlias=True)
    # omuz çizgisi parlaklığı
    band = skia.GradientShader.MakeLinear([(0, y0), (0, y0 + (bottom - y0) * .55)], [hx('#FFFFFF', 0), hx('#FFFFFF', 70), hx('#FFFFFF', 0)], [0, .55, 1])
    pb = skia.Paint(AntiAlias=True); pb.setShader(band); c.drawRect(skia.Rect(x0, y0, x1, y0 + (bottom - y0) * .55), pb)
    # çapraz yansıma
    for k, a in ((0, 34), (1, 20)):
        xx = x0 + (x1 - x0) * (.32 + k * .1)
        fill(c, poly([(xx, bottom), (xx + 60, y0), (xx + 84 + k * 10, y0), (xx + 24 + k * 10, bottom)]), '#FFFFFF', alpha=a)
    # alt eşik
    sill = skia.GradientShader.MakeLinear([(0, bottom - 26), (0, bottom + 4)], [hx('#000000', 0), hx('#000000', 90)])
    ps = skia.Paint(AntiAlias=True); ps.setShader(sill); c.drawRect(skia.Rect(x0, bottom - 26, x1, bottom + 30), ps)
    # çamurluk boşlukları (tekerleğin arkası koyu)
    for (ax, ar) in (arches or []):
        pa = skia.Paint(AntiAlias=True, Color=hx('#0B0D13')); c.drawCircle(ax, GROUND - ar, ar * 1.2, pa)
        pr = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=3, Color=hx(mix(color, .5, '#000000'), 200))
        c.drawCircle(ax, GROUND - ar, ar * 1.26, pr)
    c.restore()
    stroke(c, path, mix(color, .55, '#000000'), 2.2, corner, 170)

def glass(c, pts, corner=10):
    ys=[p[1] for p in pts]; xs=[p[0] for p in pts]
    x0=min(xs); x1=max(xs); yy=min(ys); y2=max(ys)
    sh = vgrad(yy, y2, ['#D6F0FF', '#7FBDE6', '#355E8A', '#22395A'], [0, .3, .7, 1])
    fill(c, poly(pts), None, corner, sh)
    c.save()
    clip = poly(pts)
    if corner:
        p2 = skia.Path(); skia.Paint(PathEffect=skia.CornerPathEffect.Make(corner)).getFillPath(clip, p2); clip = p2
    c.clipPath(clip, doAntiAlias=True)
    fill(c, poly([(x0+(x1-x0)*.18,y2),(x0+(x1-x0)*.42,yy),(x0+(x1-x0)*.56,yy),(x0+(x1-x0)*.32,y2)]), '#FFFFFF', alpha=85)
    fill(c, poly([(x0+(x1-x0)*.62,y2),(x0+(x1-x0)*.74,yy),(x0+(x1-x0)*.79,yy),(x0+(x1-x0)*.67,y2)]), '#FFFFFF', alpha=55)
    c.restore()
    stroke(c, poly(pts), '#E3E8EF', 3, corner, 230)   # krom çerçeve
    stroke(c, poly(pts), '#1A1D26', 1, corner, 160)

def wheel(c, cx, r, rim='#C9D1DC', cy=None, spokes=5, arch=None):
    cy = cy or GROUND - r
    if arch: fill(c, skia.Path().addCircle(cx, cy, r*1.12), arch)
    tire = skia.GradientShader.MakeRadial((cx, cy), r, [hx('#2E3340'), hx('#1E222C'), hx('#0F1117')], [0.6, 0.85, 1])
    p=skia.Paint(AntiAlias=True); p.setShader(tire); c.drawCircle(cx, cy, r, p)
    hl=skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=r*.05, Color=hx('#FFFFFF', 40))
    c.drawArc(skia.Rect(cx-r*.9, cy-r*.9, cx+r*.9, cy+r*.9), 200, 80, False, hl)
    # jant
    rr = r*.64
    sh = skia.GradientShader.MakeLinear([(cx, cy-rr), (cx, cy+rr)], [hx(mix(rim,.6)), hx(rim), hx(mix(rim,.4,'#000000'))])
    p=skia.Paint(AntiAlias=True); p.setShader(sh); c.drawCircle(cx, cy, rr, p)
    p=skia.Paint(AntiAlias=True, Color=hx(mix(rim,.55,'#000000'))); c.drawCircle(cx, cy, rr*.84, p)   # iç gölge
    p=skia.Paint(AntiAlias=True, Color=hx('#6B7280')); c.drawCircle(cx, cy, rr*.55, p)                 # fren diski
    sp=skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=r*.11, Color=hx(mix(rim,.25)))
    sp.setStrokeCap(skia.Paint.kRound_Cap)
    for k in range(spokes):
        a=k*2*math.pi/spokes - math.pi/2
        c.drawLine(cx+math.cos(a)*rr*.22, cy+math.sin(a)*rr*.22, cx+math.cos(a)*rr*.86, cy+math.sin(a)*rr*.86, sp)
    lip=skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=r*.06, Color=hx(mix(rim,.7)))
    c.drawCircle(cx, cy, rr*.96, lip)
    p=skia.Paint(AntiAlias=True, Color=hx(mix(rim,.3,'#000000'))); c.drawCircle(cx, cy, r*.16, p)
    p=skia.Paint(AntiAlias=True, Color=hx('#FFFFFF', 160)); c.drawCircle(cx-r*.04, cy-r*.04, r*.06, p)

def shadow(c, x0, x1):
    p=skia.Paint(AntiAlias=True, Color=hx('#000000', 80)); p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 12))
    c.drawOval(skia.Rect(x0, GROUND-12, x1, GROUND+14), p)
    p=skia.Paint(AntiAlias=True, Color=hx('#000000', 110)); p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 4))
    c.drawOval(skia.Rect(x0+30, GROUND-5, x1-30, GROUND+5), p)

def lamp(c, x, y, w, h, col, r=6):
    if col.upper() in ('#FFE066', '#FFD23F'):
        g=skia.Paint(AntiAlias=True, Color=hx('#FFF3B0', 120)); g.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 7))
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect(x-3,y-3,x+w+6,y+h+3), r, r), g)
        sh = skia.GradientShader.MakeLinear([(x, y), (x + w, y)], [hx('#FFFDF0'), hx('#FFE680')])
    else:
        g=skia.Paint(AntiAlias=True, Color=hx('#FF3B3B', 90)); g.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 5))
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect(x-4,y-2,x+w+2,y+h+2), r, r), g)
        sh = skia.GradientShader.MakeLinear([(x, y), (x, y + h)], [hx('#FF8A8A'), hx('#D61F1F')])
    fill(c, skia.Path().addRRect(skia.RRect.MakeRectXY(skia.Rect(x,y,x+w,y+h), r, r)), None, shader=sh)
    stroke(c, skia.Path().addRRect(skia.RRect.MakeRectXY(skia.Rect(x,y,x+w,y+h), r, r)), '#1A1D26', 1.2, alpha=120)
    fill(c, skia.Path().addRRect(skia.RRect.MakeRectXY(skia.Rect(x+w*.15,y+h*.15,x+w*.5,y+h*.45), r/2, r/2)), '#FFFFFF', alpha=200)

def rect(c, x0,y0,x1,y1,col,r=4,alpha=255):
    fill(c, skia.Path().addRRect(skia.RRect.MakeRectXY(skia.Rect(x0,y0,x1,y1), r, r)), col, alpha=alpha)

def line(c, pts, col, w, alpha=255):
    stroke(c, poly(pts, False), col, w, alpha=alpha)

def door(c, x, y0, y1, col):
    line(c, [(x,y0),(x,y1)], mix(col,.45,'#000000'), 2.2, 150)

def handle(c, x, y, col):
    rect(c, x, y, x+22, y+6, mix(col,.5,'#000000'), 3, 170)

def bumper(c, x0, x1, y, col='#2A2F3B'):
    rect(c, x0, y, x1, y+12, col, 6)

def shine(c, pts, alpha=90):
    line(c, pts, '#FFFFFF', 4, alpha)

# ---------- Şablonlar ----------
def car_generic(c, col, prof, win, pillars, wheels, wr, accent=None, lights=None, extra=None, rim='#C9D1DC', corner=26):
    xs=[p[0] for p in prof]; shadow(c, min(xs)+10, max(xs)-10)
    body(c, prof, col, corner, arches=[(wx, wr) for wx in wheels])
    if extra and 'under' in extra: extra['under'](c)
    for w in win: glass(c, w)
    for px in pillars: rect(c, px[0], px[1], px[0]+px[2], px[3], mix(col,.15,'#000000'), 3)
    if lights:
        lights(c)
    for wx in wheels: wheel(c, wx, wr, rim)
    if extra and 'over' in extra: extra['over'](c)

def sedan(c, col, accent, kind='sedan'):
    prof=[(42,240),(38,196),(60,170),(150,158),(200,108),(345,100),(415,146),(535,158),(575,178),(580,212),(572,240)]
    win=[[(212,116),(300,110),(300,150),(196,152)],[(310,110),(340,108),(400,148),(310,150)]]
    def L(c):
        lamp(c,556,176,22,14,'#FFE066'); lamp(c,40,180,16,16,'#FF4D4D')
        bumper(c,46,150,226); bumper(c,470,574,226)
        door(c,305,156,228,col); handle(c,256,170,col); handle(c,360,170,col)
        shine(c,[(70,176),(190,166),(520,164)])
    def over(c):
        if kind=='taksi':
            rect(c,262,78,330,102,'#1A1D26',6); rect(c,268,82,324,98,'#FFD23F',4)
            for k in range(6): rect(c,60+k*80,200,60+k*80+40,212,'#1A1D26',2)
        if kind=='polis':
            rect(c,250,84,284,100,'#FF4D4D',5); rect(c,288,84,322,100,'#3A86FF',5)
            rect(c,40,196,578,216,'#3A86FF',4); rect(c,236,182,286,194,'#1A1D26',3,200)
    car_generic(c,col,prof,win,[(298,108,10,152)],[160,465],38,lights=L,extra={'over':over},rim='#D7DEE8')

def hatch(c, col, accent):
    prof=[(92,240),(86,190),(100,128),(160,96),(318,92),(392,140),(488,152),(524,176),(528,240)]
    win=[[(124,128),(166,106),(240,102),(240,144),(118,146)],[(250,102),(312,100),(372,142),(250,144)]]
    def L(c):
        lamp(c,508,170,20,16,'#FFE066'); lamp(c,88,160,14,22,'#FF4D4D')
        bumper(c,92,170,226); bumper(c,440,526,226); door(c,246,150,226,col); handle(c,282,164,col)
        shine(c,[(110,170),(380,160),(500,162)])
    car_generic(c,col,prof,win,[(240,100,10,146)],[170,440],37,lights=L)

def pickup(c, col, accent):
    prof=[(36,240),(34,170),(300,166),(318,104),(420,100),(470,150),(560,160),(586,182),(588,240)]
    win=[[(330,112),(410,108),(450,152),(326,152)]]
    def L(c):
        lamp(c,568,180,20,16,'#FFE066'); lamp(c,36,176,12,22,'#FF4D4D')
        rect(c,40,160,296,172,mix(col,.3,'#000000'),3); bumper(c,40,150,228); bumper(c,500,586,228)
        door(c,322,156,228,col); handle(c,380,172,col); shine(c,[(50,184),(300,180),(560,172)])
    car_generic(c,col,prof,win,[],[140,480],42,lights=L)

def jeep(c, col, accent):
    prof=[(58,234),(52,150),(130,96),(420,92),(470,148),(552,152),(566,176),(566,234)]
    win=[[(150,108),(250,104),(250,148),(140,148)],[(262,104),(360,102),(360,148),(262,148)],[(372,102),(412,102),(452,148),(372,148)]]
    def L(c):
        lamp(c,548,166,18,18,'#FFE066'); lamp(c,54,166,12,24,'#FF4D4D')
        rect(c,28,140,58,206,'#1A1D26',12); rect(c,34,148,52,198,accent,8)  # yedek lastik
        bumper(c,50,170,222,'#3B4252'); bumper(c,470,570,222,'#3B4252'); door(c,256,148,222,col); door(c,366,148,222,col)
        rect(c,130,84,420,92,'#3B4252',3); shine(c,[(70,166),(540,162)])
    car_generic(c,col,prof,win,[],[160,460],46,lights=L,rim=accent,corner=18)

def beetle(c, col, accent):
    prof=[(80,236),(70,196),(110,140),(200,86),(330,84),(420,140),(500,170),(512,236)]
    win=[[(196,104),(258,96),(258,140),(160,142)],[(268,96),(326,96),(376,140),(268,140)]]
    def L(c):
        lamp(c,488,168,20,20,'#FFE066',10); lamp(c,80,186,12,18,'#FF4D4D')
        rect(c,60,224,520,232,'#C9D1DC',4); door(c,264,140,224,col); handle(c,300,154,col); shine(c,[(110,170),(300,150),(470,170)],80)
    car_generic(c,col,prof,win,[],[150,430],38,lights=L,rim='#F4F1DE',corner=60)

def convertible(c, col, accent):
    prof=[(40,240),(36,190),(70,168),(560,166),(590,186),(592,240)]
    def L(c):
        line(c,[(330,166),(372,110),(392,110)],'#1A1D26',7); glass(c,[(338,162),(374,114),(388,114),(360,162)],4)
        rect(c,140,140,200,166,accent,10); rect(c,220,144,280,166,accent,10)
        lamp(c,568,184,22,14,'#FFE066'); lamp(c,38,184,14,16,'#FF4D4D'); bumper(c,44,150,228); bumper(c,500,592,228)
        door(c,320,170,228,col); shine(c,[(60,182),(570,180)])
    car_generic(c,col,prof,[],[],[150,480],40,lights=L,corner=30)

def sports(c, col, accent, kind='spor'):
    prof=[(30,238),(28,196),(70,168),(210,150),(290,108),(380,104),(470,150),(600,170),(616,198),(612,238)]
    win=[[(300,116),(372,112),(440,152),(270,156)]]
    def L(c):
        lamp(c,588,176,26,10,'#FFE066',5); lamp(c,30,186,16,10,'#FF4D4D',5)
        rect(c,36,150,90,162,accent,4); rect(c,56,160,66,176,accent,2)  # rüzgârlık
        rect(c,236,194,420,208,mix(col,.35,'#000000'),7,120)  # yan hava girişi
        bumper(c,40,140,228,'#1A1D26'); bumper(c,480,612,228,'#1A1D26'); shine(c,[(60,180),(300,166),(590,180)],110)
        if kind=='altin':
            for (sx,sy,s) in [(120,120,9),(520,120,7),(420,80,6),(200,96,5)]:
                star=poly([(sx,sy-s*2),(sx+s*.5,sy-s*.5),(sx+s*2,sy),(sx+s*.5,sy+s*.5),(sx,sy+s*2),(sx-s*.5,sy+s*.5),(sx-s*2,sy),(sx-s*.5,sy-s*.5)])
                fill(c,star,'#FFFFFF')
        if kind=='roket':
            fl=poly([(30,192),(-30,182),(4,200),(-40,212),(30,214)]); fill(c,fl,'#FF9F1C'); fill(c,poly([(30,196),(-6,200),(30,210)]),'#FFE066')
            rect(c,0,184,40,222,'#5C6575',8)
    car_generic(c,col,prof,win,[],[150,500],38,lights=L,rim=('#F2C94C' if kind!='spor' else '#E8ECF2'),corner=40)

def limo(c, col, accent):
    prof=[(20,240),(18,196),(40,170),(120,158),(170,108),(470,100),(530,146),(600,158),(626,178),(628,240)]
    win=[[(180,116),(260,110),(260,150),(170,152)],[(272,110),(350,108),(350,150),(272,150)],[(362,108),(440,106),(440,150),(362,150)],[(452,106),(470,106),(520,148),(452,150)]]
    def L(c):
        lamp(c,606,176,22,14,'#FFE066'); lamp(c,20,180,14,16,'#FF4D4D'); bumper(c,26,110,226,'#C9D1DC'); bumper(c,540,628,226,'#C9D1DC')
        rect(c,20,198,628,206,accent,3); shine(c,[(40,176),(600,172)],70)
    car_generic(c,col,prof,win,[],[120,540],38,lights=L,rim='#E8ECF2')

def van(c, col, accent, kind='minibus'):
    prof=[(40,240),(40,90),(470,90),(540,140),(590,160),(596,240)]
    win=[[(70,108),(150,108),(150,150),(70,150)],[(165,108),(245,108),(245,150),(165,150)],[(260,108),(340,108),(340,150),(260,150)],[(355,108),(440,108),(440,150),(355,150)],[(455,108),(478,108),(528,150),(455,150)]]
    if kind in ('ambulans','dondurma','karavan'): win=[win[-1]]
    def L(c):
        lamp(c,574,170,20,16,'#FFE066'); lamp(c,40,170,12,24,'#FF4D4D'); bumper(c,44,150,226); bumper(c,500,596,226)
        rect(c,40,186,596,198,accent,2)
        if kind=='ambulans':
            rect(c,204,108,232,176,'#FF5A5F',4); rect(c,184,128,252,156,'#FF5A5F',4)
            rect(c,236,72,262,90,'#FF4D4D',5); rect(c,266,72,292,90,'#3A86FF',5)
        if kind=='dondurma':
            glass(c,[(90,110),(330,110),(330,160),(90,160)],6)
            rect(c,80,104,340,112,'#FFFFFF',3)
            for k in range(6): rect(c,52+k*70,74,52+k*70+36,90,'#F15BB5' if k%2 else '#FFFFFF',4)
            # külah
            fill(c,poly([(372,74),(404,74),(388,40)]),'#D9A066'); fill(c,skia.Path().addCircle(388,40,18),'#FFB3D9'); fill(c,skia.Path().addCircle(380,30,8),'#FFFFFF',alpha=160)
        if kind=='karavan':
            glass(c,[(90,112),(170,112),(170,150),(90,150)],8); glass(c,[(260,112),(340,112),(340,150),(260,150)],8)
            rect(c,190,112,240,226,mix(col,.2,'#000000'),6); rect(c,40,160,596,168,'#FF9F1C',2)
        shine(c,[(60,104),(460,104)],80)
    car_generic(c,col,prof,win,[],[140,480],40,lights=L,corner=24)

def bus(c, col, accent):
    prof=[(20,240),(20,84),(590,84),(612,110),(620,240)]
    win=[[(40+k*82,104),(108+k*82,104),(108+k*82,150),(40+k*82,150)] for k in range(6)]+[[(540,104),(596,104),(604,160),(540,160)]]
    def L(c):
        rect(c,20,168,620,180,accent,2); rect(c,20,196,620,204,accent,2)
        lamp(c,600,186,18,18,'#FFE066'); lamp(c,20,186,12,20,'#FF4D4D'); bumper(c,22,130,226,'#1A1D26'); bumper(c,500,620,226,'#1A1D26')
        rect(c,30,70,110,84,'#FF4D4D',4,0)
    car_generic(c,col,prof,win,[],[130,500],40,lights=L,corner=18)

def firetruck(c, col, accent):
    prof=[(20,240),(20,120),(420,120),(420,96),(540,96),(600,150),(616,170),(620,240)]
    win=[[(436,106),(520,106),(566,152),(436,152)]]
    def L(c):
        for k in range(6): rect(c,40+k*62,134,90+k*62,178,'#C9D1DC',6)
        rect(c,30,96,400,104,'#C9D1DC',3); rect(c,30,112,400,118,'#C9D1DC',3)
        for k in range(14): rect(c,38+k*26,96,44+k*26,118,'#C9D1DC',2)
        rect(c,20,192,620,202,accent,2); lamp(c,598,180,18,16,'#FFE066'); lamp(c,20,180,12,20,'#FF4D4D')
        rect(c,450,80,478,96,'#FF4D4D',5); rect(c,482,80,510,96,'#3A86FF',5)
        bumper(c,22,120,226,'#C9D1DC'); bumper(c,520,620,226,'#C9D1DC')
    car_generic(c,col,prof,win,[],[110,300,520],40,lights=L,corner=16)

def semi(c, col, accent):
    shadow(c,20,630)
    for wx in [70,140,230,520,590]: fill(c, skia.Path().addCircle(wx, GROUND-34, 38), '#14171F')
    # dorse
    tr=[(10,214),(10,70),(420,70),(420,214)]
    fill(c,poly(tr),None,14,vgrad(70,214,['#FFFFFF','#E8ECF2','#B8C0CC'],[0,.6,1]))
    rect(c,30,110,400,150,accent,8); rect(c,10,214,430,224,'#3B4252',3)
    # kabin
    cab=[(440,232),(440,96),(560,90),(610,150),(628,172),(630,232)]
    body(c,cab,col,22)
    glass(c,[(470,104),(548,100),(590,150),(470,152)])
    rect(c,446,40,460,100,'#C9D1DC',4)
    lamp(c,606,186,20,16,'#FFE066'); bumper(c,520,630,226,'#C9D1DC'); door(c,520,152,226,col)
    for wx in [70,140,230]: wheel(c,wx,34,'#C9D1DC')
    for wx in [520,590]: wheel(c,wx,34,'#C9D1DC')

def monster(c, col, accent):
    shadow(c,40,600)
    prof=[(110,170),(104,120),(220,110),(250,64),(400,60),(440,110),(520,116),(540,130),(540,170)]
    fill(c,poly([(150,170),(500,170),(500,190),(150,190)]),'#3B4252',4)
    body(c,prof,col,24,bottom=170)
    glass(c,[(262,72),(330,70),(330,108),(250,108)]); glass(c,[(342,70),(392,70),(426,108),(342,108)])
    rect(c,104,140,540,152,accent,3); lamp(c,522,124,16,14,'#FFE066'); lamp(c,104,124,10,16,'#FF4D4D')
    for (x0,y0) in [(240,60),(300,58),(360,58)]: rect(c,x0,y0-10,x0+22,y0-2,'#FFE066',4)
    for wx in [170,470]:
        p=skia.Paint(AntiAlias=True, Color=hx('#1A1D26')); c.drawCircle(wx,GROUND-72,72,p)
        tr=skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=8, Color=hx('#2A2F3B'))
        for k in range(16):
            a=k*2*math.pi/16; c.drawLine(wx+math.cos(a)*58,GROUND-72+math.sin(a)*58,wx+math.cos(a)*70,GROUND-72+math.sin(a)*70,tr)
        wheel(c,wx,48,accent,cy=GROUND-72,spokes=6)

def f1(c, col, accent):
    shadow(c,20,620)
    b=[(40,214),(60,180),(200,170),(260,140),(330,140),(360,170),(560,184),(616,200),(612,214)]
    body(c,b,col,30,bottom=214)
    rect(c,20,120,84,134,accent,4); rect(c,44,130,58,190,'#1A1D26',3)  # arka kanat
    rect(c,570,200,626,212,accent,4)  # ön kanat
    fill(c,skia.Path().addCircle(300,140,18),'#FFE066'); rect(c,282,132,320,140,'#1A1D26',4)  # kask
    rect(c,150,180,500,190,accent,4)
    fill(c,poly([(360,170),(470,176),(470,186),(360,184)]),'#FFFFFF',4,alpha=140)
    for wx,r in [(120,42),(520,38)]: wheel(c,wx,r,'#E8ECF2')

MODELS = {
 'minik':   lambda c: hatch(c,'#3A86FF','#FFD23F'),
 'sedan':   lambda c: sedan(c,'#FF5A5F','#FFFFFF'),
 'taksi':   lambda c: sedan(c,'#FFD23F','#1A1D26','taksi'),
 'pikap':   lambda c: pickup(c,'#3BCE7A','#F4F1DE'),
 'minibus': lambda c: van(c,'#2EC4B6','#F4F1DE','minibus'),
 'jip':     lambda c: jeep(c,'#A0673F','#3BCE7A'),
 'polis':   lambda c: sedan(c,'#F4F7FB','#3A86FF','polis'),
 'ambulans':lambda c: van(c,'#F4F7FB','#FF5A5F','ambulans'),
 'klasik':  lambda c: beetle(c,'#9B5DE5','#F4F1DE'),
 'dondurma':lambda c: van(c,'#F15BB5','#FFFFFF','dondurma'),
 'karavan': lambda c: van(c,'#F4F1DE','#FF9F1C','karavan'),
 'okul':    lambda c: bus(c,'#FF9F1C','#1A1D26'),
 'itfaiye': lambda c: firetruck(c,'#E8453C','#F4F1DE'),
 'tir':     lambda c: semi(c,'#3A86FF','#FF5A5F'),
 'cabrio':  lambda c: convertible(c,'#2EC4B6','#FF9F1C'),
 'spor':    lambda c: sports(c,'#E8453C','#1A1D26','spor'),
 'limuzin': lambda c: limo(c,'#3A4152','#F2C94C'),
 'canavar': lambda c: monster(c,'#3BCE7A','#9B5DE5'),
 'f1':      lambda c: f1(c,'#E8453C','#FFFFFF'),
 'super':   lambda c: sports(c,'#FF9F1C','#1A1D26','super'),
 'roket':   lambda c: sports(c,'#9B5DE5','#56CCF2','roket'),
 'altin':   lambda c: sports(c,'#F2C94C','#FFFFFF','altin'),
}

# ---------- Yalnız market'te satılan özel arabalar ----------
def bolt(c, x, y, s, col):
    fill(c, poly([(x, y-s), (x-s*.55, y+s*.1), (x-s*.05, y+s*.1), (x-s*.25, y+s), (x+s*.55, y-s*.15), (x+s*.05, y-s*.15), (x+s*.25, y-s)]), col)

def elektrik(c):
    col, acc = '#2EC4B6', '#B8F35A'
    def over(c):
        bolt(c, 300, 186, 22, acc)
        rect(c, 84, 182, 96, 204, '#1A1D26', 3); line(c, [(90, 204), (70, 236), (40, 240)], '#1A1D26', 5)  # şarj kablosu
    prof=[(92,240),(86,190),(100,128),(160,96),(318,92),(392,140),(488,152),(524,176),(528,240)]
    win=[[(124,128),(166,106),(240,102),(240,144),(118,146)],[(250,102),(312,100),(372,142),(250,144)]]
    def L(c):
        lamp(c,508,170,20,16,'#E6FBFF'); lamp(c,88,160,14,22,'#FF4D4D')
        bumper(c,92,170,226,'#F4F7FB'); bumper(c,440,526,226,'#F4F7FB'); door(c,246,150,226,col)
        rect(c,96,206,524,214,acc,3); shine(c,[(110,170),(380,160),(500,162)])
    car_generic(c,col,prof,win,[(240,100,10,146)],[170,440],37,lights=L,extra={'over':over},rim='#E8ECF2')

def safari(c):
    jeep(c, '#D9B67A', '#5B7F3A')
    for k in range(5): rect(c, 150+k*60, 72, 180+k*60, 84, '#5B3A1E', 3)  # tavan bagajı
    rect(c, 140, 66, 430, 72, '#3B4252', 2)
    for x in (120, 250, 380): fill(c, poly([(x,176),(x+30,168),(x+60,176),(x+30,184)]), '#5B3A1E', alpha=170)  # zebra lekeleri

def cop(c):
    col='#3BAA5C'
    prof=[(30,240),(30,92),(430,92),(430,110),(470,110),(560,150),(604,168),(608,240)]
    win=[[(478,118),(520,118),(570,160),(478,160)]]
    def L(c):
        for k in range(7): rect(c,46+k*54,104,80+k*54,200,mix(col,.2,'#000000'),5)
        rect(c,30,206,608,214,'#F4F1DE',2); lamp(c,586,176,18,16,'#FFE066'); lamp(c,30,176,12,22,'#FF4D4D')
        rect(c,440,74,466,92,'#FF9F1C',5); bumper(c,32,140,226,'#3B4252'); bumper(c,500,608,226,'#3B4252')
        fill(c, skia.Path().addCircle(240,150,26), '#F4F1DE'); fill(c, poly([(228,160),(240,134),(252,160)]), col)  # geri dönüşüm işareti
    car_generic(c,col,prof,win,[],[120,300,520],40,lights=L,corner=14)

def vincli(c):
    pickup(c, '#FFB020', '#1A1D26')
    rect(c, 150, 120, 176, 168, '#3B4252', 4)  # vinç gövdesi
    line(c, [(162, 124), (60, 40)], '#FFD23F', 14); line(c, [(162, 124), (60, 40)], '#1A1D26', 3)
    line(c, [(62, 44), (62, 120)], '#1A1D26', 3); rect(c, 52, 118, 72, 130, '#1A1D26', 3)
    for k in range(5): rect(c, 40+k*52, 172, 66+k*52, 180, '#1A1D26' if k%2 else '#FFD23F', 2)

def pizza(c):
    hatch(c, '#E8453C', '#FFFFFF')
    rect(c, 150, 70, 300, 96, '#FFFFFF', 6); rect(c, 156, 74, 294, 92, '#E8453C', 4)
    fill(c, poly([(196,92),(226,76),(256,92)]), '#FFD23F'); fill(c, skia.Path().addCircle(222,86,3), '#E8453C'); fill(c, skia.Path().addCircle(236,88,3), '#3BAA5C')
    rect(c, 250, 188, 330, 214, '#FFFFFF', 8); rect(c, 258, 194, 322, 208, '#3BAA5C', 4)

def altin_taksi(c):
    sedan(c, '#F2C94C', '#1A1D26', 'taksi')
    for (sx,sy,s) in [(130,140,8),(470,132,7),(380,72,6)]:
        fill(c, poly([(sx,sy-s*2),(sx+s*.5,sy-s*.5),(sx+s*2,sy),(sx+s*.5,sy+s*.5),(sx,sy+s*2),(sx-s*.5,sy+s*.5),(sx-s*2,sy),(sx-s*.5,sy-s*.5)]), '#FFFFFF')

def ralli(c):
    sports(c, '#2962FF', '#FFFFFF', 'spor')
    rect(c, 60, 176, 600, 188, '#FFFFFF', 4); rect(c, 60, 192, 600, 198, '#E8453C', 3)
    fill(c, skia.Path().addCircle(320, 176, 26), '#FFFFFF'); fill(c, skia.Path().addCircle(320, 176, 20), '#1A1D26')
    for k in range(4): rect(c, 300+k*20, 94, 316+k*20, 104, '#FFE066', 4)  # tavan lambaları

def uzay(c):
    beetle(c, '#B8C0CC', '#56CCF2')
    p = skia.Paint(AntiAlias=True, Color=hx('#9FE7FF', 120)); c.drawCircle(265, 96, 80, p)
    p2 = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=4, Color=hx('#E6FBFF', 220)); c.drawCircle(265, 96, 80, p2)
    line(c, [(265, 16), (265, -2)], '#3B4252', 4); fill(c, skia.Path().addCircle(265, -2, 8), '#FF4FA8')
    for x in (130, 400): fill(c, skia.Path().addCircle(x, 214, 9), '#56CCF2')
    fl = poly([(80,206),(30,196),(56,212),(20,226),(80,222)]); fill(c, fl, '#56CCF2', alpha=200)

SPECIAL = {
 'elektrik': elektrik, 'safari': safari, 'cop': cop, 'vincli': vincli,
 'pizza': pizza, 'altintaksi': altin_taksi, 'ralli': ralli, 'uzay': uzay,
}
MODELS.update(SPECIAL)

def render(key, path, scale=1.0):
    s = skia.Surface(int(W*scale), int(H*scale))
    c = s.getCanvas(); c.clear(skia.ColorTRANSPARENT); c.scale(scale, scale)
    # sığdırma: tüm çizimler 0..640 arasında; biraz pay bırak
    if key in ('roket', 'uzay', 'vincli'):
        c.translate(W*0.08, 0); c.scale(0.9, 0.9); c.translate(0, H*0.1)
    else:
        c.translate(W*0.02, 0); c.scale(0.96, 1)
    MODELS[key](c)
    s.makeImageSnapshot().save(path, skia.kPNG)

if __name__ == '__main__':
    import os, sys
    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # NOT: assets/cars artık dışarıdan gelen gerçekçi görselleri tutuyor. Bu betik yalnız
    # açıkça istenen anahtarları oraya yazar: python3 scripts/make_cars.py --assets <ad> ...
    out = os.path.join(ROOT, 'assets', 'cars')
    if sys.argv[1:2] == ['--assets']:
        for k in sys.argv[2:]: render(k, os.path.join(out, f'{k}.png'), 0.8)
    os.makedirs('/home/claude/art/out', exist_ok=True)
    for k in MODELS: render(k, f'/home/claude/art/out/{k}.png')
    from PIL import Image
    keys=list(MODELS); cols=4
    sheet=Image.new('RGB',(cols*330, ((len(keys)+cols-1)//cols)*175),(22,38,61))
    for i,k in enumerate(keys):
        im=Image.open(f'/home/claude/art/out/{k}.png').resize((320,160))
        sheet.paste(im,((i%cols)*330+5,(i//cols)*175+5),im)
    sheet.save('/home/claude/art/sheet.png')
