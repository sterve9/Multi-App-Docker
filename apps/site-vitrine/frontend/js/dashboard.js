/**
 * ==================== DASHBOARD.JS ====================
 * Logique complète du dashboard : auth, vues, génération, CRUD articles
 */

const API = 'https://api.sterveshop.cloud';

/* ==================== STATE ==================== */
let allArticles      = [];
let currentFilter    = 'all';
let currentArticleId = null;
let userQuota        = { plan: 'free', remaining: 3, generation_limit: 3, generation_count: 0 };

/* ==================== UTILS ==================== */
function getToken() { return localStorage.getItem('sterve_token'); }
function getEmail() { return localStorage.getItem('sterve_email'); }
function getName()  { return localStorage.getItem('sterve_name'); }

function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className   = `toast toast--${type} show`;
    setTimeout(() => el.classList.remove('show'), 3200);
}

function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
}

function stripMarkdown(text = '') {
    return text
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

async function apiRequest(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
    if (res.status === 401) { logout(); return null; }
    return res;
}

function parseArticlesResponse(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.articles)) return data.articles;
    return [];
}

/* ==================== AUTH GUARD ==================== */
function logout() {
    localStorage.removeItem('sterve_token');
    localStorage.removeItem('sterve_email');
    localStorage.removeItem('sterve_name');
    window.location.href = 'index.html';
}

function initAuth() {
    const token = getToken();
    if (!token) { window.location.href = 'index.html'; return false; }

    const email   = getEmail() || '';
    const name    = getName()  || '';
    const display = name || email.split('@')[0];
    const initial = display.charAt(0).toUpperCase();

    const emailEl  = document.getElementById('sidebar-email');
    const avatarEl = document.getElementById('sidebar-avatar');
    const greetEl  = document.getElementById('greeting-name');

    if (emailEl)  emailEl.textContent  = email;
    if (avatarEl) avatarEl.textContent = initial;
    if (greetEl)  greetEl.textContent  = display;

    document.getElementById('sidebar-logout')?.addEventListener('click', logout);
    return true;
}

/* ==================== QUOTA ==================== */
async function loadQuota() {
    try {
        const res = await apiRequest('/api/auth/quota');
        if (!res || !res.ok) return;
        const data = await res.json();
        userQuota = data;
        renderQuota();
    } catch(e) {
        console.error('loadQuota error:', e);
    }
}

function renderQuota() {
    const el      = document.getElementById('stat-quota');
    const planEl  = document.getElementById('sidebar-plan');
    const limitEl = document.getElementById('quota-limit-label');

    if (el) {
        const target = userQuota.remaining;
        const dur    = 900;
        const t0     = performance.now();
        const tick   = (now) => {
            const p = Math.min((now - t0) / dur, 1);
            el.textContent = Math.round(p * target);
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    if (planEl) {
        planEl.textContent = userQuota.plan === 'pro' ? 'Plan Pro' : 'Plan Gratuit';
        planEl.className   = userQuota.plan === 'pro'
            ? 'sidebar__plan sidebar__plan--pro'
            : 'sidebar__plan';
    }

    if (limitEl) {
        limitEl.textContent = userQuota.plan === 'pro'
            ? 'Illimité'
            : `${userQuota.generation_count}/${userQuota.generation_limit} ce mois`;
    }
}

/* ==================== SIDEBAR MOBILE ==================== */
function initSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    const menuBtn  = document.getElementById('topbar-menu');
    const closeBtn = document.getElementById('sidebar-close');

    menuBtn?.addEventListener('click',  () => { sidebar.classList.add('open'); overlay.classList.add('show'); });
    closeBtn?.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });
    overlay?.addEventListener('click',  () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });
}

/* ==================== VIEW SWITCHING ==================== */
const VIEWS = {
    overview: { el: 'view-overview', label: 'Vue d\'ensemble' },
    generate: { el: 'view-generate', label: 'Générer un article' },
    articles: { el: 'view-articles', label: 'Mes articles' }
};

