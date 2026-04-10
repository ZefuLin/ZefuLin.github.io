/* ===== CANVAS PARTICLE NETWORK BACKGROUND ===== */
(function () {
    var canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var W, H;
    var particles = [];
    var mouse = { x: -9999, y: -9999 };
    var rafId;

    var PARTICLE_COUNT = 62;
    var MAX_DIST       = 130;
    var MOUSE_RADIUS   = 180;
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function makeParticle() {
        return {
            x:  Math.random() * W,
            y:  Math.random() * H,
            vx: (Math.random() - 0.5) * 0.30,
            vy: (Math.random() - 0.5) * 0.30,
            r:  Math.random() * 1.8 + 1.0,
            a:  Math.random() * 0.22 + 0.10
        };
    }

    function init() {
        resize();
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(makeParticle());
        }
    }

    function tick() {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -20)     p.x = W + 20;
            if (p.x > W + 20)  p.x = -20;
            if (p.y < -20)     p.y = H + 20;
            if (p.y > H + 20)  p.y = -20;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        var n = particles.length;

        for (var i = 0; i < n; i++) {
            var p = particles[i];
            var mdx = p.x - mouse.x;
            var mdy = p.y - mouse.y;
            var nearMouse = (mdx * mdx + mdy * mdy) < MOUSE_RADIUS * MOUSE_RADIUS;
            var connDist  = nearMouse ? MAX_DIST * 1.5 : MAX_DIST;
            var cd2       = connDist * connDist;

            for (var j = i + 1; j < n; j++) {
                var q   = particles[j];
                var dx  = p.x - q.x;
                var dy  = p.y - q.y;
                var d2  = dx * dx + dy * dy;
                if (d2 < cd2) {
                    var t      = 1 - Math.sqrt(d2) / connDist;
                    var lineA  = nearMouse ? t * 0.22 : t * 0.09;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = 'rgba(14,165,233,' + lineA.toFixed(3) + ')';
                    ctx.lineWidth   = 1;
                    ctx.stroke();
                }
            }
        }

        for (var i = 0; i < n; i++) {
            var p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(14,165,233,' + p.a.toFixed(3) + ')';
            ctx.fill();
        }
    }

    function loop() {
        tick();
        draw();
        rafId = requestAnimationFrame(loop);
    }

    window.addEventListener('resize', function () {
        resize();
        if (prefersReduced) draw();
    }, { passive: true });

    document.addEventListener('mousemove', function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
        mouse.x = -9999;
        mouse.y = -9999;
    });

    init();
    if (prefersReduced) {
        draw();
    } else {
        loop();
    }
}());


