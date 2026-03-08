/**
 * ==================== INDEX.JS ====================
 * Animations & interactions spécifiques à la landing page
 */

const API_URL = 'https://api.sterveshop.cloud';

/* ==================== COUNTER ANIMATION ==================== */
function animateCounter(el, target, suffix) {
    const duration = 1800;
    const start    = performance.now();
    const update   = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const ease     = 1 - Math.pow(1 - progress, 4);
        const current  = Math.round(ease * target);
        el.innerHTML   = `${current}<span>${suffix}</span>`;
        if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

function initCounters() {
    const stats = document.querySelectorAll('.hero__stat-number[data-target]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                entry.target.dataset.animated = 'true';
                const target = parseInt(entry.target.dataset.target);
                const suffix = entry.target.querySelector('span')?.textContent || '';
                animateCounter(entry.target, target, suffix);
            }
        });
    }, { threshold: 0.5 });
    stats.forEach(el => observer.observe(el));
}

/* ==================== TERMINAL ANIMATION ==================== */
const TERMINAL_DEMOS = [
    {
        cmd: 'sterve generate "Stratégie SEO 2026"',
        steps: [
            '> Connexion à Claude AI...',
            '> Analyse du sujet...',
            '> Structuration des sections...',
            '> Optimisation SEO...',
            '> ✓ Article généré en 7.3s',
        ],
        title: '5 stratégies SEO indispensables en 2026',
        words: '642 mots',
        excerpt: 'En 2026, les algorithmes de Google récompensent plus que jamais le contenu authentique, structuré et à haute valeur ajoutée. Voici les 5 leviers que chaque PME doit activer...'
    },
    {
        cmd: 'sterve generate "Marketing automation PME"',
        steps: [
            '> Connexion à Claude AI...',
            '> Analyse des tendances...',
            '> Rédaction des sections...',
            '> Ajout des méta-données...',
            '> ✓ Article généré en 8.1s',
        ],
        title: 'Marketing automation : le guide complet pour les PME',
        words: '718 mots',
        excerpt: 'L\'automatisation marketing n\'est plus réservée aux grands groupes. Découvrez comment les PME peuvent multiplier leurs leads sans augmenter leur équipe...'
    },
    {
        cmd: 'sterve generate "Tendances e-commerce 2026"',
        steps: [
            '> Connexion à Claude AI...',
            '> Recherche des tendances...',
            '> Construction du plan...',
            '> Finalisation du contenu...',
            '> ✓ Article généré en 6.9s',
        ],
        title: 'E-commerce en 2026 : 7 tendances qui redéfinissent le marché',
        words: '693 mots',
        excerpt: 'Entre l\'essor de l\'IA conversationnelle, les achats en réalité augmentée et la montée du social commerce, le paysage e-commerce se transforme à vitesse accélérée...'
    }
];

let terminalIndex   = 0;
let terminalRunning = false;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function typeText(el, text, speed = 38) {
    el.textContent = '';
    for (const char of text) {
        el.textContent += char;
        await sleep(speed);
    }
}

async function runTerminal() {
    if (terminalRunning) return;
    terminalRunning = true;

    const cmdEl    = document.getElementById('t-cmd');
    const outputEl = document.getElementById('t-output');
    const resultEl = document.getElementById('t-result');
    const titleEl  = document.getElementById('t-title');
    const wordsEl  = document.getElementById('t-words');
    const excerptEl= document.getElementById('t-excerpt');
    const cursor   = document.querySelector('.terminal-cursor');

    if (!cmdEl) { terminalRunning = false; return; }

    while (true) {
        const demo = TERMINAL_DEMOS[terminalIndex % TERMINAL_DEMOS.length];
        terminalIndex++;

        // Reset
        outputEl.innerHTML = '';
        resultEl.style.display = 'none';
        cursor.style.display = 'inline';

        // Type command
        await typeText(cmdEl, demo.cmd, 32);
        await sleep(300);
        cursor.style.display = 'none';

        // Output lines
        for (let i = 0; i < demo.steps.length; i++) {
            await sleep(350);
            const line = document.createElement('div');
            line.className = 't-line';
            line.style.animationDelay = '0ms';
            line.textContent = demo.steps[i];
            line.style.color = demo.steps[i].startsWith('> ✓') ? 'var(--green)' : '';
            outputEl.appendChild(line);
        }

        // Show result
        await sleep(500);
        titleEl.textContent  = demo.title;
        wordsEl.textContent  = demo.words;
        excerptEl.textContent = demo.excerpt;
        resultEl.style.display = 'block';

        // Wait before next demo
        await sleep(4500);

        // Fade out
        outputEl.style.opacity = '0';
        resultEl.style.opacity = '0';
        await sleep(500);
        outputEl.style.opacity = '';
        resultEl.style.opacity = '';
    }
}

function initTerminal() {
    const terminal = document.querySelector('.hero__terminal');
    if (!terminal) return;
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            runTerminal();
            observer.disconnect();
        }
    }, { threshold: 0.3 });
    observer.observe(terminal);
}

