/**
 * ==================== BLOG.JS ====================
 * Blog public : chargement, pagination, recherche, lecture article
 */

const API      = 'https://api.sterveshop.cloud';
const PER_PAGE = 9;

/* ==================== STATE ==================== */
let allArticles  = [];
let currentPage  = 1;
let searchQuery  = '';
let searchTimer  = null;

/* ==================== UTILS ==================== */
function countWords(text = '') {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function readTime(text = '') {
    const words = countWords(text);
    return Math.max(1, Math.ceil(words / 200));
}

function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
}

function escapeHtml(str = '') {
    return str
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
}

/**
 * Converts markdown-like content to safe HTML
 * Handles: ## headings, **bold**, bullet lists, paragraphs
 */
function renderContent(raw = '') {
    const lines   = raw.split('\n');
    const output  = [];
    let inList    = false;

    for (let line of lines) {
        line = line.trim();
        if (!line) {
            if (inList) { output.push('</ul>'); inList = false; }
            continue;
        }

        // H2
        if (line.startsWith('## ')) {
            if (inList) { output.push('</ul>'); inList = false; }
            output.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
            continue;
        }

        // H3
        if (line.startsWith('### ')) {
            if (inList) { output.push('</ul>'); inList = false; }
            output.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
            continue;
        }

        // H1 (sometimes generated)
        if (line.startsWith('# ')) {
            if (inList) { output.push('</ul>'); inList = false; }
            output.push(`<h2>${escapeHtml(line.slice(2))}</h2>`);
            continue;
        }

        // Bullet list
        if (line.startsWith('- ') || line.startsWith('* ')) {
            if (!inList) { output.push('<ul>'); inList = true; }
            const content = inlineMd(line.slice(2));
            output.push(`<li>${content}</li>`);
            continue;
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
            if (inList) { output.push('</ul>'); inList = false; }
            // simple: treat as paragraph for now
            output.push(`<p>${inlineMd(line)}</p>`);
            continue;
        }

        // Paragraph
        if (inList) { output.push('</ul>'); inList = false; }
        output.push(`<p>${inlineMd(line)}</p>`);
    }

    if (inList) output.push('</ul>');
    return output.join('\n');
}

function inlineMd(text = '') {
    // Bold
    text = escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g,     '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g,     '<em>$1</em>');
    return text;
}

/* ==================== FETCH ==================== */
async function fetchArticles() {
    showLoading(true);
    try {
        // Fetch all published articles (high limit)
        const res = await fetch(`${API}/api/blog/?page=1&limit=200`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        allArticles = (data.articles || []).filter(a => a.is_published);

        // Update count in hero
        const countEl = document.getElementById('total-count');
        if (countEl) {
            animateCount(countEl, allArticles.length);
        }

        renderPage();
    } catch(e) {
        console.error('fetchArticles error:', e);
        showEmpty(true);
    } finally {
        showLoading(false);
    }
}

function animateCount(el, target) {
    let start = 0;
    const dur = 1200;
    const t0  = performance.now();
    const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(ease * target);
        if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

/* ==================== RENDER ==================== */
function getFiltered() {
    if (!searchQuery) return allArticles;
    const q = searchQuery.toLowerCase();
    return allArticles.filter(a =>
        (a.title   || '').toLowerCase().includes(q) ||
        (a.excerpt || '').toLowerCase().includes(q)
    );
}

function renderPage() {
    const filtered = getFiltered();
    const total    = filtered.length;
    const pages    = Math.ceil(total / PER_PAGE);

    // Clamp page
    if (currentPage > pages && pages > 0) currentPage = pages;
    if (currentPage < 1) currentPage = 1;

    const start    = (currentPage - 1) * PER_PAGE;
    const slice    = filtered.slice(start, start + PER_PAGE);

    const grid  = document.getElementById('blog-grid');
    const empty = document.getElementById('blog-empty');

    if (!slice.length) {
        showEmpty(true);
        if (grid) grid.innerHTML = '';
        renderPagination(0, 0);
        return;
    }

    showEmpty(false);
    grid.innerHTML = slice.map((a, i) => cardHTML(a, i === 0 && currentPage === 1 && !searchQuery)).join('');

    // Animate cards in
    grid.querySelectorAll('.blog-card').forEach((card, i) => {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity    = '1';
            card.style.transform  = 'translateY(0)';
        }, i * 60);
    });

    renderPagination(pages, currentPage);
}

function cardHTML(article, featured = false) {
    const words   = countWords(article.content);
    const rt      = readTime(article.content);
    const date    = formatDate(article.created_at);
    const excerpt = (article.excerpt || '').substring(0, 160) + (article.excerpt?.length > 160 ? '...' : '');

    return `
    <article class="blog-card ${featured ? 'blog-card--featured' : ''}" onclick="openArticle(${article.id})">
        <div class="blog-card__header"></div>
        <div class="blog-card__body">
            <div class="blog-card__meta">
                <span class="tag tag--green" style="font-size:0.65rem">SEO</span>
                <span class="blog-card__date">${date}</span>
                <span class="blog-card__date">· ${rt} min de lecture</span>
            </div>
            <h2 class="blog-card__title">${escapeHtml(article.title)}</h2>
            <p class="blog-card__excerpt">${escapeHtml(excerpt)}</p>
        </div>
        <div class="blog-card__footer">
            <span class="blog-card__read">Lire l'article <span>→</span></span>
            <span class="blog-card__words">${words} mots</span>
        </div>
    </article>`;
}