/* ===== PUBLICATIONS + UI ===== */
(function () {
    /* ----- Venue badge class ----- */
    var RE_CV       = /\b(CVPR|ICCV|ECCV|WACV|BMVC)\b/i;
    var RE_ML       = /\b(NeurIPS|ICML|ICLR|AAAI|IJCAI|ACL|EMNLP|NAACL|ICASSP)\b/i;
    var RE_ROBOTICS = /\b(ICRA|IROS|CoRL|RSS|HRI|RA-L|RAL)\b/i;

    function venueBadgeClass(venue) {
        if (!venue)                  return 'default';
        if (RE_CV.test(venue))       return 'cv';
        if (RE_ML.test(venue))       return 'ml';
        if (RE_ROBOTICS.test(venue)) return 'robotics';
        return 'default';
    }

    /* ----- HTML helpers ----- */
    var listEl = document.getElementById('pub-list');

    function escapeHtml(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function highlightMe(authors) {
        return escapeHtml(authors || '').replace(/Zefu Lin/g, '<span class="me">Zefu Lin</span>');
    }

    function trimUrl(s) {
        return s == null ? '' : String(s).trim();
    }

    function thumbHtml(p, arxiv) {
        var src = trimUrl(p.image);
        if (!src) return '';
        var alt = escapeHtml(p.title || '');
        var img = '<img src="' + escapeHtml(src) + '" alt="' + alt + '" loading="lazy" width="336" height="210">';
        if (arxiv) {
            return '<a class="pub-thumb" href="' + escapeHtml(arxiv) + '" target="_blank" rel="noopener noreferrer">' + img + '</a>';
        }
        return '<div class="pub-thumb">' + img + '</div>';
    }

    /* ----- Sort papers by year+month descending ----- */
    function sortPapers(papers) {
        return papers.slice().sort(function (a, b) {
            var ay = a.year  || 0, by = b.year  || 0;
            var am = a.month || 0, bm = b.month || 0;
            return (by - ay) || (bm - am);
        });
    }

    /* ----- Render papers ----- */
    function renderPapers(papers) {
        papers = sortPapers(papers);
        if (!Array.isArray(papers) || papers.length === 0) {
            listEl.innerHTML = '<p class="pub-empty">No publications yet. Add entries in <code style="font-family:JetBrains Mono,monospace;font-size:.82em">publications/papers.json</code>.</p>';
            return;
        }

        listEl.innerHTML = papers.map(function (p) {
            var title       = escapeHtml(p.title || 'Untitled');
            var venue       = escapeHtml(p.venue || '');
            var arxiv       = trimUrl(p.arxiv);
            var authorsHtml = highlightMe(p.authors);

            var venueBadge = venue
                ? '<span class="pub-venue-badge ' + venueBadgeClass(p.venue) + '">' + venue + '</span>'
                : '';

            var titleLink = arxiv
                ? '<a href="' + escapeHtml(arxiv) + '" target="_blank" rel="noopener noreferrer">' + title + '</a>'
                : title;

            var links = '';
            if (arxiv) {
                links += '<a class="pub-arxiv" href="' + escapeHtml(arxiv) + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> arXiv</a>';
            }
            if (trimUrl(p.github).length > 0) {
                links += '<a class="pub-github" href="' + escapeHtml(trimUrl(p.github)) + '" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> Code</a>';
            }
            if (trimUrl(p.project).length > 0) {
                links += '<a class="pub-project" href="' + escapeHtml(trimUrl(p.project)) + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-globe"></i> Project</a>';
            }

            var thumb = thumbHtml(p, arxiv);
            var inner =
                (venueBadge ? '<div style="margin-bottom:.1rem">' + venueBadge + '</div>' : '') +
                '<div class="pub-title">' + titleLink + '</div>' +
                (authorsHtml ? '<div class="pub-authors">' + authorsHtml + '</div>' : '') +
                (links ? '<div class="pub-links">' + links + '</div>' : '');

            if (thumb) {
                return (
                    '<article class="pub-item pub-item--row">' +
                        thumb +
                        '<div class="pub-main">' + inner + '</div>' +
                    '</article>'
                );
            }
            return '<article class="pub-item">' + inner + '</article>';
        }).join('');
    }

    fetch('publications/papers.json', { cache: 'no-store' })
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(renderPapers)
        .catch(function () {
            listEl.innerHTML = '<p class="pub-error">Could not load <code style="font-family:JetBrains Mono,monospace;font-size:.82em">publications/papers.json</code>. Open the site via a local static server (not <code style="font-family:JetBrains Mono,monospace;font-size:.82em">file://</code>), or deploy to GitHub Pages.</p>';
        });

    /* ----- Scroll fade-in ----- */
    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.07 });

        document.querySelectorAll('.fade-in').forEach(function (el) {
            observer.observe(el);
        });
    } else {
        document.querySelectorAll('.fade-in').forEach(function (el) {
            el.classList.add('visible');
        });
    }

    /* ----- Nav scroll shadow + back-to-top ----- */
    var nav       = document.getElementById('main-nav');
    var backToTop = document.getElementById('back-to-top');

    window.addEventListener('scroll', function () {
        nav.classList.toggle('scrolled', window.scrollY > 30);
        backToTop.classList.toggle('visible', window.scrollY > 280);
    }, { passive: true });

    backToTop.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}());
