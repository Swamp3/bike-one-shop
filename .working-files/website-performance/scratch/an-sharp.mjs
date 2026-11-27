const sharp = (await import('/Users/timo.alts/dev/bike-one-shop/website/node_modules/sharp/dist/index.mjs')).default;
// contact sheet of frames
const names = ['0.00','3.00','6.50','10.00','13.32'];
const tiles = await Promise.all(names.map(async (n) => sharp(`frames/f_${n}.png`).resize(480, 270).toBuffer()));
await sharp({ create: { width: 480*3, height: 270*2, channels: 3, background: '#fff' } }).composite(tiles.map((t,i)=>({ input: t, left: (i%3)*480, top: Math.floor(i/3)*270 }))).png().toFile('frames/sheet.png');
// first vs last frame diff (loop seam) and first frame vs poster
const raw = async (f, w=160,h=90) => (await sharp(f).resize(w,h,{fit:'fill'}).removeAlpha().raw().toBuffer());
const mad = (a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return (s/a.length).toFixed(1)};
const a = await raw('frames/f_0.00.png'), z = await raw('frames/f_13.32.png'), p = await raw('/Users/timo.alts/dev/bike-one-shop/website/src/assets/photos/hero.jpg');
console.log('mean abs diff (0-255) first vs last frame', mad(a,z), 'first frame vs poster', mad(a,p));
const st = async (f)=>{const s=await sharp(f).stats(); return s.channels.map(c=>c.mean.toFixed(0)).join(',')};
console.log('mean RGB first frame', await st('frames/f_0.00.png'), 'poster', await st('/Users/timo.alts/dev/bike-one-shop/website/src/assets/photos/hero.jpg'));