function switchView(viewName) {
    Object.values(VIEWS).forEach(v => {
        const el = document.getElementById(v.el);
        if (el) el.style.display = 'none';
    });

    const view = VIEWS[viewName];
    if (!view) return;
    const el = document.getElementById(view.el);
    if (el) { el.style.display = 'block'; el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; }

    const bc = document.getElementById('topbar-current');
    if (bc) bc.textContent = view.label;

    document.querySelectorAll('.sidebar__nav-link[data-view]').forEach(link => {
        link.classList.toggle('active', link.dataset.view === viewName);
    });

    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');

    if (viewName === 'overview') loadOverview();
    if (viewName === 'articles') loadArticles();
}

function initNavLinks() {
    document.querySelectorAll('.sidebar__nav-link[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.dataset.view);
        });
    });
}

/* ==================== LOAD OVERVIEW ==================== */
async function loadOverview() {
    try {
        const res = await apiRequest('/api/blog/me?page=1&limit=50');
        if (!res) return;
        const data = await res.json();

        const articles  = parseArticlesResponse(data);
        const total     = articles.length;
        const published = articles.filter(a => a.is_published).length;
        const drafts    = articles.filter(a => !a.is_published).length;

        document.getElementById('stat-total')?.setAttribute('data-count', total);
        document.getElementById('stat-published')?.setAttribute('data-count', published);
        document.getElementById('stat-drafts')?.setAttribute('data-count', drafts);

        animateStatValues();
        await loadQuota();

        renderRecentArticles(articles.slice(0, 5));
        allArticles = articles;
    } catch(e) {
        console.error('loadOverview error:', e);
    }
}

