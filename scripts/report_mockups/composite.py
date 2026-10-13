"""Composite real report screenshots into simple empty Pillow scenes, 800x597. Used by build.sh."""
import sys, random
from PIL import Image, ImageDraw, ImageFilter
S, OUT = sys.argv[1], sys.argv[2]
W, H, SS = 800, 597, 2  # final size, supersample
def scene(seed, top, bot):
    random.seed(seed); w, h = W*SS, H*SS
    bg = Image.new('RGB', (w, h)); d = ImageDraw.Draw(bg)
    for y in range(h):
        t = y/h; d.line([(0,y),(w,y)], fill=tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3)))
    grain = Image.new('L', (w//8, h)); gd = ImageDraw.Draw(grain)
    for y in range(h):
        v = 128 + int(random.gauss(0, 10)); gd.line([(0,y),(w//8,y)], fill=v)
    grain = grain.resize((w, h)).filter(ImageFilter.GaussianBlur(1.5))
    bg = Image.blend(bg, Image.merge('RGB', [grain]*3), 0.06)
    vig = Image.new('L', (w, h), 0); ImageDraw.Draw(vig).ellipse([-w*0.2, -h*0.3, w*1.2, h*1.3], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(120))
    return Image.composite(bg, Image.new('RGB', (w, h), tuple(int(c*0.55) for c in bot)), vig)
def place(bg, page, x, y, width, angle):
    p = page.convert('RGBA'); p = p.resize((width, int(p.height*width/p.width)), Image.LANCZOS)
    pr = p.rotate(angle, expand=True, resample=Image.BICUBIC)
    sh = Image.new('RGBA', pr.size, (0,0,0,0)); sh.putalpha(pr.split()[3].point(lambda a: int(a*0.55)))
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    bg.paste((20,10,5), (x+14, y+22), sh); bg.paste(pr, (x, y), pr)
def make(name, front, back, seed, top, bot):
    bg = scene(seed, top, bot)
    if back: place(bg, Image.open(f'{S}/shots/{back}.png'), 70*SS, 60*SS, 520*SS, 6)
    place(bg, Image.open(f'{S}/shots/{front}.png'), 215*SS, 38*SS, 540*SS, -3)
    bg.resize((W, H), Image.LANCZOS).save(f'{OUT}/{name}.jpg', quality=86, optimize=True, progressive=True)
wood=((150,104,70),(96,62,38)); slate=((88,92,96),(48,50,54)); linen=((214,200,180),(160,140,118)); oak=((176,132,90),(120,84,52)); walnut=((120,82,56),(70,46,30))
make('physician-guide', 'physician', 'cover', 1, *linen)
make('stall-breaker-protocol', 'stall', 'cover', 2, *slate)
make('kryptonite-kitchen', 'meal', 'cover', 3, *oak)
make('kryptonite-prep', 'grocery', 'meal', 4, *wood)
make('lab-reference', 'lab', 'physician', 5, *walnut)
