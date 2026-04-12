/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   LCG — CINEMATIC TRANSITION ENGINE v4.0                    ║
 * ║   The $100,000 Transition. Full Bi-Directional Flow        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
(function () {
    'use strict';

    const PAGES = [
        'index.html', 
        'services.html', 
        'brand-identity.html', 
        'social-media.html',
        'graphics-design.html',
        'website-design.html',
        'app-design.html',
        'logo-animation.html',
        'process.html', 
        'clients.html'
    ];
    const PAGE_LABELS = {
        'index.html':           'Home',
        'services.html':        'Services',
        'brand-identity.html':  'Brand Identity',
        'social-media.html':    'Social Media',
        'graphics-design.html': 'Graphics Design',
        'website-design.html':  'Website Design',
        'app-design.html':      'App Design',
        'logo-animation.html':  'Logo Animation',
        'process.html':         'Process',
        'clients.html':         'Clients',
    };

    let rawPath = window.location.pathname.split('/').pop().toLowerCase();
    if (rawPath === '' || rawPath === '/' || !rawPath) rawPath = 'index.html';
    let currentIdx = PAGES.indexOf(rawPath);
    if (currentIdx === -1) currentIdx = PAGES.indexOf(rawPath + '.html');
    if (currentIdx === -1) currentIdx = 0;

    const isLastPage  = currentIdx === PAGES.length - 1;
    const isFirstPage = currentIdx === 0;
    const nextPage    = !isLastPage  ? PAGES[currentIdx + 1] : null;
    const prevPage    = !isFirstPage ? PAGES[currentIdx - 1] : null;

    let isAnimating   = false;
    let overScrollAcc = 0;
    let upScrollAcc   = 0;
    const TRIGGER_THRESHOLD = 55;

    // ── INJECT STYLES ─────────────────────────────────────────────
    const STYLES = `
        @keyframes lcg-grain { 0%,100% { transform: translate(0,0); } 10% { transform: translate(-2%,-3%); } 20% { transform: translate(3%,2%); } 30% { transform: translate(-1%,4%); } 40% { transform: translate(4%,-1%); } 50% { transform: translate(-3%,3%); } 60% { transform: translate(2%,-4%); } 70% { transform: translate(-4%,1%); } 80% { transform: translate(1%,-2%); } 90% { transform: translate(-2%,1%); } }
        @keyframes lcg-flicker { 0%,100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.4; } 94% { opacity: 1; } 97% { opacity: 1; } 98% { opacity: 0.6; } }
        @keyframes lcg-label-char { 0% { opacity: 0; transform: translateY(20px) rotateX(-60deg); } 100% { opacity: 1; transform: translateY(0) rotateX(0deg); } }
        @keyframes lcg-pulse-ring { 0% { transform: translate(-50%,-50%) scale(0); opacity: 0.8; } 100% { transform: translate(-50%,-50%) scale(4); opacity: 0; } }
        @keyframes lcg-particle-burst { 0% { transform: translate(var(--tx,0), var(--ty,0)) scale(1); opacity: 1; } 100% { transform: translate(calc(var(--tx,0) * 8), calc(var(--ty,0) * 8)) scale(0); opacity: 0; } }
        
        #lcg-overlay { position: fixed; inset: 0; z-index: 999999; pointer-events: none; overflow: hidden; }
        #lcg-gl-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; }
        #lcg-grain { position: absolute; inset: -50%; width: 200%; height: 200%; opacity: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); background-size: 200px 200px; animation: lcg-grain 0.12s steps(1) infinite; mix-blend-mode: overlay; pointer-events: none; }
        #lcg-scanline { position: absolute; left: 0; right: 0; height: 4px; background: linear-gradient(to bottom, transparent, rgba(218,255,61,0.4), transparent); opacity: 0; pointer-events: none; box-shadow: 0 0 20px rgba(218,255,61,0.3); }
        .lcg-wipe-panel { position: absolute; left: 0; right: 0; transform-origin: bottom center; transform: scaleY(0); }
        #lcg-label-wrap { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; pointer-events: none; opacity: 0; perspective: 800px; }
        #lcg-eyebrow { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 800; letter-spacing: 0.5em; text-transform: uppercase; color: rgba(218,255,61,0.6); margin-bottom: 12px; opacity: 0; transform: translateY(10px); transition: all 0.3s; }
        #lcg-eyebrow.show { opacity: 1; transform: translateY(0); }
        #lcg-page-name { font-family: 'Epilogue', sans-serif; font-size: clamp(40px, 8vw, 100px); font-weight: 900; letter-spacing: -0.04em; color: #daff3d; line-height: 1; text-transform: uppercase; display: flex; justify-content: center; gap: 0.02em; filter: drop-shadow(0 0 40px rgba(218,255,61,0.5)); }
        .lcg-char { display: inline-block; animation: lcg-label-char 0.5s cubic-bezier(.16,1,.3,1) both; }
        #lcg-progress-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: rgba(218,255,61,0.15); opacity: 0; }
        #lcg-progress-fill { height: 100%; background: linear-gradient(90deg, transparent, #daff3d, transparent); width: 0%; box-shadow: 0 0 20px #daff3d; transition: width 0.6s ease; }
        #lcg-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .lcg-particle { position: absolute; border-radius: 50%; animation: lcg-particle-burst var(--dur,0.8s) cubic-bezier(.2,.8,.4,1) forwards; }
        #lcg-vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.95) 100%); opacity: 0; }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);

    // ── BUILD OVERLAY DOM ─────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'lcg-overlay';
    const glCanvas = document.createElement('canvas'); glCanvas.id = 'lcg-gl-canvas';
    const grain = document.createElement('div'); grain.id = 'lcg-grain';
    const scanline = document.createElement('div'); scanline.id = 'lcg-scanline';
    const vignette = document.createElement('div'); vignette.id = 'lcg-vignette';
    const wipeContainer = document.createElement('div'); wipeContainer.style.cssText = 'position:absolute;inset:0;';
    const wipePanels = [];
    const PANEL_COUNT = 6;
    for (let i = 0; i < PANEL_COUNT; i++) {
        const panel = document.createElement('div'); panel.className = 'lcg-wipe-panel';
        panel.style.cssText = `left: ${i * (100/PANEL_COUNT)}%; width: ${100/PANEL_COUNT + 0.5}%; top: 0; bottom: 0; background: #000; transform: scaleY(0);`;
        wipePanels.push(panel); wipeContainer.appendChild(panel);
    }
    const particles = document.createElement('div'); particles.id = 'lcg-particles';
    const ringContainer = document.createElement('div'); ringContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    const labelWrap = document.createElement('div'); labelWrap.id = 'lcg-label-wrap';
    const eyebrow = document.createElement('div'); eyebrow.id = 'lcg-eyebrow';
    const pageName = document.createElement('div'); pageName.id = 'lcg-page-name';
    labelWrap.appendChild(eyebrow); labelWrap.appendChild(pageName);
    const progressBar = document.createElement('div'); progressBar.id = 'lcg-progress-bar';
    const progressFill = document.createElement('div'); progressFill.id = 'lcg-progress-fill';
    progressBar.appendChild(progressFill);

    overlay.append(glCanvas, vignette, wipeContainer, grain, scanline, particles, ringContainer, labelWrap, progressBar);
    document.body.appendChild(overlay);

    // ── WEBGL ───────────────────────────────────────────────────
    let gl, shaderProgram, uTime, uProgress, uResolution, animFrame, glReady = false;
    function initWebGL() {
        try {
            gl = glCanvas.getContext('webgl', { alpha: true }); if (!gl) return;
            glCanvas.width = window.innerWidth; glCanvas.height = window.innerHeight;
            const VS = `attribute vec2 a_pos; varying vec2 vUv; void main() { vUv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;
            const FS = `precision highp float; uniform float uTime; uniform float uProgress; uniform vec2 uRes; varying vec2 vUv; float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453); } float noise(vec2 st) { vec2 i = floor(st); vec2 f = fract(st); float a = random(i); float b = random(i + vec2(1.0, 0.0)); float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0)); vec2 u = f * f * (3.0 - 2.0 * f); return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y; } void main() { vec2 uv = vUv; vec3 neon = vec3(0.855, 1.0, 0.239); float dist = length((uv - 0.5) * vec2(uRes.x/uRes.y, 1.0)); float wave = uProgress + noise(uv * 4.0 + uTime) * 0.18 - dist * 0.6; float mask = smoothstep(0.0, 0.12, wave); gl_FragColor = vec4(neon * 0.02, mask); }`;
            const vs = compileShader(gl.VERTEX_SHADER, VS); const fs = compileShader(gl.FRAGMENT_SHADER, FS);
            shaderProgram = gl.createProgram(); gl.attachShader(shaderProgram, vs); gl.attachShader(shaderProgram, fs); gl.linkProgram(shaderProgram);
            const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
            const aPos = gl.getAttribLocation(shaderProgram, 'a_pos'); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
            uTime = gl.getUniformLocation(shaderProgram, 'uTime'); uProgress = gl.getUniformLocation(shaderProgram, 'uProgress'); uResolution = gl.getUniformLocation(shaderProgram, 'uRes');
            gl.useProgram(shaderProgram); gl.uniform2f(uResolution, glCanvas.width, glCanvas.height); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            glReady = true;
        } catch(e) {}
    }
    function compileShader(t, s) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh; }
    function renderGLFrame(p, t) { if (!glReady) return; gl.uniform1f(uTime, t); gl.uniform1f(uProgress, p); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }

    // ── HELPERS ─────────────────────────────────────────────────
    function spawnParticles() {
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        for (let i = 0; i < 40; i++) {
            const p = document.createElement('div'); p.className = 'lcg-particle';
            const a = (Math.PI*2*i)/40, s = 50+Math.random()*150, tx = Math.cos(a)*s, ty = Math.sin(a)*s;
            p.style.cssText = `width:4px; height:4px; background:#daff3d; left:${cx}px; top:${cy}px; --tx:${tx}px; --ty:${ty}px; --dur:${0.6+Math.random()}s; margin:-2px;`;
            particles.appendChild(p);
        }
    }
    function triggerExit(destination) {
        if (isAnimating) return;
        const isBack = destination === prevPage;
        const dest = destination || nextPage;
        if (!dest) return;
        isAnimating = true;
        const label = PAGE_LABELS[dest] || dest;
        eyebrow.textContent = isBack ? 'Heading Back' : 'Next Stop';
        pageName.innerHTML = '';
        [...label.toUpperCase()].forEach((c, i) => { const s = document.createElement('span'); s.className='lcg-char'; s.textContent=c===' '?'\u00A0':c; s.style.animationDelay=`${i*0.05}s`; pageName.appendChild(s); });

        const tl = gsap.timeline({ onComplete: () => { sessionStorage.setItem('lcg_navigating', '1'); window.location.href = dest; } });
        tl.to(document.body, { scale: isBack ? 1.05 : 0.94, filter: 'brightness(0.6)', duration: 0.5, ease: 'power2.inOut' }, 0);
        tl.set(overlay, { pointerEvents: 'all' }, 0);
        wipePanels.forEach((p, i) => {
            p.style.transformOrigin = isBack ? 'top center' : 'bottom center';
            tl.fromTo(p, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: 'expo.inOut' }, 0.2 + i*0.04);
        });
        tl.to(vignette, { opacity: 0.8, duration: 0.4 }, 0.2);
        tl.add(() => { if (glReady) { glCanvas.style.opacity='1'; let p=0; function l(){ p=Math.min(1,p+0.03); renderGLFrame(p, performance.now()/1000); if(p<1) requestAnimationFrame(l); } l(); } }, 0.3);
        tl.to(labelWrap, { opacity: 1, duration: 0.3 }, 0.5);
        tl.add(() => eyebrow.classList.add('show'), 0.55);
        tl.to(progressBar, { opacity: 1, duration: 0.2 }, 0.6);
        tl.to(progressFill, { width: '100%', duration: 0.6 }, 0.6);
        tl.to({}, { duration: 0.4 });
    }

    function playEntrance() {
        sessionStorage.removeItem('lcg_navigating');
        wipePanels.forEach(p => { p.style.transform = 'scaleY(1)'; p.style.transformOrigin = 'top center'; });
        const tl = gsap.timeline();
        wipePanels.forEach((p, i) => { tl.to(p, { scaleY: 0, duration: 0.8, ease: 'expo.inOut' }, 0.1 + (PANEL_COUNT-i)*0.05); });
        tl.fromTo(document.body, { scale: 0.95, filter: 'brightness(0.5)' }, { scale: 1, filter: 'brightness(1)', duration: 0.8, ease: 'expo.out' }, 0.1);
        tl.to(vignette, { opacity: 0, duration: 0.5 }, 0.2);
        tl.add(() => { spawnParticles(); }, 0.2);
    }

    // ── LISTENERS ───────────────────────────────────────────────
    function isAtBottom() {
        if(window.isServicesAtBottom !== undefined) return window.isServicesAtBottom;
        const dh = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        const wh = window.innerHeight;
        const st = window.pageYOffset || window.scrollY;
        return (st + wh) >= (dh - 15); // Forgiving 15px buffer for mobile
    }
    function isAtTop() {
        if(window.isServicesAtTop !== undefined) return window.isServicesAtTop;
        const st = window.pageYOffset || window.scrollY;
        return st <= 15;
    }

    window.addEventListener('wheel', (e) => {
        if (isAnimating) return;
        if (e.deltaY > 0 && isAtBottom() && nextPage) {
            overScrollAcc += e.deltaY; if (overScrollAcc >= TRIGGER_THRESHOLD) triggerExit(nextPage);
        } else if (e.deltaY < 0 && isAtTop() && prevPage) {
            upScrollAcc += Math.abs(e.deltaY); if (upScrollAcc >= TRIGGER_THRESHOLD) triggerExit(prevPage);
        } else { overScrollAcc = 0; upScrollAcc = 0; }
    }, { passive: true });

    // Touch
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchend', (e) => {
        if (isAnimating) return;
        const dy = touchStartY - e.changedTouches[0].clientY;
        if (dy > 70 && isAtBottom() && nextPage) triggerExit(nextPage);
        else if (dy < -70 && isAtTop() && prevPage) triggerExit(prevPage);
    }, { passive: true });

    document.querySelectorAll('a[href]').forEach(a => {
        a.addEventListener('click', (e) => {
            const h = a.getAttribute('href'); if (!h || h.startsWith('#') || h.startsWith('http')) return;
            const d = h.split('/').pop(); const res = PAGES.includes(d) ? d : PAGES.includes(d + '.html') ? d + '.html' : null;
            if (res) { e.preventDefault(); triggerExit(res); }
        });
    });

    if (sessionStorage.getItem('lcg_navigating')) playEntrance();
    initWebGL();
})();
