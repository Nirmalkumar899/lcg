/**
 * LCG — Cinematic Page Transition Engine
 * Pattern: Lenis-style wheel capture → GSAP overlay sweep → navigate
 * Exact studio flow: single flick → 0.9s → done.
 */
(function () {
    // ── Page sequence (LINEAR — stops at clients) ────────────
    const PAGES = ['index.html', 'services.html', 'process.html', 'clients.html'];
    const PAGE_LABELS = {
        'index.html':    'Home',
        'services.html': 'Services',
        'process.html':  'Process',
        'clients.html':  'Clients',
    };

    // Detect current page
    let rawPath = window.location.pathname.split('/').pop().toLowerCase();
    if (rawPath === '' || rawPath === '/') rawPath = 'index.html';
    
    // Resilient detection: try exact match, then try adding .html
    let currentIdx = PAGES.indexOf(rawPath);
    if (currentIdx === -1) {
        currentIdx = PAGES.indexOf(rawPath + '.html');
    }
    
    // If still not found, default to index or first page
    const currentPage = currentIdx !== -1 ? PAGES[currentIdx] : PAGES[0];
    const isLastPage  = currentIdx === PAGES.length - 1;
    const nextPage    = !isLastPage ? PAGES[currentIdx + 1] : null;

    // ── Build overlay DOM ─────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'lcg-pt-overlay';
    overlay.innerHTML = `
        <div id="lcg-pt-label">
            <span id="lcg-pt-label-going">→ ${PAGE_LABELS[nextPage] || nextPage || ''}</span>
        </div>
    `;
    overlay.style.cssText = `
        position: fixed; inset: 0;
        z-index: 99999;
        background: #000;
        transform: translateY(100%);
        pointer-events: none;
        will-change: transform;
        display: flex; align-items: center; justify-content: center;
    `;

    const labelStyle = `
        #lcg-pt-label {
            font-family: 'Epilogue', 'Manrope', sans-serif;
            font-size: clamp(18px, 4vw, 48px);
            font-weight: 900;
            letter-spacing: -0.03em;
            color: #daff3d;
            text-transform: uppercase;
            opacity: 0;
            transform: translateY(16px);
            transition: opacity 0.25s ease 0.15s, transform 0.35s ease 0.15s;
        }
        #lcg-pt-label.visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    const s = document.createElement('style');
    s.textContent = labelStyle;
    document.head.appendChild(s);
    document.body.appendChild(overlay);

    // ── Entrance: new page slides in from behind the overlay ──
    const fromStorage = sessionStorage.getItem('lcg_navigating');
    if (fromStorage) {
        sessionStorage.removeItem('lcg_navigating');
        // Overlay starts covering page, sweep it away
        overlay.style.transform = 'translateY(0%)';
        overlay.style.transition = 'none';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (typeof gsap !== 'undefined') {
                    gsap.to(overlay, {
                        translateY: '-100%',
                        duration: 0.75,
                        ease: 'power3.inOut',
                        onStart: () => {
                            overlay.style.pointerEvents = 'none';
                        }
                    });
                } else {
                    overlay.style.transform = 'translateY(-100%)';
                    overlay.style.transition = 'transform 0.75s ease-in-out';
                }
            });
        });
    }

    // ── Exit trigger ─────────────────────────────────────────
    let isAnimating   = false;
    let overScrollAcc = 0;
    const TRIGGER_THRESHOLD = 60; // one firm flick

    function isAtBottom() {
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        // If page has no real scroll range (overflow:hidden, single-screen, custom scroller)
        // treat any downward wheel as "at bottom"
        if (maxScroll < 10) return true;
        return Math.round(window.scrollY) >= maxScroll - 4;
    }

    function triggerExit() {
        if (isAnimating || isLastPage || !nextPage) return;
        isAnimating = true;
        overScrollAcc = 0;

        const label = overlay.querySelector('#lcg-pt-label');
        const going = overlay.querySelector('#lcg-pt-label-going');
        if (going && nextPage) going.textContent = '→ ' + (PAGE_LABELS[nextPage] || nextPage);

        overlay.style.pointerEvents = 'all';

        if (typeof gsap !== 'undefined') {
            // Phase 1: Overlay sweeps up from below (0.6s)
            gsap.to(overlay, {
                translateY: '0%',
                duration: 0.62,
                ease: 'power3.inOut',
                onStart: () => {
                    if (label) label.classList.add('visible');
                },
                onComplete: () => {
                    sessionStorage.setItem('lcg_navigating', '1');
                    window.location.href = nextPage;
                }
            });

            // Simultaneously scale body down subtly (cinematic pull-back)
            gsap.to(document.body, {
                scale: 0.97,
                duration: 0.62,
                ease: 'power2.in',
                transformOrigin: 'center center'
            });
        } else {
            // Fallback if GSAP is missing
            overlay.style.transform = 'translateY(0%)';
            overlay.style.transition = 'transform 0.62s ease-in-out';
            if (label) label.classList.add('visible');
            setTimeout(() => {
                sessionStorage.setItem('lcg_navigating', '1');
                window.location.href = nextPage;
            }, 650);
        }
    }

    // ── Wheel listener ────────────────────────────────────────
    window.addEventListener('wheel', (e) => {
        if (isAnimating || isLastPage) return;

        if (isAtBottom() && e.deltaY > 0) {
            overScrollAcc += e.deltaY;
            if (overScrollAcc >= TRIGGER_THRESHOLD) triggerExit();
        } else {
            overScrollAcc = 0;
        }
    }, { passive: true });

    // ── Touch swipe listener (mobile) ────────────────────────
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (isAnimating || isLastPage) return;
        const dy = touchStartY - e.changedTouches[0].clientY;
        if (dy > 60 && isAtBottom()) triggerExit();
    }, { passive: true });

    // ── "Next Page" pill ───────────────────────
    window.addEventListener('DOMContentLoaded', () => {
        // Don't show pill on the last page
        if (isLastPage || !nextPage) return;

        // Try to find a footer, or a main-container, or fallback to body
        const container = document.querySelector('footer') || 
                          document.querySelector('main') || 
                          document.querySelector('.main-container') ||
                          document.querySelector('.pg') ||
                          document.body;
        
        if (!container) return;

        const pill = document.createElement('div');
        pill.style.cssText = 'margin-top: 32px; text-align: center; padding-bottom: 40px; position: relative; z-index: 10;';
        pill.innerHTML = `
            <button id="lcg-next-page-btn"
                style="
                    display: inline-flex; align-items: center; gap: 10px;
                    font-family: 'Manrope', 'Epilogue', sans-serif;
                    font-size: 11px; font-weight: 700;
                    letter-spacing: 0.3em; text-transform: uppercase;
                    color: #daff3d;
                    border: 1px solid rgba(218,255,61,0.25);
                    background: rgba(218,255,61,0.04);
                    padding: 14px 28px; border-radius: 100px;
                    cursor: pointer; transition: all 0.25s ease;
                    backdrop-filter: blur(10px);
                "
                onmouseover="this.style.background='rgba(218,255,61,0.12)';this.style.borderColor='rgba(218,255,61,0.6)';"
                onmouseout="this.style.background='rgba(218,255,61,0.04)';this.style.borderColor='rgba(218,255,61,0.25)';"
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L14 8L8 14M14 8H2" stroke="#daff3d" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Next: ${PAGE_LABELS[nextPage] || nextPage}
            </button>
        `;
        container.appendChild(pill);
        document.getElementById('lcg-next-page-btn')?.addEventListener('click', () => triggerExit());
    });

    // ── Also intercept internal nav links for smooth transitions ─
    window.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            // Only intercept same-directory .html links (not anchors, not external)
            if (!href) return;
            if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
            // Check if it's one of our PAGES
            const targetPage = href.split('/').pop();
            const isMatch = PAGES.some(p => p === targetPage || (p.replace('.html', '') === targetPage));
            if (!isMatch && !href.endsWith('.html')) return;

            a.addEventListener('click', (e) => {
                if (isAnimating) return;
                
                // Don't intercept if it's not a known transition page
                const destPage = href.split('/').pop();
                if (!PAGES.includes(destPage) && !PAGES.includes(destPage + '.html')) return;

                e.preventDefault();
                isAnimating = true;

                const dest = href;
                const label = overlay.querySelector('#lcg-pt-label');
                const going = overlay.querySelector('#lcg-pt-label-going');
                const pageName = destPage.endsWith('.html') ? destPage : destPage + '.html';
                
                if (going) going.textContent = '→ ' + (PAGE_LABELS[pageName] || pageName);
                overlay.style.pointerEvents = 'all';

                if (typeof gsap !== 'undefined') {
                    gsap.to(overlay, {
                        translateY: '0%',
                        duration: 0.55,
                        ease: 'power3.inOut',
                        onStart: () => { if (label) label.classList.add('visible'); },
                        onComplete: () => {
                            sessionStorage.setItem('lcg_navigating', '1');
                            window.location.href = dest;
                        }
                    });

                    gsap.to(document.body, {
                        scale: 0.97,
                        duration: 0.55,
                        ease: 'power2.in',
                        transformOrigin: 'center center'
                    });
                } else {
                    overlay.style.transform = 'translateY(0%)';
                    overlay.style.transition = 'transform 0.55s ease-in-out';
                    if (label) label.classList.add('visible');
                    setTimeout(() => {
                        sessionStorage.setItem('lcg_navigating', '1');
                        window.location.href = dest;
                    }, 600);
                }
            });
        });
    });

})();
