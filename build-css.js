const fs = require('fs');
const old = fs.readFileSync('public/styles.css','utf8');
const authStart = old.indexOf('/* Auth */');
const keepCSS = authStart > -1 ? old.substring(authStart) : '';

const landingCSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0A0A0B;--bg2:#141416;--s:#1c1c1f;--s2:#2C2D31;--t:#FAFAFA;--t2:#d0ccc8;--t3:#7a7874;--p:#B87333;--p2:#cc8b4e;--acc:#B87333;--g:#10b981;--r:#D91E27;--rad:16px;--f:'Inter',system-ui,sans-serif;--fh:'DM Serif Display',Georgia,serif;--fm:'JetBrains Mono','Courier New',monospace}
body{font-family:var(--f);background:var(--bg);color:var(--t);line-height:1.7;overflow-x:hidden}
body::after{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.3;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E")}
html{scroll-behavior:smooth}.hidden{display:none!important}.page{min-height:100vh;position:relative}
a{color:var(--p2);text-decoration:none}
#particles{position:fixed;inset:0;z-index:0;pointer-events:none}
.btn-accent{background:var(--p);color:#fff;border:none;padding:12px 28px;border-radius:8px;font-weight:600;cursor:pointer;font-size:.85rem;transition:all .3s;font-family:var(--f);box-shadow:0 4px 20px rgba(184,115,51,.25)}
.btn-accent:hover{background:#cc8b4e;box-shadow:0 8px 36px rgba(184,115,51,.4);transform:translateY(-2px)}
.btn-ghost{background:transparent;color:var(--t);border:1px solid rgba(255,255,255,.15);padding:12px 28px;border-radius:8px;cursor:pointer;font-size:.85rem;transition:all .3s;font-family:var(--f)}
.btn-ghost:hover{border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.05);transform:translateY(-2px)}
.btn-xl{padding:16px 40px;font-size:.9rem}.btn-sm{padding:8px 18px;font-size:.78rem}.btn-full{width:100%}
.pulse-glow{animation:pulseGlow 3s ease-in-out infinite}
@keyframes pulseGlow{0%,100%{box-shadow:0 4px 20px rgba(184,115,51,.25)}50%{box-shadow:0 6px 40px rgba(184,115,51,.5)}}
.nav{position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:14px 48px;z-index:100;background:rgba(10,10,11,.85);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06)}
.logo{display:flex;align-items:center;gap:8px}.logo span{font-family:var(--fh);font-size:1.15rem;color:var(--t)}
.nav-center{display:flex;gap:6px}.nav-center a{color:var(--t3);font-size:.85rem;padding:8px 16px;border-radius:8px;transition:.2s}.nav-center a:hover,.nav-center a.active{color:var(--t);background:rgba(255,255,255,.06)}
.nav-right{display:flex;gap:8px;align-items:center}
.hero{display:flex;align-items:center;gap:60px;max-width:1200px;margin:0 auto;padding:140px 48px 80px;position:relative;z-index:1}
.hero::before{content:'';position:absolute;top:-50px;left:-100px;width:600px;height:500px;background:radial-gradient(ellipse,rgba(184,115,51,.08),transparent 70%);pointer-events:none}
.hero-left{flex:1}.hero-right{flex:1;display:flex;justify-content:flex-end}
.hero-eyebrow{display:inline-block;color:var(--p);font-size:.72rem;font-weight:500;margin-bottom:20px;letter-spacing:2px;text-transform:uppercase;font-family:var(--fm)}
.hero h1{font-size:3.4rem;font-weight:400;line-height:1.15;margin-bottom:24px;font-family:var(--fh);text-align:left}
.glow-text{color:var(--p);filter:drop-shadow(0 0 20px rgba(184,115,51,.3));font-style:italic}
.hero-desc{font-size:1rem;color:var(--t2);max-width:480px;margin:0 0 32px;line-height:1.8;font-weight:300;text-align:left}
.hero-btns{display:flex;gap:12px}
.preview-window{background:linear-gradient(180deg,#1c1c1f,#141416);border:1px solid rgba(184,115,51,.15);border-radius:var(--rad);overflow:hidden;box-shadow:0 20px 80px rgba(0,0,0,.6),0 0 100px rgba(184,115,51,.08);width:100%;max-width:520px}
.pw-bar{display:flex;align-items:center;gap:6px;padding:12px 18px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06)}
.pw-dot{width:10px;height:10px;border-radius:50%}.pw-dot.r{background:#ef4444}.pw-dot.y{background:#eab308}.pw-dot.g{background:#22c55e}
.pw-title{margin-left:10px;font-size:.78rem;color:var(--t3)}
.pw-body{padding:18px}.pw-msg{display:flex;gap:10px;margin-bottom:12px}.pw-msg.right{justify-content:flex-end}
.pw-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--p),#8a4e58);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;flex-shrink:0}
.pw-bubble{background:var(--s);border:1px solid var(--s2);border-radius:12px;padding:12px 16px;max-width:360px;font-size:.8rem}
.pw-bubble.ai{background:rgba(184,115,51,.08);border-color:rgba(184,115,51,.2)}
.pw-bubble strong{font-size:.72rem;color:var(--p2);display:block;margin-bottom:3px}
.pw-bubble p{color:var(--t2);margin:0;line-height:1.5;font-size:.8rem}
.pw-ai-tag{font-size:.62rem;color:var(--p2);background:rgba(184,115,51,.15);display:inline-block;padding:2px 8px;border-radius:20px;margin-bottom:5px;font-weight:600}
.pw-time{font-size:.62rem;color:var(--t3);display:block;margin-top:4px;text-align:right}
.pw-action{display:flex;gap:6px;justify-content:center;padding-top:10px;border-top:1px solid rgba(255,255,255,.05)}
.section{padding:100px 48px;max-width:1200px;margin:0 auto;position:relative;z-index:1;text-align:center}
.section.narrow{max-width:700px}
.section-tag{display:inline-block;font-size:.7rem;font-weight:600;color:var(--p);margin-bottom:14px;letter-spacing:2px;text-transform:uppercase;font-family:var(--fm)}
.section-h{font-size:2.6rem;font-weight:400;margin-bottom:16px;font-family:var(--fh)}
.section-p{color:var(--t2);margin-bottom:48px;font-size:.95rem}
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px}
.feat-card{background:var(--s);border:1px solid var(--s2);border-radius:var(--rad);padding:32px 24px;text-align:center;transition:all .3s}
.feat-card:hover{transform:translateY(-6px);border-color:var(--p);box-shadow:0 12px 40px rgba(184,115,51,.1)}
.feat-icon{width:48px;height:48px;border-radius:12px;background:rgba(184,115,51,.1);border:1px solid rgba(184,115,51,.2);color:var(--p);font-family:var(--fm);font-weight:700;font-size:.85rem;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.feat-card h4{font-size:1rem;margin-bottom:8px}.feat-card p{font-size:.85rem;color:var(--t2);line-height:1.6}
.steps-row{display:flex;align-items:flex-start;justify-content:center;gap:16px;margin-top:48px}
.step-card{flex:1;background:var(--s);border:1px solid var(--s2);border-radius:var(--rad);padding:32px 24px;text-align:center;max-width:320px;transition:all .3s}
.step-card:hover{transform:translateY(-4px);border-color:rgba(184,115,51,.3)}
.step-num{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--p),#8a4e58);color:#fff;font-size:1.2rem;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 0 30px rgba(184,115,51,.3)}
.step-card h4{font-size:1rem;margin-bottom:8px}.step-card p{font-size:.85rem;color:var(--t2);line-height:1.6}
.step-arrow{color:var(--p);font-size:1.5rem;margin-top:60px;opacity:.5}
.dash-preview-section{max-width:1100px}
.dash-mock{background:var(--bg2);border:1px solid var(--s2);border-radius:var(--rad);overflow:hidden;box-shadow:0 20px 80px rgba(0,0,0,.5),0 0 60px rgba(184,115,51,.05)}
.dm-bar{display:flex;justify-content:space-between;align-items:center;padding:14px 24px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06)}
.dm-title{font-weight:600;font-size:.9rem}.dm-date{font-size:.75rem;color:var(--t3)}
.dm-body{display:flex;min-height:240px}
.dm-sidebar{width:170px;border-right:1px solid rgba(255,255,255,.06);padding:14px 10px;display:flex;flex-direction:column;gap:4px}
.dm-nav-item{padding:8px 14px;border-radius:8px;font-size:.8rem;color:var(--t3);cursor:default}.dm-nav-item.active{background:rgba(184,115,51,.1);color:var(--p)}
.dm-main{flex:1;padding:20px 24px}.dm-main h4{font-size:1rem;margin-bottom:4px}.dm-main>p{font-size:.82rem;color:var(--t2);margin-bottom:18px}
.dm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.dm-stat{background:var(--s);border:1px solid var(--s2);border-radius:12px;padding:14px;text-align:center}
.dm-stat-num{display:block;font-size:1.5rem;font-weight:800;color:var(--p);margin-bottom:4px}
.dm-stat span{font-size:.7rem;color:var(--t3);text-transform:uppercase;letter-spacing:.5px}
.bva-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;align-items:stretch;text-align:left}
.bva-card{background:var(--s);border:1px solid var(--s2);border-radius:var(--rad);padding:32px;transition:all .3s}
.bva-card.before{border-color:rgba(239,68,68,.2)}.bva-card.after{border-color:rgba(16,185,129,.2);background:rgba(16,185,129,.03)}
.bva-card:hover{transform:translateY(-4px)}.bva-label{font-size:.82rem;font-weight:700;margin-bottom:18px}
.bva-list{list-style:none;display:flex;flex-direction:column;gap:12px;margin-bottom:24px}
.bva-list li{display:flex;align-items:center;gap:12px;font-size:.88rem;color:var(--t2)}
.bva-list li::before{content:'';width:6px;height:6px;border-radius:50%;flex-shrink:0}
.before .bva-list li::before{background:var(--r)}.after .bva-list li::before{background:var(--g)}
.bva-stat{text-align:center;background:var(--bg2);border:1px solid var(--s2);border-radius:12px;padding:16px;font-size:2rem;font-weight:900;color:var(--r)}
.bva-stat.glow{color:var(--g);border-color:rgba(16,185,129,.2);box-shadow:0 0 30px rgba(16,185,129,.1)}
.bva-stat span{display:block;font-size:.72rem;font-weight:400;color:var(--t3);margin-top:4px;text-transform:uppercase}
.bva-vs{display:flex;align-items:center;justify-content:center}
.vs-circle{width:52px;height:52px;border-radius:50%;background:var(--s);border:2px solid var(--s2);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.85rem;color:var(--t3)}
.price-row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:left}
.price-card{background:var(--s);border:1px solid var(--s2);border-radius:var(--rad);padding:32px;position:relative;transition:all .3s}
.price-card:hover{transform:translateY(-4px)}.price-card.pop{border-color:var(--p);box-shadow:0 0 40px rgba(184,115,51,.1);transform:scale(1.03)}
.pop-tag{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--p);color:#fff;font-size:.65rem;font-weight:700;padding:4px 16px;border-radius:50px;letter-spacing:1px;text-transform:uppercase}
.price-card h4{color:var(--t2);font-size:.85rem;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px}
.price-val{font-size:2.8rem;font-weight:900;margin-bottom:20px}.price-val span{font-size:.85rem;font-weight:400;color:var(--t3)}
.price-card ul{list-style:none;margin-bottom:28px}
.price-card li{padding:8px 0;font-size:.85rem;color:var(--t2);border-bottom:1px solid rgba(255,255,255,.04)}.price-card li.dim{color:var(--t3)}
.testi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:left}
.testi-card{background:var(--s);border:1px solid var(--s2);border-radius:var(--rad);padding:28px;transition:all .3s}
.testi-card:hover{transform:translateY(-4px)}
.testi-card p{font-size:.9rem;line-height:1.6;margin-bottom:20px;color:var(--t2);font-style:italic}
.testi-who{display:flex;align-items:center;gap:12px}
.testi-av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--p),#8a4e58);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0}
.testi-who strong{display:block;font-size:.85rem}.testi-who small{color:var(--t3);font-size:.75rem}
.faq-list{display:flex;flex-direction:column;gap:8px;text-align:left}
.faq-item{background:var(--s);border:1px solid var(--s2);border-radius:12px;overflow:hidden;transition:.3s}
.faq-item.open{border-color:rgba(184,115,51,.2)}
.faq-q{width:100%;text-align:left;background:none;border:none;color:var(--t);padding:18px 22px;font-size:.92rem;cursor:pointer;font-family:var(--f);font-weight:500}
.faq-a{max-height:0;overflow:hidden;transition:max-height .3s}.faq-item.open .faq-a{max-height:200px}
.faq-a p{padding:0 22px 18px;font-size:.88rem;color:var(--t2)}
.cta-section{text-align:center;padding:120px 48px;position:relative}
.cta-section::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(184,115,51,.08),transparent 70%);pointer-events:none;z-index:-1}
.cta-h{font-size:3rem;font-weight:400;margin-bottom:20px;line-height:1.15;font-family:var(--fh)}
.footer{background:var(--bg2);border-top:1px solid var(--s2);padding:48px 48px 40px;position:relative;z-index:1}
.footer-inner{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;max-width:1200px;margin:0 auto}
.footer-brand p{color:var(--t3);font-size:.85rem;margin-top:10px}
.footer-col{display:flex;flex-direction:column;gap:8px}
.footer-col h5{font-size:.75rem;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.footer-col a{color:var(--t2);font-size:.85rem;transition:color .2s}.footer-col a:hover{color:var(--p2)}
.footer-bot{text-align:center;padding-top:24px;margin-top:32px;border-top:1px solid var(--s2);font-size:.75rem;color:var(--t3);max-width:1200px;margin-left:auto;margin-right:auto}

`;

const mobileCSS = `
@media(max-width:768px){
.nav{padding:12px 20px}.nav-center{display:none}
.hero{flex-direction:column;padding:100px 20px 40px;gap:32px;text-align:center}
.hero h1{font-size:2.4rem;text-align:center}.hero-desc{text-align:center}.hero-btns{justify-content:center}
.hero-right{display:none}
.feat-grid{grid-template-columns:1fr}
.steps-row{flex-direction:column;align-items:center}.step-arrow{transform:rotate(90deg);margin:0}
.dm-sidebar{display:none}.dm-stats{grid-template-columns:repeat(2,1fr)}
.bva-grid{grid-template-columns:1fr}.bva-vs{padding:8px 0}
.price-row{grid-template-columns:1fr}.price-card.pop{transform:none}
.testi-row{grid-template-columns:1fr}
.footer-inner{grid-template-columns:1fr}
.section{padding:60px 20px}
.cta-h{font-size:2rem}.section-h{font-size:2rem}
#page-dashboard:not(.hidden){grid-template-columns:1fr}
.sidebar{display:none}.mobile-nav{display:flex}
.dash-main{padding:16px 16px 80px}
.set-grid{grid-template-columns:1fr}
}
`;

fs.writeFileSync('public/styles.css', landingCSS + keepCSS + mobileCSS);
console.log('CSS rebuilt successfully!');
