'use strict';
/**
 * generator.js — CieloVista AI Website Generator
 */

const STYLE_CONFIG = {
  'dark-tech':   { imgStyle:'Cinematic, dramatic, volumetric lighting, dark atmospheric background, photorealistic', imgMood:'moody and technical, like a high-budget science documentary still' },
  'light-clean': { imgStyle:'Clean, bright, professional photography with soft natural lighting and white or light backgrounds', imgMood:'modern and approachable, like a premium product or tech company website' },
  'editorial':   { imgStyle:'Painterly, editorial photography style, warm tones, slightly desaturated, film grain', imgMood:'like a magazine feature in The Atlantic or National Geographic' },
  'interactive': { imgStyle:'Futuristic, neon-lit, cyberpunk aesthetic, deep black background, glowing cyan and purple accents', imgMood:'high-tech and visually striking, like concept art for a sci-fi game or tech startup' },
  'academic':    { imgStyle:'Scholarly, detailed illustration or archival-style photography, muted warm tones, precise and informative', imgMood:'authoritative and timeless, like an illustration from a university press textbook' },
  'minimal':     { imgStyle:'Ultra clean, minimal, high contrast black and white or very limited palette, lots of negative space', imgMood:'like a fine art photograph or a Dieter Rams product shot' },
};
const STYLE_THEME = { 'dark-tech':'dark','light-clean':'light','editorial':'slate','interactive':'neon-dreams','academic':'arctic','minimal':'noir' };
const STYLE_DESCRIPTIONS = {
  'dark-tech':   'cinematic, dark, high-contrast — best for science, space, technology, nature, danger, mystery',
  'light-clean': 'bright, professional, modern — best for business, health, lifestyle, products, finance',
  'editorial':   'warm, magazine-style — best for culture, arts, travel, food, human interest',
  'interactive': 'neon, cyberpunk, glowing — best for gaming, software, AI, futurism, nightlife',
  'academic':    'scholarly, muted, textbook — best for history, philosophy, research, formal science',
  'minimal':     'ultra-clean, high contrast — best for design, architecture, photography, luxury',
};
const LAYOUT_DESCRIPTIONS = {
  'classic':  'centered editorial stack — works for any subject',
  'magazine': 'split-column editorial with scrolling concepts — great for culture, arts, detailed articles',
  'landing':  'hero-first with alternating sections — great for products, software, campaigns',
  'academic': 'dense sidebar layout with numbered sections — great for history, science, philosophy, research',
  'showcase': 'visual-first masonry grid — great for nature, design, photography, art, space',
};

const FALLBACK_DARK_VARS = `
:root,[data-theme="dark"]{
  --primary:hsl(240,70%,50%);--secondary:hsl(60,60%,50%);--accent:hsl(210,60%,50%);
  --primary-rgb:99,102,241;
  --bg-color:hsl(220,25%,10%);--bg-primary:hsl(220,25%,15%);--bg-secondary:hsl(220,20%,20%);
  --text-primary:hsl(220,15%,95%);--text-secondary:hsl(220,10%,80%);--text-muted:hsl(220,10%,60%);
  --border-color:hsl(220,15%,25%);
  --warning-color:hsl(45,93%,47%);--success-color:hsl(142,71%,45%);--danger-color:hsl(0,84%,60%);
  --radius-sm:4px;--radius-md:8px;--radius-lg:12px;--radius-xl:16px;
}`;

