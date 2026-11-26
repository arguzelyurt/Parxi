# Dışarıdan (ör. yapay zekâyla) üretilen araba görselini oyuna uygun hâle getirir:
# yarı saydam pusu temizler, arabayı kırpar, 512x256 tuvale diğer arabalarla aynı hizada (zemin y=241) yerleştirir.
# Kullanım: python3 scripts/fit_car.py assets/cars/spor.png [başka.png ...]
import sys
from PIL import Image

W, H, GROUND, MAXW, MAXH = 512, 256, 241, 476, 158

for path in sys.argv[1:]:
    im = Image.open(path).convert('RGBA')
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v <= 24 else v)
    im = Image.merge('RGBA', (r, g, b, a))
    box = a.getbbox()
    if not box:
        print(path, ': görsel boş (saydam)'); continue
    car = im.crop(box)
    s = min(MAXW / car.width, MAXH / car.height)
    car = car.resize((round(car.width * s), round(car.height * s)), Image.LANCZOS)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(car, ((W - car.width) // 2, GROUND - car.height))
    out.save(path, optimize=True)
    print(path, '→', out.size, 'araba', car.size)