/* ==================== AVANTAGE CARD ANIMATIONS ==================== */

// Progress bars & comparison bars
function animateBars(card) {
    // Meter fill
    const fill = card.querySelector('.avantage-card__meter-fill');
    if (fill) {
        const w = fill.dataset.width || '0';
        setTimeout(() => { fill.style.width = w + '%'; }, 100);
    }

    // Comparison bars
    card.querySelectorAll('.avantage-card__comp-bar').forEach((bar, i) => {
        const w = bar.dataset.width || '0';
        setTimeout(() => { bar.style.width = w + '%'; }, 100 + i * 200);
    });
}

// SEO arc
function animateScoreArc(card) {
    const arc = card.querySelector('.score-arc');
    if (!arc) return;
    // Full circumference = 213.6, score 98/100
    const score      = 98;
    const circumference = 213.6;
    const offset     = circumference - (score / 100) * circumference;
    setTimeout(() => { arc.style.strokeDashoffset = offset; }, 200);
}

function initAvantageCards() {
    const cards = document.querySelectorAll('.avantage-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                entry.target.dataset.animated = 'true';
                animateBars(entry.target);
                animateScoreArc(entry.target);
            }
        });
    }, { threshold: 0.3 });
    cards.forEach(c => observer.observe(c));
}

/* ==================== TONE SWITCHER ==================== */
const TONE_PREVIEWS = {
    'Professionnel': '"Dans un paysage digital en constante évolution, maîtriser le référencement naturel n\'est plus une option mais une nécessité stratégique pour toute entreprise souhaitant maintenir sa compétitivité..."',
    'Expert':        '"L\'algorithme BERT de Google, combiné aux mises à jour Helpful Content, favorise désormais le contenu démontrant une expertise sectorielle réelle, un signal E-E-A-T que les LLMs amplifient efficacement..."',
    'Pédagogique':   '"Avant de plonger dans les techniques avancées, commençons par les fondamentaux : le référencement naturel, c\'est simplement l\'art d\'apparaître en premier quand vos clients vous cherchent. Voici comment..."',
    'Inspirant':     '"Imaginez : chaque matin, des centaines de clients potentiels recherchent exactement ce que vous proposez. La vraie question n\'est pas de savoir si vous pouvez les atteindre — c\'est de savoir si vous allez oser..."'
};

function initToneSwitcher() {
    const tones   = document.querySelectorAll('.avantage-card__tone');
    const preview = document.getElementById('tone-preview');
    if (!tones.length || !preview) return;

    tones.forEach(tone => {
        tone.addEventListener('click', () => {
            tones.forEach(t => t.classList.remove('active'));
            tone.classList.add('active');
            preview.style.opacity = '0';
            setTimeout(() => {
                preview.textContent = TONE_PREVIEWS[tone.dataset.tone] || '';
                preview.style.opacity = '1';
            }, 200);
        });
    });
}

/* ==================== DEMO GENERATION ==================== */
function showDemoState(state) {
    const states = { empty: 'demo-empty', loading: 'demo-loading', login: 'demo-login', result: 'demo-result' };
    Object.entries(states).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = key === state ? (key === 'result' ? 'flex' : 'flex') : 'none';
    });
}

async function generateDemo() {
    const topic = document.getElementById('demo-topic')?.value.trim();
    const tone  = document.getElementById('demo-tone')?.value;
    const btn   = document.getElementById('demo-btn');

    if (!topic) {
        document.getElementById('demo-topic')?.focus();
        return;
    }

    const token = window.AUTH?.getToken();
    if (!token) {
        showDemoState('login');
        return;
    }

    showDemoState('loading');
    btn.disabled = true;

    try {
        const res  = await fetch(`${API_URL}/api/blog/generate`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body:    JSON.stringify({ topic, tone })
        });

        if (res.status === 401) { window.AUTH.clear(); showDemoState('login'); return; }
        if (res.status === 429) { alert('Limite atteinte (5 articles/heure). Réessayez plus tard.'); showDemoState('empty'); return; }

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur');

        document.getElementById('result-title').textContent   = data.title  || '';
        document.getElementById('result-excerpt').textContent = data.excerpt || '';
        document.getElementById('result-tone-tag').textContent = tone.charAt(0).toUpperCase() + tone.slice(1);

        const raw = (data.content || '')
            .replace(/#{1,6}\s/g, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .substring(0, 500) + '...';
        document.getElementById('result-content').textContent = raw;

        showDemoState('result');
    } catch(e) {
        console.error(e);
        showDemoState('empty');
        alert('Erreur lors de la génération. Réessayez.');
    } finally {
        btn.disabled = false;
    }
}

// Expose globally for onclick
window.generateDemo = generateDemo;

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', () => {
    initCounters();
    initTerminal();
    initAvantageCards();
    initToneSwitcher();
    showDemoState('empty');
    console.log('✅ Index animations loaded');
});