function animateStatValues() {
    ['stat-total','stat-published','stat-drafts'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const target = parseInt(el.dataset.count || '0');
        const dur    = 900;
        const t0     = performance.now();
        const tick   = (now) => {
            const p = Math.min((now - t0) / dur, 1);
            el.textContent = Math.round(p * target);
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
}

function renderRecentArticles(articles) {
    const list    = document.getElementById('recent-list');
    const emptyEl = document.getElementById('recent-empty');
    if (!list) return;

    if (!articles.length) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    list.innerHTML = articles.map(a => articleCardHTML(a, 'list')).join('');
    attachCardListeners(list);
}

/* ==================== LOAD ARTICLES ==================== */
async function loadArticles() {
    const loading = document.getElementById('articles-loading');
    const emptyEl = document.getElementById('articles-empty');
    const grid    = document.getElementById('articles-grid');

    if (loading) loading.style.display = 'flex';
    if (emptyEl) emptyEl.style.display = 'none';
    if (grid)    grid.innerHTML = '';

    try {
        const res = await apiRequest('/api/blog/me?page=1&limit=50');
        if (!res) return;
        const data = await res.json();
        allArticles = parseArticlesResponse(data);
        renderArticlesGrid();
    } catch(e) {
        console.error('loadArticles error:', e);
        toast('Erreur lors du chargement des articles', 'error');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

function filterArticles() { renderArticlesGrid(); }

function setFilter(btn) {
    document.querySelectorAll('.articles-filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderArticlesGrid();
}

function renderArticlesGrid() {
    const grid    = document.getElementById('articles-grid');
    const emptyEl = document.getElementById('articles-empty');
    const search  = (document.getElementById('search-input')?.value || '').toLowerCase();
    if (!grid) return;

    let filtered = allArticles;
    if (currentFilter === 'published') filtered = filtered.filter(a => a.is_published);
    if (currentFilter === 'draft')     filtered = filtered.filter(a => !a.is_published);
    if (search) {
        filtered = filtered.filter(a =>
            (a.title || '').toLowerCase().includes(search) ||
            (a.slug  || '').toLowerCase().includes(search)
        );
    }

    if (!filtered.length) {
        if (emptyEl) emptyEl.style.display = 'flex';
        grid.innerHTML = '';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    grid.innerHTML = filtered.map(a => articleCardHTML(a, 'grid')).join('');
    attachCardListeners(grid);
}

function articleCardHTML(article, mode = 'list') {
    const isPublished = article.is_published;
    const statusClass = isPublished ? 'published' : 'draft';
    const badgeLabel  = isPublished ? 'Publié' : 'Brouillon';
    const words       = countWords(article.content);

    if (mode === 'list') {
        return `
        <div class="article-card" data-id="${article.id}">
            <div class="article-card__status article-card__status--${statusClass}"></div>
            <div class="article-card__body">
                <div class="article-card__title">${escapeHtml(article.title)}</div>
                <div class="article-card__meta">
                    <span class="article-card__badge article-card__badge--${statusClass}">${badgeLabel}</span>
                    <span>${formatDate(article.created_at)}</span>
                    <span>${words} mots</span>
                </div>
            </div>
            <div class="article-card__actions">
                ${!isPublished
                    ? `<button class="article-card__action article-card__action--publish" title="Publier" onclick="togglePublish(${article.id}, true)">✓</button>`
                    : `<button class="article-card__action" title="Dépublier" onclick="togglePublish(${article.id}, false)">◌</button>`}
                <button class="article-card__action" title="Modifier" onclick="openEditModal(${article.id})">✏</button>
                <button class="article-card__action article-card__action--danger" title="Supprimer" onclick="deleteArticle(${article.id})">✕</button>
            </div>
        </div>`;
    }

    return `
    <div class="article-card article-card--grid" data-id="${article.id}">
        <div class="article-card__body" style="width:100%">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div class="article-card__status article-card__status--${statusClass}"></div>
                <span class="article-card__badge article-card__badge--${statusClass}">${badgeLabel}</span>
            </div>
            <div class="article-card__title" style="white-space:normal;margin-bottom:8px">${escapeHtml(article.title)}</div>
            <div class="article-card__meta">
                <span>${formatDate(article.created_at)}</span>
                <span>${words} mots</span>
            </div>
        </div>
        <div class="article-card__actions" style="align-self:flex-end">
            ${!isPublished
                ? `<button class="article-card__action article-card__action--publish" title="Publier" onclick="togglePublish(${article.id}, true)">✓</button>`
                : `<button class="article-card__action" title="Dépublier" onclick="togglePublish(${article.id}, false)">◌</button>`}
            <button class="article-card__action" title="Modifier" onclick="openEditModal(${article.id})">✏</button>
            <button class="article-card__action article-card__action--danger" title="Supprimer" onclick="deleteArticle(${article.id})">✕</button>
        </div>
    </div>`;
}

function attachCardListeners(container) { /* onclick inline suffisent */ }

function escapeHtml(str = '') {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ==================== QUICK GENERATE (Overview) ==================== */
async function quickGenerate() {
    const topic  = document.getElementById('quick-topic')?.value.trim();
    const tone   = document.getElementById('quick-tone')?.value;
    const btn    = document.getElementById('quick-btn');
    const status = document.getElementById('quick-status');
    const stText = document.getElementById('quick-status-text');

    if (!topic) { document.getElementById('quick-topic')?.focus(); return; }

    if (userQuota.remaining <= 0) {
        toast(`Quota mensuel atteint (${userQuota.generation_limit}/mois). Passez au plan Pro.`, 'error');
        return;
    }

    btn.disabled         = true;
    status.style.display = 'flex';
    stText.textContent   = 'Génération en cours...';

    try {
        const res = await apiRequest('/api/blog/generate', {
            method: 'POST',
            body:   JSON.stringify({ topic, tone })
        });
        if (!res) return;

        if (res.status === 429) {
            const data = await res.json();
            toast(data.detail || 'Quota mensuel atteint. Passez au plan Pro.', 'error');
            await loadQuota();
            return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur');

        stText.textContent = `✓ Article "${data.title}" généré !`;
        toast(`✓ Article généré : "${data.title}"`, 'success');
        document.getElementById('quick-topic').value = '';

        setTimeout(() => {
            loadOverview();
            status.style.display = 'none';
        }, 2500);
    } catch(e) {
        toast('Erreur lors de la génération.', 'error');
        status.style.display = 'none';
    } finally {
        btn.disabled = false;
    }
}

/* ==================== FULL GENERATE (Generate view) ==================== */
function showGenState(state) {
    ['gen-idle','gen-loading','gen-output'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === state ? 'block' : 'none';
    });
}

async function animateSteps(steps) {
    for (let i = 0; i < steps.length; i++) {
        const el = document.getElementById(`step-${i+1}`);
        if (!el) continue;
        if (i > 0) {
            const prev = document.getElementById(`step-${i}`);
            if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
        }
        el.classList.add('active');
        await new Promise(r => setTimeout(r, 800));
    }
    const last = document.getElementById(`step-${steps.length}`);
    if (last) { last.classList.remove('active'); last.classList.add('done'); }
}

async function generateArticle() {
    const topic = document.getElementById('gen-topic')?.value.trim();
    const tone  = document.getElementById('gen-tone')?.value;
    const btn   = document.getElementById('gen-btn');
    const errEl = document.getElementById('gen-error');

    errEl.style.display = 'none';
    if (!topic) {
        errEl.textContent   = 'Le sujet est obligatoire.';
        errEl.style.display = 'block';
        document.getElementById('gen-topic')?.focus();
        return;
    }

    if (userQuota.remaining <= 0) {
        errEl.textContent   = `Quota mensuel atteint (${userQuota.generation_limit}/mois). Passez au plan Pro pour un accès illimité.`;
        errEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    for (let i = 1; i <= 5; i++) {
        const s = document.getElementById(`step-${i}`);
        if (s) s.classList.remove('active','done');
    }

    showGenState('gen-loading');
    const stepAnim = animateSteps([1,2,3,4,5]);

    try {
        const res = await apiRequest('/api/blog/generate', {
            method: 'POST',
            body:   JSON.stringify({ topic, tone })
        });
        if (!res) { showGenState('gen-idle'); return; }

        await stepAnim;

        if (res.status === 429) {
            showGenState('gen-idle');
            const data = await res.json();
            errEl.textContent   = data.detail || 'Quota mensuel atteint.';
            errEl.style.display = 'block';
            await loadQuota();
            return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur API');

        currentArticleId = data.id;

        document.getElementById('gen-out-title').textContent    = data.title   || '';
        document.getElementById('gen-out-slug').textContent     = data.slug    || '';
        document.getElementById('gen-out-excerpt').textContent  = data.excerpt || '';
        document.getElementById('gen-out-tone-tag').textContent = tone.charAt(0).toUpperCase() + tone.slice(1);

        const words = countWords(data.content);
        document.getElementById('gen-out-words').textContent   = `${words} mots`;
        document.getElementById('gen-out-content').textContent = stripMarkdown(data.content);

        const editBtn = document.getElementById('gen-edit-btn');
        if (editBtn) {
            const newBtn = editBtn.cloneNode(true);
            editBtn.parentNode.replaceChild(newBtn, editBtn);
            newBtn.addEventListener('click', () => openEditModal(data.id));
        }

        showGenState('gen-output');
        toast('✓ Article généré et sauvegardé !', 'success');
        allArticles.unshift(data);
        await loadQuota();

    } catch(e) {
        console.error(e);
        showGenState('gen-idle');
        errEl.textContent   = e.message || 'Erreur lors de la génération.';
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
    }
}

async function publishArticle() {
    if (!currentArticleId) return;
    await togglePublish(currentArticleId, true);
    toast('✓ Article publié avec succès !', 'success');
}

function generateAnother() {
    currentArticleId = null;
    document.getElementById('gen-topic').value = '';
    showGenState('gen-idle');
    for (let i = 1; i <= 5; i++) {
        const s = document.getElementById(`step-${i}`);
        if (s) s.classList.remove('active','done');
    }
}

/* ==================== CRUD ==================== */
async function togglePublish(id, publish) {
    try {
        const res = await apiRequest(`/api/blog/${id}`, {
            method: 'PUT',
            body:   JSON.stringify({ is_published: publish })
        });
        if (!res || !res.ok) { toast('Erreur lors de la mise à jour.', 'error'); return; }

        toast(publish ? '✓ Article publié !' : '◌ Article dépublié.', 'success');

        const idx = allArticles.findIndex(a => a.id === id);
        if (idx !== -1) allArticles[idx].is_published = publish;

        const currentView = document.querySelector('.sidebar__nav-link.active')?.dataset.view;
        if (currentView === 'articles') renderArticlesGrid();
        if (currentView === 'overview') renderRecentArticles(allArticles.slice(0, 5));
    } catch(e) {
        toast('Erreur réseau.', 'error');
    }
}

async function deleteArticle(id) {
    if (!confirm('Supprimer cet article définitivement ?')) return;
    try {
        const res = await apiRequest(`/api/blog/${id}`, { method: 'DELETE' });
        if (!res || !res.ok) { toast('Erreur lors de la suppression.', 'error'); return; }

        toast('Article supprimé.', 'success');
        allArticles = allArticles.filter(a => a.id !== id);

        const currentView = document.querySelector('.sidebar__nav-link.active')?.dataset.view;
        if (currentView === 'articles') renderArticlesGrid();
        if (currentView === 'overview') loadOverview();
    } catch(e) {
        toast('Erreur réseau.', 'error');
    }
}

/* ==================== EDIT MODAL ==================== */
function openEditModal(id) {
    const article = allArticles.find(a => a.id === id);
    if (!article) { toast('Article introuvable.', 'error'); return; }

    document.getElementById('edit-id').value          = article.id;
    document.getElementById('edit-title').value       = article.title     || '';
    document.getElementById('edit-slug').value        = article.slug      || '';
    document.getElementById('edit-excerpt').value     = article.excerpt   || '';
    document.getElementById('edit-content').value     = article.content   || '';
    document.getElementById('edit-published').checked = article.is_published || false;
    document.getElementById('edit-error').style.display = 'none';

    document.getElementById('edit-modal')?.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    document.getElementById('edit-modal')?.classList.remove('visible');
    document.body.style.overflow = '';
}

async function saveArticle() {
    const id    = parseInt(document.getElementById('edit-id').value);
    const errEl = document.getElementById('edit-error');
    errEl.style.display = 'none';

    const payload = {
        title:        document.getElementById('edit-title').value.trim(),
        slug:         document.getElementById('edit-slug').value.trim(),
        excerpt:      document.getElementById('edit-excerpt').value.trim(),
        content:      document.getElementById('edit-content').value.trim(),
        is_published: document.getElementById('edit-published').checked,
    };

    if (!payload.title) { errEl.textContent = 'Le titre est obligatoire.'; errEl.style.display = 'block'; return; }

    try {
        const res  = await apiRequest(`/api/blog/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        if (!res) return;

        const data = await res.json();
        if (!res.ok) {
            errEl.textContent   = data.detail || 'Erreur lors de la sauvegarde.';
            errEl.style.display = 'block';
            return;
        }

        const idx = allArticles.findIndex(a => a.id === id);
        if (idx !== -1) allArticles[idx] = { ...allArticles[idx], ...data };

        toast('✓ Article sauvegardé !', 'success');
        closeEditModal();

        const currentView = document.querySelector('.sidebar__nav-link.active')?.dataset.view;
        if (currentView === 'articles') renderArticlesGrid();
        if (currentView === 'overview') renderRecentArticles(allArticles.slice(0, 5));
    } catch(e) {
        errEl.textContent   = 'Erreur réseau.';
        errEl.style.display = 'block';
    }
}

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', () => {
    if (!initAuth()) return;

    initSidebar();
    initNavLinks();

    document.getElementById('edit-modal-close')?.addEventListener('click', closeEditModal);
    document.getElementById('edit-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('edit-modal')) closeEditModal();
    });

    loadOverview();
    console.log('✅ Dashboard loaded');
});

// Expose globally
window.switchView      = switchView;
window.quickGenerate   = quickGenerate;
window.generateArticle = generateArticle;
window.publishArticle  = publishArticle;
window.generateAnother = generateAnother;
window.togglePublish   = togglePublish;
window.deleteArticle   = deleteArticle;
window.openEditModal   = openEditModal;
window.closeEditModal  = closeEditModal;
window.saveArticle     = saveArticle;
window.filterArticles  = filterArticles;
window.setFilter       = setFilter;