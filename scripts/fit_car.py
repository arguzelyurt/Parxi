# Dışarıdan (ör. yapay zekâyla) üretilen araba görsellerini oyuna uygun hâle getirir:
#  - siyah (ya da düz renkli) arka planı kenarlardan başlayarak saydam yapar (araçtaki siyah parçalar korunur),
#  - yarı saydam pusu temizler, arabayı kırpar,
#  - istenirse yatay çevirir (araç sağa bakmalı),
#  - 768x384 tuvale diğer arabalarla aynı hizada (zemin çizgisi tabanın %94'ü) yerleştirir.
# Kullanım:
#   python3 scripts/fit_car.py assets/cars/taksi.png            # yerinde
#   python3 scripts/fit_car.py --flip assets/cars/f1.png        # sola bakıyorsa çevir
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

W, H = 768, 384
GROUND = int(H * 0.94)
MAXW, MAXH = int(W * 0.93), int(H * 0.62)
TH = 18  # bu parlaklığın altı "arka plan olabilir"


def cut_background(im: Image.Image) -> Image.Image:
    rgba = im.convert('RGBA')
    a = np.array(rgba)
    if (a[..., 3] < 250).mean() > 0.2:  # zaten saydam
        return rgba
    rgb = a[..., :3].astype(np.int16)
    corner = np.median(np.concatenate([rgb[:8, :8].reshape(-1, 3), rgb[-8:, -8:].reshape(-1, 3), rgb[:8, -8:].reshape(-1, 3), rgb[-8:, :8].reshape(-1, 3)]), axis=0)
    dist = np.abs(rgb - corner).max(axis=2)
    cand = dist <= TH
    lab, _ = ndimage.label(cand)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # kenar yumuşatma: arka plana komşu ince şeritte saydamlık renk farkına göre
    ring = ndimage.binary_dilation(bg, iterations=2) & ~bg
    alpha = np.where(bg, 0, 255).astype(np.float32)
    alpha[ring] = np.clip((dist[ring] - TH / 2) / (TH * 2) * 255, 0, 255)
    a[..., 3] = alpha.astype(np.uint8)
    return Image.fromarray(a, 'RGBA')


def fit(path: str, flip: bool, src: str | None = None):
    im = cut_background(Image.open(src or path))
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v <= 24 else v)
    im = Image.merge('RGBA', (r, g, b, a))
    box = a.getbbox()
    if not box:
        print(path, ': görsel boş'); return
    car = im.crop(box)
    s = min(MAXW / car.width, MAXH / car.height)
    car = car.resize((round(car.width * s), round(car.height * s)), Image.LANCZOS)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(car, ((W - car.width) // 2, GROUND - car.height))
    out.save(path, optimize=True)
    print(path, '→', out.size, 'araba', car.size, '(çevrildi)' if flip else '')


if __name__ == '__main__':
    flip = False
    for arg in sys.argv[1:]:
        if arg == '--flip':
            flip = True
            continue
        fit(arg, flip)
        flip = False