/* ==================== PAGINATION ==================== */
function renderPagination(totalPages, current) {
    const pag  = document.getElementById('blog-pagination');
    const nums = document.getElementById('page-numbers');
    const prev = document.getElementById('prev-btn');
    const next = document.getElementById('next-btn');

    if (!pag) return;

    if (totalPages <= 1) { pag.style.display = 'none'; return; }
    pag.style.display = 'flex';

    prev.disabled = current <= 1;
    next.disabled = current >= totalPages;

    // Page buttons
    nums.innerHTML = '';
    const range = getPageRange(current, totalPages);
    range.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'blog-pagination__page' + (p === current ? ' active' : '');
        btn.textContent = p;
        btn.onclick = () => goToPage(p);
        nums.appendChild(btn);
    });
}

function getPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current, current - 1, current + 1].filter(p => p >= 1 && p <= total));
    return [...pages].sort((a, b) => a - b);
}

function goToPage(page) {
    currentPage = page;
    renderPage();
    window.scrollTo({ top: document.querySelector('.blog-content')?.offsetTop - 80 || 0, behavior: 'smooth' });
}

function changePage(dir) {
    const filtered  = getFiltered();
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    goToPage(Math.max(1, Math.min(totalPages, currentPage + dir)));
}

/* ==================== SEARCH ==================== */
function handleSearch() {
    const input = document.getElementById('blog-search');
    const clear = document.getElementById('search-clear');
    searchQuery = input?.value.trim() || '';

    if (clear) clear.style.display = searchQuery ? 'block' : 'none';

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        currentPage = 1;
        renderPage();
    }, 300);
}

function clearSearch() {
    const input = document.getElementById('blog-search');
    const clear = document.getElementById('search-clear');
    if (input) input.value = '';
    if (clear) clear.style.display = 'none';
    searchQuery = '';
    currentPage = 1;
    renderPage();
}

/* ==================== ARTICLE MODAL ==================== */
function openArticle(id) {
    const article = allArticles.find(a => a.id === id);
    if (!article) return;

    const words = countWords(article.content);
    const rt    = readTime(article.content);

    // Fill modal
    document.getElementById('modal-meta').innerHTML = `
        <span class="tag tag--green"><span class="tag__dot"></span>SEO Optimisé</span>
        <span style="font-size:var(--font-size-xs);color:var(--white-muted)">${formatDate(article.created_at)}</span>
        <span style="font-size:var(--font-size-xs);color:var(--white-muted)">· ${rt} min de lecture</span>
    `;

    document.getElementById('modal-title').textContent   = article.title   || '';
    document.getElementById('modal-excerpt').textContent = article.excerpt  || '';
    document.getElementById('modal-words').textContent   = `${words} mots`;
    document.getElementById('modal-content').innerHTML   = renderContent(article.content || '');

    // Show modal
    const overlay = document.getElementById('article-modal');
    overlay.classList.add('visible');
    overlay.scrollTop = 0;
    document.body.style.overflow = 'hidden';

    // Update URL (without reload)
    history.pushState({ articleId: id }, '', `?article=${article.slug || id}`);
}

function closeArticle() {
    const overlay = document.getElementById('article-modal');
    overlay?.classList.remove('visible');
    document.body.style.overflow = '';
    history.pushState({}, '', window.location.pathname);
}

/* ==================== UI HELPERS ==================== */
function showLoading(show) {
    const el = document.getElementById('blog-loading');
    if (el) el.style.display = show ? 'block' : 'none';
}

function showEmpty(show) {
    const el = document.getElementById('blog-empty');
    if (el) el.style.display = show ? 'flex' : 'none';
}

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', () => {
    fetchArticles();

    // Keyboard: Escape closes article modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('article-modal');
            if (modal?.classList.contains('visible')) closeArticle();
        }
    });

    // Handle direct link with ?article=slug
    const params = new URLSearchParams(window.location.search);
    const slug   = params.get('article');
    if (slug) {
        // Wait for articles to load then open
        const waitAndOpen = setInterval(() => {
            if (allArticles.length) {
                clearInterval(waitAndOpen);
                const article = allArticles.find(a => a.slug === slug || String(a.id) === slug);
                if (article) openArticle(article.id);
            }
        }, 200);
    }

    console.log('✅ Blog loaded');
});

// Expose globals
window.handleSearch  = handleSearch;
window.clearSearch   = clearSearch;
window.changePage    = changePage;
window.openArticle   = openArticle;
window.closeArticle  = closeArticle;
