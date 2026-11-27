// Builds sim/b/ (first-frame poster + video overlay) and sim/m/ (current mountain poster + video overlay) in the scratchpad copy of dist/.
import fs from 'node:fs';
const SP = process.argv[2];
const html = fs.readFileSync(`${SP}/pm/sim/index.html`, 'utf8');
const style = '<style>.hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;opacity:0;transition:opacity .6s ease}.hero-video.is-playing{opacity:1}.hero-video.freeze{transition:none}</style>';
const script = `<script>
(()=>{const v=document.querySelector('.hero-video');const P=new URLSearchParams(location.search);const S=window.__sim={frames:0,waits:0,t0:performance.now()};
const go=()=>{S.call=performance.now();v.src=P.get('file')||'/media/hero720.mp4';v.muted=true;v.defaultMuted=true;v.play().catch(e=>S.err=String(e));};
v.addEventListener('playing',()=>{S.playing??=performance.now();});
v.addEventListener('waiting',()=>{S.waits++;});
const rvfc=(now,meta)=>{S.frames++;if(S.first===undefined){S.first=now;S.firstMedia=meta.mediaTime;v.classList.add('is-playing');if(P.get('freeze')){v.pause();v.classList.add('freeze');S.frozen=true;}}if(!S.frozen)v.requestVideoFrameCallback(rvfc);};
v.requestVideoFrameCallback(rvfc);
const start=P.get('start')||'load';const kick=()=>{ if(start==='idle'){(window.requestIdleCallback||setTimeout)(go,{timeout:2000});} else go();};
if(start!=='none'){ if(document.readyState==='complete')kick(); else addEventListener('load',kick,{once:true}); }
})();
</script>`;
const video = '<video class="hero-video" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>';
const heroPicRe = /<picture[^>]*class="bg-pic"[^>]*>[\s\S]*?<\/picture>/;
const m = html.match(heroPicRe); if (!m) throw new Error('hero picture not found');
const ffImg = '<picture class="bg-pic"><img class="bg" src="/_astro/ff0_1440.avif" srcset="/_astro/ff0_640.avif 640w, /_astro/ff0_960.avif 960w, /_astro/ff0_1440.avif 1440w, /_astro/ff0_1920.avif 1920w" sizes="100vw" alt="" loading="eager" fetchpriority="high" decoding="async" width="1920" height="1080"></picture>';
const preloadRe = /<link rel="preload" as="image"[^>]*>/;
const ffPre = '<link rel="preload" as="image" type="image/avif" imagesrcset="/_astro/ff0_640.avif 640w, /_astro/ff0_960.avif 960w, /_astro/ff0_1440.avif 1440w, /_astro/ff0_1920.avif 1920w" imagesizes="100vw" fetchpriority="high">';
const build = (h, pic) => h.replace(heroPicRe, pic + video).replace('</head>', style + '</head>').replace('</body>', script + '</body>');
fs.mkdirSync(`${SP}/pm/sim/b`, { recursive: true }); fs.mkdirSync(`${SP}/pm/sim/m`, { recursive: true });
fs.writeFileSync(`${SP}/pm/sim/b/index.html`, build(html.replace(preloadRe, ffPre), ffImg));
fs.writeFileSync(`${SP}/pm/sim/m/index.html`, build(html, m[0]));
console.log('ok');