const WB_NORMALIZE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{line-height:1.15;-webkit-text-size-adjust:100%;tab-size:4;scrollbar-gutter:stable}
@media(prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
img,picture,video,canvas,svg{display:block;max-width:100%}img{height:auto}
input,button,textarea,select{font:inherit}button{background:transparent;border:none;padding:0;cursor:pointer}
[hidden]{display:none!important}
`;

const SHARED_CSS = `
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
body{background:var(--bg-color);color:var(--text-primary);font-size:16px;line-height:1.7}
.shimmer{background:linear-gradient(90deg,var(--bg-primary) 25%,var(--bg-secondary) 50%,var(--bg-primary) 75%);background-size:200% 100%;animation:shimmer 1.8s infinite}
.c-primary,.dc-primary,.mc-primary,.sc-primary{--cv-color:var(--primary)}
.c-secondary,.dc-secondary,.mc-secondary,.sc-secondary{--cv-color:var(--secondary)}
.c-accent,.dc-accent,.mc-accent,.sc-accent{--cv-color:var(--accent)}
.c-primary-light,.dc-primary-light,.mc-primary-light,.sc-primary-light{--cv-color:var(--primary-light,var(--primary))}
.c-secondary-light,.dc-secondary-light,.mc-secondary-light,.sc-secondary-light{--cv-color:var(--secondary-light,var(--secondary))}
.c-accent-light,.dc-accent-light,.mc-accent-light,.sc-accent-light{--cv-color:var(--accent-light,var(--accent))}
.c-primary-dark,.dc-primary-dark,.mc-primary-dark,.sc-primary-dark{--cv-color:var(--primary-dark,var(--primary))}
.c-secondary-dark,.dc-secondary-dark,.mc-secondary-dark,.sc-secondary-dark{--cv-color:var(--secondary-dark,var(--secondary))}
.c-accent-dark,.dc-accent-dark,.mc-accent-dark,.sc-accent-dark{--cv-color:var(--accent-dark,var(--accent))}
.c-blue,.dc-blue,.mc-blue,.sc-blue{--cv-color:var(--primary)}
.c-purple,.dc-purple,.mc-purple,.sc-purple{--cv-color:var(--secondary)}
.c-coral,.dc-coral,.mc-coral,.sc-coral{--cv-color:var(--accent)}
.c-amber,.dc-amber,.mc-amber,.sc-amber{--cv-color:var(--primary-light,var(--warning-color,var(--primary)))}
.c-teal,.dc-teal,.mc-teal,.sc-teal{--cv-color:var(--secondary-light,var(--success-color,var(--secondary)))}
.c-green,.dc-green,.mc-green,.sc-green{--cv-color:var(--accent-light,var(--success-color,var(--accent)))}
.c-pink,.dc-pink,.mc-pink,.sc-pink{--cv-color:var(--accent-dark,var(--danger-color,var(--accent)))}
.concept-card[class*=" c-"],.concept-chip[class*=" c-"]{border-top:3px solid var(--cv-color)}
.concept-card[class*=" c-"] h3,.concept-chip[class*=" c-"] h3{color:var(--cv-color)}
.detail-card[class*=" dc-"] .card-accent-line,.masonry-card[class*=" mc-"] .masonry-card-accent{background:var(--cv-color)}
.detail-card[class*=" dc-"] .card-num,.detail-card[class*=" dc-"] .alt-card-num,.card-row-item[class*=" dc-"] .card-row-num,.masonry-card[class*=" mc-"] .mc-num{color:var(--cv-color)}
.quote-block{padding:28px 36px;border-left:3px solid var(--secondary);background:var(--bg-primary);border-radius:0 var(--radius-lg,12px) var(--radius-lg,12px) 0;margin-bottom:18px}
.quote-block blockquote{font-size:1.08rem;font-style:italic;line-height:1.75;margin-bottom:8px;color:var(--text-primary)}
.quote-block cite{font-size:.82rem;color:var(--text-muted);font-style:normal}
.faq-item{border-bottom:1px solid var(--border-color);padding:18px 0}
.faq-item:first-child{border-top:1px solid var(--border-color)}
.faq-q{font-size:.96rem;font-weight:700;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px;color:var(--text-primary)}
.faq-q::before{content:'Q';font-size:.72rem;font-weight:800;color:var(--secondary);background:var(--bg-primary);border:1px solid var(--secondary);border-radius:4px;padding:1px 5px;flex-shrink:0;margin-top:3px}
.faq-a{font-size:.88rem;color:var(--text-muted);line-height:1.7;padding-left:28px}
.tl-item{display:flex;gap:18px;margin-bottom:24px;padding:14px;border-radius:var(--radius-md,8px);border:1px solid transparent;transition:border-color .2s,background .2s}
.tl-item:hover{border-color:var(--border-color);background:var(--bg-primary)}
.tl-year{flex-shrink:0;width:54px;font-size:.8rem;font-weight:700;color:var(--secondary);padding-top:3px;text-align:right}
.tl-connector{flex-shrink:0;display:flex;flex-direction:column;align-items:center}
.tl-dot{width:10px;height:10px;border-radius:50%;background:var(--secondary);margin-top:4px;flex-shrink:0}
.tl-line{width:1px;flex:1;background:var(--border-color);min-height:18px;margin-top:5px}
.tl-body h4{font-size:.92rem;font-weight:700;margin-bottom:4px;color:var(--text-primary)}
.tl-body p{font-size:.84rem;color:var(--text-muted);line-height:1.6}
footer{text-align:center;padding:36px 24px;border-top:1px solid var(--border-color);color:var(--text-muted);font-size:.86rem}
#wb-theme-switcher{position:fixed;bottom:20px;right:20px;z-index:9999}
.chord-diagram-wrap{display:flex;justify-content:center;align-items:center;padding:14px 8px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color)}
.wb-themecontrol__wrapper{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-lg,12px);padding:6px 10px;box-shadow:0 4px 20px rgba(0,0,0,.4)}
.wb-themecontrol__select{background:var(--bg-secondary)!important;color:var(--text-primary)!important;border-color:var(--border-color)!important;font-size:.8rem!important;min-width:130px!important}
`;

const LAYOUT_CSS_CLASSIC = `
header{text-align:center;padding:72px 24px 56px;background:radial-gradient(ellipse at 50% 0%,rgba(var(--primary-rgb),.1) 0%,transparent 70%);border-bottom:1px solid var(--border-color)}
.kicker{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--secondary);margin-bottom:16px}
h1{font-size:clamp(2rem,5vw,3.4rem);font-weight:700;background:linear-gradient(135deg,var(--primary) 0%,var(--secondary) 50%,var(--accent) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.2;margin-bottom:16px}
header>p{max-width:620px;margin:0 auto;color:var(--text-muted);font-size:1.08rem}
.hero-img-wrap{overflow:hidden;max-height:460px}.hero-img-wrap img{width:100%;height:460px;object-fit:cover}
.hero-img-stub{width:100%;height:460px}
main{max-width:1100px;margin:0 auto;padding:0 24px 80px}
section{margin:64px 0}
section>h2{font-size:1.6rem;font-weight:700;margin-bottom:24px;border-left:3px solid var(--primary);padding-left:16px;color:var(--text-primary)}
.intro p{font-size:1.05rem;line-height:1.85;color:var(--text-primary);margin-bottom:18px;max-width:780px}
.concepts-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.concept-card{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-lg,12px);padding:24px;transition:border-color .2s,transform .15s}
.concept-card:hover{transform:translateY(-2px)}
.concept-card h3{font-size:1rem;font-weight:700;margin-bottom:8px}
.concept-card p{font-size:.88rem;color:var(--text-muted);line-height:1.65}
.cards-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.detail-card{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-lg,12px);overflow:hidden;transition:border-color .2s,transform .15s}
.detail-card:hover{border-color:var(--secondary);transform:translateY(-2px)}
.card-img{width:100%;height:160px;object-fit:cover}.card-img-stub{width:100%;height:160px}
.card-body{padding:20px}.card-accent-line{height:3px;width:100%}
.card-num{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;opacity:.8}
.detail-card h3{font-size:1rem;font-weight:700;margin-bottom:8px;color:var(--text-primary)}
.detail-card p{font-size:.88rem;color:var(--text-muted);line-height:1.6}
`;

const LAYOUT_CSS_MAGAZINE = `
.mag-header{display:grid;grid-template-columns:3fr 2fr;gap:40px;align-items:end;max-width:1100px;margin:0 auto;padding:48px 24px 40px;border-bottom:1px solid var(--border-color)}
.mag-header-left .kicker{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--secondary);margin-bottom:12px}
.mag-header-left h1{font-size:clamp(1.8rem,4vw,3rem);font-weight:700;background:linear-gradient(135deg,var(--primary),var(--secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.2}
.mag-header-right{padding-bottom:6px}
.mag-tagline{font-size:1rem;color:var(--text-secondary);line-height:1.7;margin-bottom:12px}
.mag-meta{font-size:.78rem;color:var(--secondary);text-transform:uppercase;letter-spacing:.1em}
.hero-img-wrap{overflow:hidden;max-height:380px}.hero-img-wrap img{width:100%;height:380px;object-fit:cover}
.hero-img-stub{width:100%;height:380px}
main{max-width:1100px;margin:0 auto;padding:0 24px 80px}
section{margin:48px 0}
section>h2{font-size:1.3rem;font-weight:700;margin-bottom:20px;border-left:3px solid var(--primary);padding-left:14px;color:var(--text-primary)}
.intro-2col{column-count:2;column-gap:48px}
.intro-2col p{font-size:.97rem;line-height:1.85;color:var(--text-primary);margin-bottom:14px;break-inside:avoid}
.concepts-strip{display:flex;gap:16px;overflow-x:auto;padding-bottom:14px;scrollbar-width:thin}
.concept-chip{flex-shrink:0;min-width:220px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-lg,12px);padding:18px 20px;transition:border-color .2s,transform .15s}
.concept-chip:hover{transform:translateY(-2px)}
.concept-chip h3{font-size:.9rem;font-weight:700;margin-bottom:6px}
.concept-chip p{font-size:.82rem;color:var(--text-muted);line-height:1.6}
.cards-featured{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.detail-card{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-lg,12px);overflow:hidden;transition:border-color .2s,transform .15s}
.detail-card:hover{border-color:var(--secondary);transform:translateY(-2px)}
.card-img{width:100%;height:160px;object-fit:cover}.card-img-stub{width:100%;height:160px}
.card-body{padding:20px}.card-accent-line{height:3px;width:100%}
.card-num{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;opacity:.8}
.detail-card h3{font-size:1rem;font-weight:700;margin-bottom:8px;color:var(--text-primary)}
.detail-card p{font-size:.88rem;color:var(--text-muted);line-height:1.6}
@media(max-width:640px){.mag-header{grid-template-columns:1fr}.intro-2col{column-count:1}.cards-featured{grid-template-columns:1fr}}
`;

const LAYOUT_CSS_LANDING = `
.landing-header{text-align:center;padding:88px 24px 64px;background:radial-gradient(ellipse at 50% 0%,rgba(var(--primary-rgb),.16) 0%,transparent 65%);border-bottom:1px solid var(--border-color)}
.landing-header .kicker{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--secondary);margin-bottom:20px}
.landing-header h1{font-size:clamp(2.4rem,6vw,4.4rem);font-weight:800;background:linear-gradient(135deg,var(--primary),var(--secondary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.15;margin-bottom:20px}
.landing-header>p{max-width:640px;margin:0 auto;color:var(--text-muted);font-size:1.1rem;line-height:1.7}
.hero-img-wrap{overflow:hidden;max-height:520px}.hero-img-wrap img{width:100%;height:520px;object-fit:cover}
.hero-img-stub{width:100%;height:520px}
main{max-width:1100px;margin:0 auto;padding:0 24px 80px}
.concepts-pills-section{padding:56px 0 40px;text-align:center}
.concepts-pills-section>h2{font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--text-muted);margin-bottom:28px}
.pills-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.concept-pill{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:28px;padding:10px 22px;transition:border-color .2s,transform .15s;cursor:default}
.concept-pill:hover{transform:translateY(-2px)}
.concept-pill[class*=" c-"]{border-color:var(--cv-color)}
.concept-pill[class*=" c-"] .pill-name{color:var(--cv-color)}
.pill-name{font-size:.86rem;font-weight:700;display:block;margin-bottom:2px}
.pill-body{font-size:.76rem;color:var(--text-muted)}
.alt-cards-section{padding:32px 0}
.alt-cards-section>h2{font-size:1.4rem;font-weight:700;margin-bottom:32px;border-left:3px solid var(--primary);padding-left:14px;color:var(--text-primary)}
.alt-card{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--border-color);border-radius:var(--radius-xl,16px);overflow:hidden;margin-bottom:20px;transition:border-color .2s}
.alt-card:hover{border-color:var(--secondary)}
.alt-card.flip{direction:rtl}.alt-card.flip>*{direction:ltr}
.alt-card-media{overflow:hidden}
.alt-card-img{width:100%;height:280px;object-fit:cover;display:block}
.alt-card-img-stub{width:100%;height:280px}
.alt-card-body{padding:36px;display:flex;flex-direction:column;justify-content:center;background:var(--bg-primary)}
.alt-card-num{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;opacity:.75}
.alt-card-body h3{font-size:1.25rem;font-weight:700;margin-bottom:14px;color:var(--text-primary)}
.alt-card-body p{font-size:.92rem;color:var(--text-muted);line-height:1.75}
.overview-box{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-xl,16px);padding:40px;margin:48px 0}
.overview-box>h2{font-size:1.3rem;font-weight:700;margin-bottom:24px;border-left:3px solid var(--primary);padding-left:14px;color:var(--text-primary)}
.overview-box p{font-size:.99rem;line-height:1.85;color:var(--text-primary);margin-bottom:16px;max-width:760px}
section{margin:48px 0}
section>h2{font-size:1.3rem;font-weight:700;margin-bottom:20px;border-left:3px solid var(--primary);padding-left:14px;color:var(--text-primary)}
@media(max-width:640px){.alt-card,.alt-card.flip{grid-template-columns:1fr;direction:ltr}.alt-card-img,.alt-card-img-stub{height:200px}}
`;

const LAYOUT_CSS_ACADEMIC = `
.academic-header{padding:28px 24px 24px;border-bottom:2px solid var(--border-color);max-width:1100px;margin:0 auto}
.academic-header .kicker{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--secondary);margin-bottom:8px}
.academic-header h1{font-size:clamp(1.4rem,3vw,2.3rem);font-weight:700;color:var(--text-primary);margin-bottom:8px;line-height:1.3}
.academic-header>p{font-size:.93rem;color:var(--text-muted);max-width:680px}
main{max-width:1100px;margin:0 auto;padding:0 24px 80px}
.sidebar-section{display:grid;grid-template-columns:220px 1fr;gap:48px;padding:36px 0;border-bottom:1px solid var(--border-color)}
.tl-sidebar-label{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--secondary);margin-bottom:18px}
.tl-sidebar-item{display:grid;grid-template-columns:36px 10px 1fr;gap:0 8px;margin-bottom:16px;align-items:start}
.tl-s-year{font-size:.72rem;font-weight:700;color:var(--secondary);text-align:right;padding-top:2px}
.tl-s-dot{width:8px;height:8px;border-radius:50%;background:var(--secondary);margin-top:3px;flex-shrink:0}
.tl-s-body h4{font-size:.76rem;font-weight:700;color:var(--text-primary);margin-bottom:2px}
.tl-s-body p{font-size:.72rem;color:var(--text-muted);line-height:1.5}
.overview-main p{font-size:.97rem;line-height:1.85;color:var(--text-primary);margin-bottom:16px}
.concepts-numbered-section{padding:32px 0;border-bottom:1px solid var(--border-color)}
.section-label{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--secondary);margin-bottom:16px}
.concept-row{display:grid;grid-template-columns:44px 1fr;gap:14px;padding:14px 0;border-bottom:1px solid var(--border-color)}
.concept-row:first-of-type{border-top:1px solid var(--border-color)}
.concept-row-num{font-size:1.5rem;font-weight:800;line-height:1;color:var(--border-color)}
.concept-row[class*=" c-"] .concept-row-num{color:var(--cv-color)}
.concept-row h3{font-size:.93rem;font-weight:700;margin-bottom:4px;color:var(--text-primary)}
.concept-row p{font-size:.85rem;color:var(--text-muted);line-height:1.6}
.cards-rows-section{padding:32px 0;border-bottom:1px solid var(--border-color)}
.card-row-item{display:grid;grid-template-columns:180px 1fr;gap:20px;padding:18px 0;border-bottom:1px solid var(--border-color);align-items:start}
.card-row-item:first-of-type{border-top:1px solid var(--border-color)}
.card-row-img{width:180px;height:110px;object-fit:cover;border-radius:var(--radius-md,8px);display:block}
.card-row-img-stub{width:180px;height:110px;border-radius:var(--radius-md,8px)}
.card-row-num{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;opacity:.75}
.card-row-body h3{font-size:.95rem;font-weight:700;margin-bottom:7px;color:var(--text-primary)}
.card-row-body p{font-size:.86rem;color:var(--text-muted);line-height:1.65}
section{margin:32px 0}
section>h2{font-size:1.1rem;font-weight:700;margin-bottom:14px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary)}
@media(max-width:640px){.sidebar-section{grid-template-columns:1fr}.card-row-item{grid-template-columns:1fr}}
`;

const LAYOUT_CSS_SHOWCASE = `
.showcase-header{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid var(--border-color);max-width:1100px;margin:0 auto}
.showcase-header-left h1{font-size:clamp(1.2rem,2.5vw,1.9rem);font-weight:800;background:linear-gradient(135deg,var(--primary),var(--secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.2;margin:0}
.showcase-header-right{text-align:right}
.showcase-kicker{font-size:.76rem;color:var(--secondary);text-transform:uppercase;letter-spacing:.14em}
.showcase-tagline{font-size:.86rem;color:var(--text-muted);margin-top:4px;max-width:320px}
main{max-width:1100px;margin:0 auto;padding:0 24px 80px}
.masonry-section{padding:40px 0;border-bottom:1px solid var(--border-color)}
.section-label{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--secondary);margin-bottom:20px}
.masonry-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:start}
.masonry-card{break-inside:avoid;margin-bottom:20px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-lg,12px);overflow:hidden;transition:border-color .2s,transform .15s}
.masonry-card:hover{border-color:var(--secondary);transform:translateY(-2px)}
.masonry-card:nth-child(odd) .masonry-card-img{height:200px}
.masonry-card:nth-child(even) .masonry-card-img{height:140px}
.masonry-card-img{width:100%;object-fit:cover;display:block}
.masonry-card:nth-child(odd) .masonry-card-img-stub{height:200px}
.masonry-card:nth-child(even) .masonry-card-img-stub{height:140px}
.masonry-card-img-stub{width:100%}
.masonry-card-accent{height:3px;width:100%}
.masonry-card-body{padding:18px}
.mc-num{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:7px;opacity:.8}
.masonry-card h3{font-size:.96rem;font-weight:700;margin-bottom:7px;color:var(--text-primary)}
.masonry-card p{font-size:.86rem;color:var(--text-muted);line-height:1.6}
.overview-2col-section{padding:40px 0;border-bottom:1px solid var(--border-color)}
.overview-2col{column-count:2;column-gap:48px}
.overview-2col p{font-size:.97rem;line-height:1.85;color:var(--text-primary);margin-bottom:14px;break-inside:avoid}
.concepts-bottom{padding:32px 0;border-bottom:1px solid var(--border-color)}
.showcase-pills{display:flex;flex-wrap:wrap;gap:10px}
.showcase-pill{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-md,8px);padding:8px 14px;font-size:.82rem}
.showcase-pill{border-left:2px solid transparent}
[class*=" sc-"] .showcase-pill{border-left-color:var(--cv-color)}
[class*=" sc-"] .sp-name{color:var(--cv-color)}
.sp-name{font-weight:700;color:var(--text-primary);margin-right:5px}
.sp-body{color:var(--text-muted)}
section{margin:40px 0}
section>h2{font-size:1.3rem;font-weight:700;margin-bottom:20px;border-left:3px solid var(--primary);padding-left:14px;color:var(--text-primary)}
@media(max-width:640px){.showcase-header{flex-direction:column;align-items:flex-start;gap:8px}.overview-2col{column-count:1}}
`;

const AUDIENCE_DESC = {
  general:   'a curious general audience with no specialist background',
  technical: 'a technical expert audience who appreciates depth and precision',
  students:  'students and beginners who need concepts explained from first principles',
  business:  'a business or professional audience focused on practical implications',
};
const SECTION_DESC = {
  overview: 'introduction: 4 substantial paragraphs of real informative content (no intro sentence like "In this article...")',
  concepts: 'concepts: exactly 6 named concepts in 2 rows of 3, each with a unique color. Each concept body MUST include a concrete real-world example.',
  timeline: 'timeline: 6 real chronological milestones with accurate years',
  cards:    'cards: MINIMUM 6 detail cards, always a multiple of 3 (6, 9, or 12). Each card covers ground NOT already covered in concepts.',
  quote:    'quotes: 1-2 real or plausible attributed quotes that illuminate the subject',
  faq:      'faq: 5 questions phrased exactly as a real person would type into Google',
};
const BANNED_PHRASES = [
  'in conclusion','it is worth noting','delve into','in the realm of',
  "it's important to",'at the end of the day','game changer','paradigm shift',
  'leverage','synergy','unlock the potential','dive deep',"in today's world",
  'fascinating subject','throughout history','since the dawn of',
];

// ─── Chord diagram support ────────────────────────────────────────────────────

function isMusicSubject(subject, desc) {
  return /guitar|chord|music theory|\bmode\b|modes|scale|arpeggio|harmony|key of|barre|fretboard|tablature|\btab\b|blues|jazz|pentatonic|triad|interval|dominant|diminished|augmented|diatonic/i
    .test((subject || '') + ' ' + (desc || ''));
}

const _CHORD_NAMES = [
  'Cmaj7','Amaj7','Emaj7','Gmaj7','Dmaj7','Fmaj7','Bbmaj7','Ebmaj7',
  'Bm7','Am7','Em7','Dm7','Cm7','Fm7','Gm7',
  'G7','E7','A7','D7','B7','C7','F7','Bb7','Eb7',
  'Bdim','Cdim','Ddim','Fdim','Gdim',
  'Bm','Am','Em','Dm','Cm','Fm','Gm',
  'G','A','E','D','C','F','B',
];

// Mode → chord quality mapping (determines major/minor/dim character of the triad)
const _MODE_QUALITY = {
  ionian: 'major', lydian: 'major', mixolydian: 'major',
  dorian: 'minor', phrygian: 'minor', aeolian: 'minor',
  locrian: 'dim',
};

// Given a card title/body, detect if it's about a named mode and return the
// correct chord (root triad) for that mode, e.g. "Dorian Mode: D E F G A B C" → "Dm"
function extractModeChord(text) {
  var t = String(text || '');
  var modeMatch = t.match(/\b(ionian|dorian|phrygian|lydian|mixolydian|aeolian|locrian)\b/i);
  if (!modeMatch) return null;
  var quality = _MODE_QUALITY[modeMatch[1].toLowerCase()];
  if (!quality) return null;
  // Root note: first note letter right after "Mode:" or the first single note in a scale run
  var rootMatch = t.match(/mode\s*:\s*([A-G]b?)\s/i) || t.match(/(?:^|\s)([A-G]b?)\s+[A-G]b?\s+[A-G]b?/);
  if (!rootMatch) return null;
  var root = rootMatch[1].charAt(0).toUpperCase() + rootMatch[1].slice(1);
  if (quality === 'major') return _CL[root]       ? root       : null;
  if (quality === 'minor') return _CL[root + 'm'] ? root + 'm' : null;
  if (quality === 'dim')   return _CL[root + 'dim'] ? root + 'dim' : null;
  return null;
}

function extractChordName(text) {
  const t = String(text || '');
  // Skip single-letter chord matching if text looks like a scale spelling
  // e.g. "Ionian Mode: C D E F G A B" should NOT match chord G
  const isScaleSpelling = /(?:[A-G]b?\s+){3,}[A-G]b?/.test(t);
  for (const name of _CHORD_NAMES) {
    if (isScaleSpelling && /^[A-G]$/.test(name)) continue;
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, function(c) { return '\\' + c; });
    if (new RegExp('(?:^|[^A-Za-z#b])' + safe + '(?:[^A-Za-z#b0-9]|$)').test(t)) { return name; }
  }
  return null;
}

const _CD = {
  '1':  {fill:'#1D9E75',text:'#fff'}, '3':  {fill:'#BA7517',text:'#fff'},
  'b3': {fill:'#BA7517',text:'#fff'}, '5':  {fill:'#378ADD',text:'#fff'},
  'b5': {fill:'#378ADD',text:'#fff'}, '7':  {fill:'#D85A30',text:'#fff'},
  'b7': {fill:'#D85A30',text:'#fff'}, 'maj7':{fill:'#7F77DD',text:'#fff'},
};

const _CL = {
  E:    {fret:0,muted:[],   open:[1], fingers:[{s:5,f:2,deg:'5'},{s:4,f:2,deg:'1'},{s:3,f:1,deg:'3'}]},
  A:    {fret:0,muted:[6],  open:[1], fingers:[{s:4,f:2,deg:'5'},{s:3,f:2,deg:'1'},{s:2,f:2,deg:'3'}]},
  D:    {fret:0,muted:[6,5],open:[],  fingers:[{s:3,f:2,deg:'1'},{s:2,f:3,deg:'3'},{s:1,f:2,deg:'5'}]},
  G:    {fret:0,muted:[],   open:[],  fingers:[{s:6,f:3,deg:'1'},{s:5,f:2,deg:'3'},{s:1,f:3,deg:'1'}]},
  C:    {fret:0,muted:[6],  open:[],  fingers:[{s:5,f:3,deg:'1'},{s:4,f:2,deg:'5'},{s:2,f:1,deg:'3'}]},
  F:    {fret:1,muted:[],   open:[],  barre:{f:1,from:6,to:1}, fingers:[{s:5,f:3,deg:'5'},{s:4,f:3,deg:'1'},{s:3,f:2,deg:'3'}]},
  Em:   {fret:0,muted:[],   open:[1], fingers:[{s:5,f:2,deg:'5'},{s:4,f:2,deg:'1'}]},
  Am:   {fret:0,muted:[6],  open:[1], fingers:[{s:4,f:2,deg:'5'},{s:3,f:2,deg:'1'},{s:2,f:1,deg:'b3'}]},
  Dm:   {fret:0,muted:[6,5],open:[],  fingers:[{s:3,f:2,deg:'1'},{s:2,f:3,deg:'b3'},{s:1,f:1,deg:'5'}]},
  Bm:   {fret:2,muted:[6],  open:[],  barre:{f:2,from:5,to:1}, fingers:[{s:4,f:4,deg:'5'},{s:3,f:4,deg:'1'},{s:2,f:3,deg:'b3'}]},
  G7:   {fret:0,muted:[],   open:[],  deg:true, fingers:[{s:6,f:3,deg:'1'},{s:5,f:2,deg:'3'},{s:1,f:1,deg:'b7'}]},
  E7:   {fret:0,muted:[],   open:[1], deg:true, fingers:[{s:5,f:2,deg:'5'},{s:3,f:1,deg:'b7'}]},
  A7:   {fret:0,muted:[6],  open:[1], deg:true, fingers:[{s:4,f:2,deg:'5'},{s:2,f:2,deg:'3'}]},
  D7:   {fret:0,muted:[6,5],open:[],  deg:true, fingers:[{s:3,f:2,deg:'1'},{s:1,f:2,deg:'5'},{s:2,f:1,deg:'3'},{s:4,f:1,deg:'b7'}]},
  B7:   {fret:0,muted:[6],  open:[],  deg:true, fingers:[{s:5,f:2,deg:'1'},{s:3,f:2,deg:'5'},{s:1,f:2,deg:'b7'},{s:2,f:3,deg:'3'}]},
  C7:   {fret:0,muted:[6],  open:[],  deg:true, fingers:[{s:5,f:3,deg:'1'},{s:4,f:2,deg:'5'},{s:2,f:1,deg:'3'},{s:3,f:3,deg:'b7'}]},
  Cmaj7:{fret:0,muted:[6],  open:[],  deg:true, fingers:[{s:5,f:3,deg:'1'},{s:4,f:2,deg:'5'},{s:2,f:1,deg:'3'}]},
  Amaj7:{fret:0,muted:[6],  open:[1], deg:true, fingers:[{s:4,f:2,deg:'5'},{s:3,f:2,deg:'1'},{s:2,f:1,deg:'3'}]},
  Emaj7:{fret:0,muted:[],   open:[1], deg:true, fingers:[{s:5,f:2,deg:'5'},{s:4,f:1,deg:'maj7'},{s:3,f:1,deg:'3'}]},
  Gmaj7:{fret:0,muted:[],   open:[],  deg:true, fingers:[{s:6,f:3,deg:'1'},{s:5,f:2,deg:'3'},{s:1,f:2,deg:'maj7'}]},
  Am7:  {fret:0,muted:[6],  open:[1], deg:true, fingers:[{s:4,f:2,deg:'5'},{s:2,f:1,deg:'b3'}]},
  Em7:  {fret:0,muted:[],   open:[1], deg:true, fingers:[{s:5,f:2,deg:'5'},{s:4,f:2,deg:'1'},{s:2,f:3,deg:'b7'}]},
  Dm7:  {fret:0,muted:[6,5],open:[],  deg:true, fingers:[{s:3,f:2,deg:'1'},{s:2,f:1,deg:'b3'},{s:1,f:1,deg:'5'},{s:4,f:1,deg:'b7'}]},
  Bm7:  {fret:2,muted:[6],  open:[],  deg:true, barre:{f:2,from:5,to:1}, fingers:[{s:4,f:4,deg:'5'},{s:3,f:4,deg:'b7'},{s:2,f:3,deg:'b3'}]},
};

// Note spellings shown above each chord diagram
const _CHORD_NOTES = {
  E:'E·G#·B', A:'A·C#·E', D:'D·F#·A', G:'G·B·D', C:'C·E·G', F:'F·A·C',
  Em:'E·G·B', Am:'A·C·E', Dm:'D·F·A', Bm:'B·D·F#',
  G7:'G·B·D·F', E7:'E·G#·B·D', A7:'A·C#·E·G', D7:'D·F#·A·C',
  B7:'B·D#·F#·A', C7:'C·E·G·Bb',
  Cmaj7:'C·E·G·B', Amaj7:'A·C#·E·G#', Emaj7:'E·G#·B·D#', Gmaj7:'G·B·D·F#',
  Am7:'A·C·E·G', Em7:'E·G·B·D', Dm7:'D·F·A·C', Bm7:'B·D·F#·A',
};

function drawChordSvg(name) {
  var ch = _CL[name]; if (!ch) return null;
  // H=183 — extra 28px at top for degree label row + note spelling row
  var W=120,H=183,sl=16,st=58,gw=84,gh=92,XS=gw/5,YS=gh/4;
  var ink='#c8cad4';
  var dotDef = {fill:'#c8cad4', text:'#1a1a18'};
  function _dot(cx,cy,r,fill,tc,label){
    var d=label==='maj7'?'M7':label==='b3'?'&#9837;3':label==='b5'?'&#9837;5':label==='b7'?'&#9837;7':(label||'');
    var s='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+fill+'"/>';
    if(label) s+='<text x="'+cx+'" y="'+cy+'" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" font-family="sans-serif" fill="'+tc+'">'+d+'</text>';
    return s;
  }
  var s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">';

  // ── Note spelling header ────────────────────────────────────────────────
  var degLabel = ch.deg ? '1 · 3 · 5 · 7' : '1 · 3 · 5';
  var noteStr  = _CHORD_NOTES[name] || '';
  s += '<text x="'+(W/2)+'" y="11" text-anchor="middle" font-size="8" font-family="sans-serif" fill="'+ink+'" opacity=".5">'+degLabel+'</text>';
  if (noteStr) {
    s += '<text x="'+(W/2)+'" y="26" text-anchor="middle" font-size="10" font-weight="600" font-family="sans-serif" fill="'+ink+'">'+noteStr+'</text>';
  }

  // ── Fret label ─────────────────────────────────────────────────────────
  if(ch.fret>0) s+='<text x="'+(sl+gw+7)+'" y="'+(st+YS/2+3)+'" font-size="10" font-family="sans-serif" fill="'+ink+'" dominant-baseline="central">'+ch.fret+'fr</text>';
  // ── Nut ────────────────────────────────────────────────────────────────
  if(ch.fret===0) s+='<rect x="'+sl+'" y="'+(st-3)+'" width="'+gw+'" height="5" rx="2" fill="'+ink+'"/>';
  else s+='<line x1="'+sl+'" y1="'+st+'" x2="'+(sl+gw)+'" y2="'+st+'" stroke="'+ink+'" stroke-width="1.5"/>';
  // ── Fret lines ─────────────────────────────────────────────────────────
  for(var f=1;f<=4;f++) s+='<line x1="'+sl+'" y1="'+(st+f*YS)+'" x2="'+(sl+gw)+'" y2="'+(st+f*YS)+'" stroke="'+ink+'" stroke-width="0.5" opacity="0.3"/>';
  // ── String lines ───────────────────────────────────────────────────────
  for(var i=0;i<6;i++) s+='<line x1="'+(sl+i*XS)+'" y1="'+st+'" x2="'+(sl+i*XS)+'" y2="'+(st+gh)+'" stroke="'+ink+'" stroke-width="0.8" opacity="0.45"/>';
  // ── Barre ──────────────────────────────────────────────────────────────
  if(ch.barre){
    var b=ch.barre,x1=sl+(5-b.from)*XS,x2=sl+(5-b.to)*XS,cy=st+(b.f-0.5)*YS;
    s+='<rect x="'+x1+'" y="'+(cy-8)+'" width="'+(x2-x1)+'" height="16" rx="8" fill="#c8cad4"/>';
  }
  // ── Finger dots ────────────────────────────────────────────────────────
  var barreSet=new Set();
  if(ch.barre){for(var bi=ch.barre.to;bi<=ch.barre.from;bi++)barreSet.add(bi);}
  ch.fingers.forEach(function(d){
    var x=sl+(5-d.s)*XS,cy=st+(d.f-0.5)*YS;
    var c=d.deg?(_CD[d.deg]||dotDef):dotDef;
    s+=_dot(x,cy,8,c.fill,c.text,d.deg||null);
  });
  // ── Open / muted markers ───────────────────────────────────────────────
  for(var si=6;si>=1;si--){
    var sx=sl+(5-si)*XS,sy=st-13;
    var hasFinger=ch.fingers.some(function(fd){return fd.s===si;});
    if((ch.muted||[]).includes(si)) s+='<text x="'+sx+'" y="'+(sy+4)+'" text-anchor="middle" font-size="12" font-family="sans-serif" fill="'+ink+'">&#215;</text>';
    else if(!hasFinger&&!barreSet.has(si)) s+='<circle cx="'+sx+'" cy="'+sy+'" r="5" fill="none" stroke="'+ink+'" stroke-width="1.2"/>';
  }
  // ── Chord name ─────────────────────────────────────────────────────────
  s+='<text x="'+(W/2)+'" y="'+(st+gh+18)+'" text-anchor="middle" font-size="15" font-weight="700" font-family="sans-serif" fill="'+ink+'">'+name+'</text>';
  return s+'</svg>';
}

function buildChordImageDirections(cards) {
  var svgs = {};
  (cards || []).forEach(function(c, i) {
    var name = extractChordName(c.title + ' ' + c.body);
    if (name && _CL[name]) { svgs[i] = drawChordSvg(name); }
  });
  return Object.keys(svgs).length ? svgs : null;
}

// ─── wb-starter asset cache ───────────────────────────────────────────────────
let _wbAssets = null;

async function loadWbAssets() {
  if (_wbAssets) { return _wbAssets; }
  try {
    const [tcRes, cssRes] = await Promise.all([fetch('/wb/themecontrol.js'), fetch('/wb/themes.css')]);
    _wbAssets = { themecontrolJs: tcRes.ok ? await tcRes.text() : '', themesCss: cssRes.ok ? await cssRes.text() : '' };
  } catch (err) {
    console.warn('[generator] Could not load wb-starter assets:', err.message);
    _wbAssets = { themecontrolJs: '', themesCss: '' };
  }
  return _wbAssets;
}

async function autoSelectStyle({ subject, desc, provider, openaiModel }) {
  const styleList  = Object.entries(STYLE_DESCRIPTIONS).map(function(e){ return '- ' + e[0] + ': ' + e[1]; }).join('\n');
  const layoutList = Object.entries(LAYOUT_DESCRIPTIONS).map(function(e){ return '- ' + e[0] + ': ' + e[1]; }).join('\n');
  const prompt = 'You are a web designer choosing a visual style and layout for a new website.\n\nSUBJECT: ' + subject + '\n' + (desc ? 'CONTEXT: ' + desc + '\n' : '')
    + '\nChoose the single best visual style:\n' + styleList
    + '\n\nChoose the single best layout structure:\n' + layoutList
    + '\n\nAlso write a short category label (3-5 words, title case, no punctuation) naming the field or domain.'
    + '\n\nReturn ONLY valid JSON, no markdown fences:\n{ "style": "chosen-style-name", "layout": "chosen-layout-name", "kicker": "Category Label Here" }';
  try {
    const result = await callAIProxy(prompt, provider === 'openai' ? 'openai' : 'claude', openaiModel);
    const style  = (result && STYLE_CONFIG[result.style])         ? result.style  : 'dark-tech';
    const layout = (result && LAYOUT_DESCRIPTIONS[result.layout]) ? result.layout : 'classic';
    const kicker = (result && typeof result.kicker === 'string' && result.kicker.trim()) ? result.kicker.trim() : null;
    return { style, layout, kicker };
  } catch (err) {
    console.warn('[auto-style] failed:', err.message);
    return { style: 'dark-tech', layout: 'classic', kicker: null };
  }
}

function buildContentPrompt({ subject, desc, audience, sections }) {
  const audienceText = AUDIENCE_DESC[audience] || AUDIENCE_DESC.general;
  const sectionList  = sections.map(function(s){ return SECTION_DESC[s]; }).filter(Boolean).join('\n- ');
  const banned       = BANNED_PHRASES.map(function(p){ return '"' + p + '"'; }).join(', ');
  const colorTokens  = 'primary, secondary, accent, primary-light, secondary-light, accent-light, primary-dark, secondary-dark, accent-dark';
  return 'You are a world-class writer producing content for a professional website.\n\nSUBJECT: ' + subject + '\n' + (desc ? 'ANGLE / CONTEXT: ' + desc + '\n' : '') + 'TARGET READER: ' + audienceText + '\n\nSECTIONS TO INCLUDE:\n- ' + sectionList + '\n\nReturn ONLY a valid JSON object, no markdown fences, no preamble:\n{\n  "title": "Compelling page title",\n  "tagline": "One punchy sentence",\n  "introduction": "4 paragraphs separated by \\n\\n",\n  "concepts": [\n    { "id": "c1", "title": "Name", "body": "2-3 sentences with a real-world example", "color": "blue" },\n    { "id": "c2", "title": "...", "body": "...", "color": "purple" },\n    { "id": "c3", "title": "...", "body": "...", "color": "coral" },\n    { "id": "c4", "title": "...", "body": "...", "color": "amber" },\n    { "id": "c5", "title": "...", "body": "...", "color": "teal" },\n    { "id": "c6", "title": "...", "body": "...", "color": "blue" }\n  ],\n  "timeline": [{ "year": "1905", "title": "Event", "body": "1-2 sentences." }],\n  "cards": [\n    { "num": "01", "title": "Title", "body": "2-3 sentences", "color": "blue" },\n    { "num": "02", "title": "...", "body": "...", "color": "purple" },\n    { "num": "03", "title": "...", "body": "...", "color": "coral" },\n    { "num": "04", "title": "...", "body": "...", "color": "green" },\n    { "num": "05", "title": "...", "body": "...", "color": "blue" },\n    { "num": "06", "title": "...", "body": "...", "color": "purple" }\n  ],\n  "quotes": [{ "text": "Quote text", "attribution": "- Person, Context" }],\n  "faq": [{ "q": "Question as typed into Google?", "a": "2-4 sentence answer" }],\n  "footer": "One sentence closing thought"\n}\n\nRULES:\n1. Every fact must be accurate.\n2. concepts and cards must cover DIFFERENT aspects.\n3. cards: MINIMUM 6, always a multiple of 3.\n4. NEVER use: ' + banned + '\n5. All strings must be properly JSON-escaped. No literal newlines inside string values.\n6. Keep color values inside the theme palette using only these tokens: ' + colorTokens + '. Legacy names (blue/purple/etc.) are allowed only for compatibility.';
}

function buildImagePrompt({ content, style, generateCards }) {
  const cfg        = STYLE_CONFIG[style] || STYLE_CONFIG['dark-tech'];
  const cards      = content.cards || [];
  const cardTitles = cards.map(function(c, i){ return 'Card ' + i + ': "' + c.title + '" - ' + c.body.slice(0, 80) + '...'; }).join('\n');
  const cardTmpl   = cards.map(function(_, i){ return '{ "index": ' + i + ', "prompt": "FLUX prompt", "alt": "Alt text" }'; }).join(',\n  ');
  const cardBlock  = generateCards ? '"cardImages": [\n  ' + cardTmpl + '\n]' : '"cardImages": []';
  return 'You are an art director writing FLUX image prompts.\n\nTitle: ' + content.title + '\nTagline: ' + content.tagline + '\n\n' + (generateCards ? 'Cards:\n' + cardTitles + '\n\n' : '') + 'Style: ' + cfg.imgStyle + '\nMood: ' + cfg.imgMood + '\n\nRULES: No text/faces/watermarks. Hero = wide landscape. Alt text = 10-20 words.\n\nReturn ONLY valid JSON:\n{\n  "hero": { "prompt": "...", "alt": "..." },\n  ' + cardBlock + '\n}';
}

function parseJSON(raw) {
  const clean = (raw || '').trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  const candidate = match ? match[0] : clean;
  try { return JSON.parse(closeOpenJSON(candidate)); } catch {}
  throw new Error('Could not parse AI response as JSON.\nFirst 300 chars:\n' + clean.slice(0, 300));
}

function closeOpenJSON(str) {
  let s = str.trimEnd().replace(/,\s*$/, '');
  const stack = []; let inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') stack.push('}'); else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  return s + stack.reverse().join('');
}

function validateContent(content) {
  const errors = [];
  if (!content || typeof content !== 'object') return { valid: false, errors: ['Not a JSON object'] };
  if (!content.title)        errors.push('Missing title');
  if (!content.tagline)      errors.push('Missing tagline');
  if (!content.introduction) errors.push('Missing introduction');
  if (!Array.isArray(content.concepts) || content.concepts.length < 3) errors.push('concepts: need 3+, got ' + (content.concepts||[]).length);
  if (!Array.isArray(content.cards)    || content.cards.length    < 6) errors.push('cards: need 6+, got '    + (content.cards||[]).length);
  return { valid: errors.length === 0, errors };
}

function normalizeCards(content) {
  if (!content || !Array.isArray(content.cards)) return content;
  const count = content.cards.length;
  const target = Math.max(6, Math.floor(count / 3) * 3);
  if (count === target) return content;
  if (count < 3) { console.warn('[normalizeCards] only ' + count + ' cards'); return content; }
  content.cards = content.cards.slice(0, target);
  return content;
}

const THEME_COLOR_TOKENS = [
  'primary', 'secondary', 'accent',
  'primary-light', 'secondary-light', 'accent-light',
  'primary-dark', 'secondary-dark', 'accent-dark'
];

const LEGACY_COLOR_ALIASES = {
  blue: 'primary',
  purple: 'secondary',
  coral: 'accent',
  amber: 'primary-light',
  teal: 'secondary-light',
  green: 'accent-light',
  pink: 'accent-dark'
};

function resolveThemeColor(rawColor, index) {
  const fallback = THEME_COLOR_TOKENS[(typeof index === 'number' ? index : 0) % THEME_COLOR_TOKENS.length];
  const key = String(rawColor || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z-]/g, '');
  if (THEME_COLOR_TOKENS.includes(key)) return key;
  if (LEGACY_COLOR_ALIASES[key]) return LEGACY_COLOR_ALIASES[key];
  return fallback;
}

function makeEsc() {
  return function(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
}

function makeThemeSwitcher(themeDefault, themecontrolJs) {
  if (!themecontrolJs) return '';
  return '\n<div id="wb-theme-switcher"></div>\n<script>\n(function(){\n' + themecontrolJs + '\ndocument.addEventListener(\'DOMContentLoaded\', function() {\n  var el = document.getElementById(\'wb-theme-switcher\');\n  if (el && typeof themecontrol === \'function\') { themecontrol(el, { default: \'' + themeDefault + '\', persist: true, showLabel: false }); }\n});\n})();\n</script>';
}

function makeFullCss(themeCss, layoutCss) { return WB_NORMALIZE_CSS + '\n' + themeCss + '\n' + SHARED_CSS + '\n' + layoutCss; }

function makeTimeline(timeline, esc) {
  return (timeline||[]).map(function(item, i, arr) {
    return '<div class="tl-item"><div class="tl-year">' + esc(item.year) + '</div><div class="tl-connector"><div class="tl-dot"></div>' + (i < arr.length - 1 ? '<div class="tl-line"></div>' : '') + '</div><div class="tl-body"><h4>' + esc(item.title) + '</h4><p>' + esc(item.body) + '</p></div></div>';
  }).join('\n');
}

function makeQuotes(quotes, esc) {
  return (quotes||[]).map(function(q){ return '<div class="quote-block"><blockquote>&ldquo;' + esc(q.text) + '&rdquo;</blockquote><cite>' + esc(q.attribution) + '</cite></div>'; }).join('\n');
}

function makeFaq(faq, esc) {
  return (faq||[]).map(function(f){ return '<div class="faq-item"><div class="faq-q">' + esc(f.q) + '</div><div class="faq-a">' + esc(f.a) + '</div></div>'; }).join('\n');
}

function makeHeroImg(hero, esc) {
  if (!hero) return '';
  return '<div class="hero-img-wrap"><img data-gen-prompt="' + esc(hero.prompt) + '" data-gen-hero="1" data-gen-alt="' + esc(hero.alt) + '" src="" alt="' + esc(hero.alt) + '" class="hero-img-stub shimmer" onerror="this.style.display=\'none\'"></div>';
}

// ─── Layout builders ──────────────────────────────────────────────────────────

function buildHTML_classic(content, style, imageDirections, wbAssets, options) {
  const esc = makeEsc();
  const kicker = (options && options.kicker) || 'CieloVista AI';
  const hero   = imageDirections && imageDirections.hero;
  const cardImgs = (imageDirections && imageDirections.cardImages) || [];
  const cs = (imageDirections && imageDirections.chordSvgs) || {};
  const css = makeFullCss(wbAssets.themesCss || FALLBACK_DARK_VARS, LAYOUT_CSS_CLASSIC);
  const sw  = makeThemeSwitcher(STYLE_THEME[style] || 'dark', wbAssets.themecontrolJs);
  const introHTML    = (content.introduction||'').split('\n\n').filter(Boolean).map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('\n');
  const conceptsHTML = (content.concepts||[]).map(function(c, i){
    const clr = resolveThemeColor(c.color, i);
    return '<div class="concept-card c-' + clr + '"><h3>' + esc(c.title) + '</h3><p>' + esc(c.body) + '</p></div>';
  }).join('\n');
  const cardsHTML    = (content.cards||[]).map(function(c,i){
    const d=cardImgs.find(function(ci){return ci.index===i;});
    const img=cs[i]?'<div class="chord-diagram-wrap">'+cs[i]+'</div>':d?'<img data-gen-prompt="'+esc(d.prompt)+'" data-gen-alt="'+esc(d.alt)+'" src="" alt="'+esc(d.alt)+'" class="card-img card-img-stub shimmer" onerror="this.style.display=\'none\'">':'';
    const clr = resolveThemeColor(c.color, i);
    return '<div class="detail-card dc-'+clr+'"><div class="card-accent-line"></div>'+img+'<div class="card-body"><div class="card-num">'+String(i+1).padStart(2,'0')+'</div><h3>'+esc(c.title)+'</h3><p>'+esc(c.body)+'</p></div></div>';
  }).join('\n');
  const secs = [];
  if (introHTML)    secs.push('<section class="intro"><h2>Overview</h2>' + introHTML + '</section>');
  if (conceptsHTML) secs.push('<section><h2>Key Concepts</h2><div class="concepts-grid">' + conceptsHTML + '</div></section>');
  if (cardsHTML)    secs.push('<section><h2>Explore Further</h2><div class="cards-grid">' + cardsHTML + '</div></section>');
  const tl=makeTimeline(content.timeline,esc); if(tl) secs.push('<section><h2>Timeline</h2>'+tl+'</section>');
  const qt=makeQuotes(content.quotes,esc);     if(qt) secs.push('<section><h2>In Their Own Words</h2>'+qt+'</section>');
  const fq=makeFaq(content.faq,esc);           if(fq) secs.push('<section><h2>Frequently Asked Questions</h2>'+fq+'</section>');
  return '<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>'+esc(content.title||'')+'</title><style>'+css+'</style></head><body><header><div class="kicker">'+esc(kicker)+'</div><h1>'+esc(content.title||'')+'</h1><p>'+esc(content.tagline||'')+'</p></header>'+makeHeroImg(hero,esc)+'<main>'+secs.join('\n')+'</main><footer><p>'+esc(content.footer||'')+'</p><p style="margin-top:8px;font-size:.75rem;opacity:.4">CieloVista AI &middot; classic &middot; wb-starter</p></footer>'+sw+'</body></html>';
}

function buildHTML_magazine(content, style, imageDirections, wbAssets, options) {
  const esc = makeEsc();
  const kicker = (options && options.kicker) || 'CieloVista AI';
  const hero   = imageDirections && imageDirections.hero;
  const cardImgs = (imageDirections && imageDirections.cardImages) || [];
  const cs = (imageDirections && imageDirections.chordSvgs) || {};
  const css = makeFullCss(wbAssets.themesCss || FALLBACK_DARK_VARS, LAYOUT_CSS_MAGAZINE);
  const sw  = makeThemeSwitcher(STYLE_THEME[style] || 'dark', wbAssets.themecontrolJs);
  const introHTML = (content.introduction||'').split('\n\n').filter(Boolean).map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('\n');
  const chipsHTML = (content.concepts||[]).map(function(c, i){
    const clr = resolveThemeColor(c.color, i);
    return '<div class="concept-chip c-'+clr+'"><h3>'+esc(c.title)+'</h3><p>'+esc(c.body)+'</p></div>';
  }).join('\n');
  const cardsHTML = (content.cards||[]).map(function(c,i){
    const d=cardImgs.find(function(ci){return ci.index===i;});
    const img=cs[i]?'<div class="chord-diagram-wrap">'+cs[i]+'</div>':d?'<img data-gen-prompt="'+esc(d.prompt)+'" data-gen-alt="'+esc(d.alt)+'" src="" alt="'+esc(d.alt)+'" class="card-img card-img-stub shimmer" onerror="this.style.display=\'none\'">':'';
    const clr = resolveThemeColor(c.color, i);
    return '<div class="detail-card dc-'+clr+'"><div class="card-accent-line"></div>'+img+'<div class="card-body"><div class="card-num">'+String(i+1).padStart(2,'0')+'</div><h3>'+esc(c.title)+'</h3><p>'+esc(c.body)+'</p></div></div>';
  }).join('\n');
  const secs = [];
  if (introHTML) secs.push('<section><h2>Overview</h2><div class="intro-2col">'+introHTML+'</div></section>');
  if (chipsHTML) secs.push('<section><h2>Key Concepts</h2><div class="concepts-strip">'+chipsHTML+'</div></section>');
  if (cardsHTML) secs.push('<section><h2>Explore Further</h2><div class="cards-featured">'+cardsHTML+'</div></section>');
  const tl=makeTimeline(content.timeline,esc); if(tl) secs.push('<section><h2>Timeline</h2>'+tl+'</section>');
  const qt=makeQuotes(content.quotes,esc);     if(qt) secs.push('<section><h2>In Their Own Words</h2>'+qt+'</section>');
  const fq=makeFaq(content.faq,esc);           if(fq) secs.push('<section><h2>Frequently Asked Questions</h2>'+fq+'</section>');
  return '<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>'+esc(content.title||'')+'</title><style>'+css+'</style></head><body><div class="mag-header"><div class="mag-header-left"><div class="kicker">'+esc(kicker)+'</div><h1>'+esc(content.title||'')+'</h1></div><div class="mag-header-right"><p class="mag-tagline">'+esc(content.tagline||'')+'</p><div class="mag-meta">CieloVista AI &middot; magazine</div></div></div>'+makeHeroImg(hero,esc)+'<main>'+secs.join('\n')+'</main><footer><p>'+esc(content.footer||'')+'</p></footer>'+sw+'</body></html>';
}

function buildHTML_landing(content, style, imageDirections, wbAssets, options) {
  const esc = makeEsc();
  const kicker = (options && options.kicker) || 'CieloVista AI';
  const hero   = imageDirections && imageDirections.hero;
  const cardImgs = (imageDirections && imageDirections.cardImages) || [];
  const cs = (imageDirections && imageDirections.chordSvgs) || {};
  const css = makeFullCss(wbAssets.themesCss || FALLBACK_DARK_VARS, LAYOUT_CSS_LANDING);
  const sw  = makeThemeSwitcher(STYLE_THEME[style] || 'dark', wbAssets.themecontrolJs);
  const introHTML = (content.introduction||'').split('\n\n').filter(Boolean).map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('\n');
  const pillsHTML = (content.concepts||[]).map(function(c, i){
    const clr = resolveThemeColor(c.color, i);
    return '<div class="concept-pill c-'+clr+'" title="'+esc(c.body)+'"><span class="pill-name">'+esc(c.title)+'</span></div>';
  }).join('\n');
  const altHTML = (content.cards||[]).map(function(c,i){
    const d=cardImgs.find(function(ci){return ci.index===i;});
    const img=cs[i]
      ?'<div class="alt-card-media"><div class="chord-diagram-wrap">'+cs[i]+'</div></div>'
      :d?'<div class="alt-card-media"><img data-gen-prompt="'+esc(d.prompt)+'" data-gen-alt="'+esc(d.alt)+'" src="" alt="'+esc(d.alt)+'" class="alt-card-img shimmer" onerror="this.style.display=\'none\'"></div>'
      :'<div class="alt-card-media"><div class="alt-card-img-stub shimmer"></div></div>';
    const clr = resolveThemeColor(c.color, i);
    return '<div class="alt-card dc-'+clr+(i%2!==0?' flip':'')+'">' + img + '<div class="alt-card-body"><div class="alt-card-num">'+String(i+1).padStart(2,'0')+'</div><h3>'+esc(c.title)+'</h3><p>'+esc(c.body)+'</p></div></div>';
  }).join('\n');
  const secs = [];
  if (pillsHTML) secs.push('<div class="concepts-pills-section"><h2>Key Concepts</h2><div class="pills-row">'+pillsHTML+'</div></div>');
  if (altHTML)   secs.push('<div class="alt-cards-section"><h2>Explore Further</h2>'+altHTML+'</div>');
  if (introHTML) secs.push('<div class="overview-box"><h2>Overview</h2>'+introHTML+'</div>');
  const tl=makeTimeline(content.timeline,esc); if(tl) secs.push('<section><h2>Timeline</h2>'+tl+'</section>');
  const qt=makeQuotes(content.quotes,esc);     if(qt) secs.push('<section><h2>In Their Own Words</h2>'+qt+'</section>');
  const fq=makeFaq(content.faq,esc);           if(fq) secs.push('<section><h2>Frequently Asked Questions</h2>'+fq+'</section>');
  return '<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>'+esc(content.title||'')+'</title><style>'+css+'</style></head><body><div class="landing-header"><div class="kicker">'+esc(kicker)+'</div><h1>'+esc(content.title||'')+'</h1><p>'+esc(content.tagline||'')+'</p></div>'+makeHeroImg(hero,esc)+'<main>'+secs.join('\n')+'</main><footer><p>'+esc(content.footer||'')+'</p></footer>'+sw+'</body></html>';
}

function buildHTML_academic(content, style, imageDirections, wbAssets, options) {
  const esc = makeEsc();
  const kicker   = (options && options.kicker) || 'CieloVista AI';
  const cardImgs = (imageDirections && imageDirections.cardImages) || [];
  const cs = (imageDirections && imageDirections.chordSvgs) || {};
  const css = makeFullCss(wbAssets.themesCss || FALLBACK_DARK_VARS, LAYOUT_CSS_ACADEMIC);
  const sw  = makeThemeSwitcher(STYLE_THEME[style] || 'dark', wbAssets.themecontrolJs);
  const introHTML = (content.introduction||'').split('\n\n').filter(Boolean).map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('\n');
  const tlHTML = (content.timeline && content.timeline.length)
    ? '<div class="tl-sidebar-label">Timeline</div>'+(content.timeline||[]).map(function(it){ return '<div class="tl-sidebar-item"><div class="tl-s-year">'+esc(it.year)+'</div><div><div class="tl-s-dot"></div></div><div class="tl-s-body"><h4>'+esc(it.title)+'</h4><p>'+esc(it.body)+'</p></div></div>'; }).join('\n')
    : '';
  const cHTML = (content.concepts||[]).map(function(c,i){
    const clr = resolveThemeColor(c.color, i);
    return '<div class="concept-row c-'+clr+'"><div class="concept-row-num">'+String(i+1).padStart(2,'0')+'</div><div><h3>'+esc(c.title)+'</h3><p>'+esc(c.body)+'</p></div></div>';
  }).join('\n');
  const dHTML = (content.cards||[]).map(function(c,i){
    const d=cardImgs.find(function(ci){return ci.index===i;});
    const img=cs[i]
      ?'<div class="chord-diagram-wrap" style="width:180px;height:110px;flex-shrink:0">'+cs[i]+'</div>'
      :d?'<img data-gen-prompt="'+esc(d.prompt)+'" data-gen-alt="'+esc(d.alt)+'" src="" alt="'+esc(d.alt)+'" class="card-row-img shimmer" onerror="this.style.display=\'none\'">'
      :'<div class="card-row-img-stub shimmer"></div>';
    const clr = resolveThemeColor(c.color, i);
    return '<div class="card-row-item dc-'+clr+'">'+img+'<div class="card-row-body"><div class="card-row-num">'+String(i+1).padStart(2,'0')+'</div><h3>'+esc(c.title)+'</h3><p>'+esc(c.body)+'</p></div></div>';
  }).join('\n');
  const sbSection = (introHTML||tlHTML)?'<div class="sidebar-section"><div class="tl-sidebar">'+tlHTML+'</div><div class="overview-main">'+introHTML+'</div></div>':'';
  const secs = [sbSection];
  if (cHTML) secs.push('<div class="concepts-numbered-section"><div class="section-label">Key Concepts</div>'+cHTML+'</div>');
  if (dHTML) secs.push('<div class="cards-rows-section"><div class="section-label">Explore Further</div>'+dHTML+'</div>');
  const qt=makeQuotes(content.quotes,esc); if(qt) secs.push('<section><h2>In Their Own Words</h2>'+qt+'</section>');
  const fq=makeFaq(content.faq,esc);       if(fq) secs.push('<section><h2>Frequently Asked Questions</h2>'+fq+'</section>');
  return '<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>'+esc(content.title||'')+'</title><style>'+css+'</style></head><body><div class="academic-header"><div class="kicker">'+esc(kicker)+'</div><h1>'+esc(content.title||'')+'</h1><p>'+esc(content.tagline||'')+'</p></div><main>'+secs.filter(Boolean).join('\n')+'</main><footer><p>'+esc(content.footer||'')+'</p></footer>'+sw+'</body></html>';
}

function buildHTML_showcase(content, style, imageDirections, wbAssets, options) {
  const esc = makeEsc();
  const kicker   = (options && options.kicker) || 'CieloVista AI';
  const cardImgs = (imageDirections && imageDirections.cardImages) || [];
  const cs = (imageDirections && imageDirections.chordSvgs) || {};
  const css = makeFullCss(wbAssets.themesCss || FALLBACK_DARK_VARS, LAYOUT_CSS_SHOWCASE);
  const sw  = makeThemeSwitcher(STYLE_THEME[style] || 'dark', wbAssets.themecontrolJs);
  const introHTML = (content.introduction||'').split('\n\n').filter(Boolean).map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('\n');
  const mHTML = (content.cards||[]).map(function(c,i){
    const d=cardImgs.find(function(ci){return ci.index===i;});
    const img=cs[i]?'<div class="chord-diagram-wrap">'+cs[i]+'</div>':d?'<img data-gen-prompt="'+esc(d.prompt)+'" data-gen-alt="'+esc(d.alt)+'" src="" alt="'+esc(d.alt)+'" class="masonry-card-img shimmer" onerror="this.style.display=\'none\'">':'<div class="masonry-card-img-stub shimmer"></div>';
    const clr = resolveThemeColor(c.color, i);
    return '<div class="masonry-card mc-'+clr+'"><div class="masonry-card-accent"></div>'+img+'<div class="masonry-card-body"><div class="mc-num">'+String(i+1).padStart(2,'0')+'</div><h3>'+esc(c.title)+'</h3><p>'+esc(c.body)+'</p></div></div>';
  }).join('\n');
  const pHTML = (content.concepts||[]).map(function(c, i){
    const clr = resolveThemeColor(c.color, i);
    return '<div class="sc-'+clr+'"><div class="showcase-pill"><span class="sp-name">'+esc(c.title)+'</span><span class="sp-body">'+esc(c.body.slice(0,80))+(c.body.length>80?'...':'')+'</span></div></div>';
  }).join('\n');
  const secs = [];
  if (mHTML)    secs.push('<div class="masonry-section"><div class="section-label">Explore</div><div class="masonry-grid">'+mHTML+'</div></div>');
  if (introHTML)secs.push('<div class="overview-2col-section"><div class="section-label">Overview</div><div class="overview-2col">'+introHTML+'</div></div>');
  if (pHTML)    secs.push('<div class="concepts-bottom"><div class="section-label">Key Concepts</div><div class="showcase-pills">'+pHTML+'</div></div>');
  const tl=makeTimeline(content.timeline,esc); if(tl) secs.push('<section><h2>Timeline</h2>'+tl+'</section>');
  const qt=makeQuotes(content.quotes,esc);     if(qt) secs.push('<section><h2>In Their Own Words</h2>'+qt+'</section>');
  const fq=makeFaq(content.faq,esc);           if(fq) secs.push('<section><h2>Frequently Asked Questions</h2>'+fq+'</section>');
  return '<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>'+esc(content.title||'')+'</title><style>'+css+'</style></head><body><div class="showcase-header"><div class="showcase-header-left"><h1>'+esc(content.title||'')+'</h1></div><div class="showcase-header-right"><div class="showcase-kicker">'+esc(kicker)+'</div><div class="showcase-tagline">'+esc(content.tagline||'')+'</div></div></div><main>'+secs.join('\n')+'</main><footer><p>'+esc(content.footer||'')+'</p></footer>'+sw+'</body></html>';
}

function buildHTML(content, style, imageDirections, wbAssets, options) {
  const layout = (options && options.layout) || 'classic';
  const builders = { classic:buildHTML_classic, magazine:buildHTML_magazine, landing:buildHTML_landing, academic:buildHTML_academic, showcase:buildHTML_showcase };
  return (builders[layout] || builders.classic)(content, style, imageDirections, wbAssets, options);
}

async function injectImages(html, options) {
  const quality = (options && options.quality) || 'standard';
  const onProgress = (options && options.onProgress) || null;
  const MAX_RETRIES = 3;
  const re = /<img([^>]*?)data-gen-prompt="([^"]*)"([^>]*?)data-gen-alt="([^"]*)"([^>]*?)>/g;
  const stubs = []; let m;
  while ((m = re.exec(html)) !== null) {
    stubs.push({ fullMatch:m[0], pre:m[1], prompt:m[2], mid:m[3], alt:m[4], post:m[5], isHero:m[0].indexOf('data-gen-hero')!==-1 });
  }
  if (!stubs.length) { return html; }
  let result = html;
  for (let i = 0; i < stubs.length; i++) {
    const stub = stubs[i];
    if (onProgress) onProgress('Generating image '+(i+1)+' of '+stubs.length+'...', stub.alt.slice(0,60), Math.round(70+(i/stubs.length)*22));
    let injected = false;
    for (let attempt = 0; attempt < MAX_RETRIES && !injected; attempt++) {
      if (attempt > 0) { await new Promise(function(r){ setTimeout(r, 1500*attempt); }); }
      try {
        const res = await fetch('/image', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt:stub.prompt, size:stub.isHero?'landscape_16_9':'square_hd', quality }) });
        if (!res.ok) { continue; }
        const data = await res.json();
        if (!data.ok || !data.b64) { continue; }
        const mime = data.mime || 'image/jpeg';
        const cleanPre  = stub.pre.replace(/\s*class="[^"]*shimmer[^"]*"/g,'');
        const cleanPost = stub.post.replace(/\s*onerror="[^"]*"/g,'');
        result = result.replace(stub.fullMatch, '<img'+cleanPre+'src="data:'+mime+';base64,'+data.b64+'"'+stub.mid+'alt="'+stub.alt+'"'+cleanPost+'>');
        injected = true;
      } catch (err) { console.warn('[images] attempt',attempt+1,'failed:',err.message); }
    }
    if (!injected) { result = result.replace(stub.fullMatch, ''); }
  }
  return result;
}

async function callAIProxy(prompt, provider, openaiModel, onChunk) {
  const res = await fetch('/ai', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, provider, openaiModel }) });
  if (!res.ok) { const d=await res.json().catch(function(){return{};}); throw new Error(d.error||(provider+' error (HTTP '+res.status+')')); }
  const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    buffer += decoder.decode(chunk.value, {stream:true});
    const lines = buffer.split('\n'); buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim(); if (!raw) continue;
      let event; try { event = JSON.parse(raw); } catch { continue; }
      if (event.error) throw new Error(event.error);
      if (event.text && onChunk) onChunk(event.text, event.total||0);
      if (event.done) return parseJSON(event.content);
    }
  }
  throw new Error('Stream ended without done event');
}

async function generateWebsite(options) {
  const subject=options.subject||'', desc=options.desc||'', audience=options.audience||'general';
  const style=options.style||'dark-tech', layout=options.layout||'classic';
  const sections=options.sections||['overview','concepts','cards'];
  const provider=options.provider||'auto', openaiModel=options.openaiModel||'gpt-4o-mini';
  const generateImages=options.generateImages||false, imageQuality=options.imageQuality||'standard';
  const generateCardImages=options.generateCardImages!==false;
  const onStatus=options.onStatus||function(){};

  if (!subject.trim()) throw new Error('Subject is required');
  const wbAssets = await loadWbAssets();

  let resolvedStyle=style, resolvedLayout=layout, autoKicker=null;
  if (style === 'auto') {
    onStatus('Choosing style & layout...','Analyzing subject',4);
    const auto = await autoSelectStyle({ subject:subject.trim(), desc:desc.trim(), provider, openaiModel });
    resolvedStyle=auto.style; resolvedLayout=auto.layout; autoKicker=auto.kicker;
    onStatus('Style selected',resolvedStyle+' · '+resolvedLayout+(autoKicker?' · '+autoKicker:''),8);
  }

  onStatus('Writing content...','Claude is researching and writing',10);
  const contentPrompt = buildContentPrompt({ subject:subject.trim(), desc:desc.trim(), audience, sections });
  let content;
  try {
    content = provider==='openai'
      ? await callAIProxy(contentPrompt,'openai',openaiModel)
      : await callAIProxy(contentPrompt,'claude',openaiModel,function(_,total){ onStatus('Writing content...',total.toLocaleString()+' chars received',Math.min(10+Math.floor(total/120),45)); });
  } catch (err) {
    if (provider!=='openai' && typeof process!=='undefined' && process.env && process.env.OPENAI) {
      onStatus('Switching to OpenAI...',err.message.slice(0,60),20);
      content = await callAIProxy(contentPrompt,'openai',openaiModel);
    } else throw err;
  }
  content = normalizeCards(content);
  const validation = validateContent(content);
  if (!validation.valid) console.warn('[generator] validation:',validation.errors);
  onStatus('Content ready',(content.concepts||[]).length+' concepts · '+(content.cards||[]).length+' cards',50);

  let imageDirections = null;
  if (generateImages) {
    onStatus('Writing image prompts...','Art directing FLUX prompts',52);
    const imgPrompt = buildImagePrompt({ content, style:resolvedStyle, generateCards:generateCardImages });
    try {
      imageDirections = await callAIProxy(imgPrompt,'claude',openaiModel);
      const n=(imageDirections&&imageDirections.cardImages)?imageDirections.cardImages.length:0;
      onStatus('Image prompts ready','Hero + '+n+' card images queued',58);
    } catch (err) { console.warn('[generator] image prompts failed:',err.message); imageDirections=null; }
  }

  onStatus('Building HTML...',resolvedLayout+' layout · wb-starter themes',62);

  // Chord diagrams — music/guitar sites get SVG diagrams instead of FLUX images.
  // Runs regardless of generateImages — no image generation needed.
  if (isMusicSubject(subject.trim(), desc.trim())) {
    const chordSvgs = buildChordImageDirections(content.cards);
    if (chordSvgs && Object.keys(chordSvgs).length > 0) {
      imageDirections = imageDirections || {};
      imageDirections.chordSvgs = chordSvgs;
      onStatus('Chord diagrams ready', Object.keys(chordSvgs).length+' chord SVG(s) generated', 63);
    }
  }

  let html = buildHTML(content, resolvedStyle, imageDirections, wbAssets, { kicker:autoKicker, layout:resolvedLayout });
  if (generateImages && imageDirections) {
    html = await injectImages(html, { quality:imageQuality, onProgress:function(text,detail,pct){ onStatus(text,detail,pct); } });
  }

  onStatus('Saving...','Writing to generated/',93);
  const meta = { subject:subject.trim(), desc, audience, style:resolvedStyle, layout:resolvedLayout, autoStyle:style==='auto', autoKicker, sections, generateImages, imageQuality, generateCardImages, content };
  const saveRes = await fetch('/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ subject:subject.trim(), html, meta }) });
  const saved = await saveRes.json().catch(function(){return{};});
  if (!saveRes.ok || !saved.ok) throw new Error(saved.error||'Failed to save generated website');
  onStatus('Complete','Website generated and saved',100);
  return { html, saved, meta, resolvedStyle, resolvedLayout, autoKicker };
}

async function addImagesToSite(meta, onStatus) {
  onStatus = onStatus || function(){};
  if (!meta || !meta.content) throw new Error('No saved content found. Use "Content + Images" instead.');
  const wbAssets = await loadWbAssets();
  const content=meta.content, style=meta.style||'dark-tech', layout=meta.layout||'classic';
  const imageQuality=meta.imageQuality||'standard', generateCardImages=meta.generateCardImages!==false;
  onStatus('Writing image prompts...','Art directing FLUX prompts from saved content',10);
  const imgPrompt = buildImagePrompt({ content, style, generateCards:generateCardImages });
  let imageDirections;
  try {
    imageDirections = await callAIProxy(imgPrompt,'claude','gpt-4o-mini');
    const n=(imageDirections&&imageDirections.cardImages)?imageDirections.cardImages.length:0;
    onStatus('Image prompts ready','Hero + '+n+' card images queued',30);
  } catch (err) { throw new Error('Image direction failed: '+err.message); }
  onStatus('Building HTML...',layout+' layout',35);
  let html = buildHTML(content, style, imageDirections, wbAssets, { kicker:meta.autoKicker||null, layout });
  html = await injectImages(html, { quality:imageQuality, onProgress:function(text,detail,pct){ onStatus(text,detail,Math.round(35+pct*0.58)); } });
  onStatus('Saving...','Writing updated site',95);
  const updatedMeta = Object.assign({}, meta, { generateImages:true, imageQuality, generateCardImages });
  const saveRes = await fetch('/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ subject:meta.subject, html, meta:updatedMeta }) });
  const saved = await saveRes.json().catch(function(){return{};});
  if (!saveRes.ok || !saved.ok) throw new Error(saved.error||'Failed to save site with images');
  onStatus('Complete','Site saved with images',100);
  return { html, saved };
}

async function listWebsites() {
  const res = await fetch('/list');
  if (!res.ok) throw new Error('Failed to fetch generated websites');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

if (typeof window !== 'undefined') {
  window.generateWebsite  = generateWebsite;
  window.addImagesToSite  = addImagesToSite;
  window.listWebsites     = listWebsites;
  window.buildHTML        = buildHTML;
  window.buildImagePrompt = buildImagePrompt;
  window.injectImages     = injectImages;
  window.autoSelectStyle  = autoSelectStyle;
  window.STYLE_CONFIG     = STYLE_CONFIG;
  window.LAYOUT_DESCRIPTIONS = LAYOUT_DESCRIPTIONS;
}

if (typeof module !== 'undefined') {
  module.exports = { generateWebsite, addImagesToSite, listWebsites, buildContentPrompt, buildImagePrompt, buildHTML, parseJSON, validateContent, normalizeCards, injectImages, autoSelectStyle, STYLE_CONFIG, LAYOUT_DESCRIPTIONS };
}
