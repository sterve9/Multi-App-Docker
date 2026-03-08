/**
 * ==================== CONFIGURATION ====================
 */
const CONFIG = {
    API_URL: 'https://api.sterveshop.cloud',
    MESSAGE_DISPLAY_TIME: 5000,
    TOKEN_KEY: 'sterve_token',
    EMAIL_KEY: 'sterve_email',
    SELECTORS: {
        header:      '#header',
        navMenu:     '#nav-menu',
        navToggle:   '#nav-toggle',
        navClose:    '#nav-close',
        navLinks:    '.nav__link',
        scrollTop:   '#scroll-top',
        contactForm: '#contact-form',
        formMessage: '#form-message',
        submitBtn:   '#submit-btn',
        // Auth
        navAuthLinks: '#nav-auth-links',
        navUser:      '#nav-user',
        navUserEmail: '#nav-user-email',
        navLogout:    '#nav-logout',
        modalOverlay: '#modal-overlay',
        modalClose:   '#modal-close',
        tabLogin:     '#tab-login',
        tabRegister:  '#tab-register',
        formLogin:    '#form-login',
        formRegister: '#form-register',
        loginEmail:    '#login-email',
        loginPassword: '#login-password',
        loginBtn:      '#login-btn',
        loginError:    '#login-error',
        loginSuccess:  '#login-success',
        registerEmail:    '#register-email',
        registerPassword: '#register-password',
        registerBtn:      '#register-btn',
        registerError:    '#register-error',
        registerSuccess:  '#register-success',
    }
};

/**
 * ==================== AUTH STATE ====================
 */
const Auth = {
    getToken()  { return localStorage.getItem(CONFIG.TOKEN_KEY); },
    getEmail()  { return localStorage.getItem(CONFIG.EMAIL_KEY); },
    isLoggedIn(){ return !!this.getToken(); },

    save(token, email) {
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
        localStorage.setItem(CONFIG.EMAIL_KEY, email);
    },

    clear() {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.EMAIL_KEY);
    },

    async fetchMe() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const res = await fetch(`${CONFIG.API_URL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) { this.clear(); return null; }
            return await res.json();
        } catch { return null; }
    }
};

/**
 * ==================== NAVIGATION ====================
 */
class Navigation {
    constructor() {
        this.header    = document.querySelector(CONFIG.SELECTORS.header);
        this.navMenu   = document.querySelector(CONFIG.SELECTORS.navMenu);
        this.navToggle = document.querySelector(CONFIG.SELECTORS.navToggle);
        this.navClose  = document.querySelector(CONFIG.SELECTORS.navClose);
        this.navLinks  = document.querySelectorAll(CONFIG.SELECTORS.navLinks);
        this.init();
    }

    init() {
        this.navToggle?.addEventListener('click', () => this.showMenu());
        this.navClose?.addEventListener('click',  () => this.hideMenu());
        this.navLinks.forEach(link => link.addEventListener('click', () => this.hideMenu()));
        window.addEventListener('scroll', () => this.handleScroll());
        this.setupActiveLinks();
    }

    showMenu() { this.navMenu?.classList.add('show-menu'); }
    hideMenu() { this.navMenu?.classList.remove('show-menu'); }

    handleScroll() {
        this.header?.classList.toggle('scroll-header', window.scrollY >= 50);
    }

    setupActiveLinks() {
        const sections = document.querySelectorAll('.section[id]');
        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset;
            sections.forEach(section => {
                const sectionHeight = section.offsetHeight;
                const sectionTop    = section.offsetTop - 100;
                const sectionId     = section.getAttribute('id');
                const navLink       = document.querySelector(`.nav__link[href*="${sectionId}"]`);
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navLink?.classList.add('active-link');
                } else {
                    navLink?.classList.remove('active-link');
                }
            });
        });
    }
}

/**
 * ==================== SCROLL TO TOP ====================
 */
class ScrollToTop {
    constructor() {
        this.scrollTop = document.querySelector(CONFIG.SELECTORS.scrollTop);
        this.init();
    }

    init() {
        if (!this.scrollTop) return;
        window.addEventListener('scroll', () => {
            this.scrollTop.classList.toggle('show-scroll', window.scrollY >= 560);
        });
    }
}

/**
 * ==================== SCROLL REVEAL ====================
 */
class ScrollReveal {
    constructor() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    setTimeout(() => entry.target.classList.add('visible'), i * 80);
                }
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }
}

/**
 * ==================== FORM VALIDATOR ====================
 */
class FormValidator {
    constructor() {
        this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        this.phoneRegex = /^[\d\s+\-()]+$/;
    }

    validateEmail(email)  { return this.emailRegex.test(email); }
    validatePhone(phone)  {
        if (!phone) return true;
        return this.phoneRegex.test(phone) && phone.length >= 8;
    }
    validateRequired(val) { return val && val.trim().length > 0; }

    validateForm(formData) {
        const errors = [];
        if (!this.validateRequired(formData.name))    errors.push('Le nom est requis');
        if (!this.validateRequired(formData.email))   errors.push("L'email est requis");
        else if (!this.validateEmail(formData.email)) errors.push("L'email n'est pas valide");
        if (!this.validateRequired(formData.subject)) errors.push('Le sujet est requis');
        if (!this.validateRequired(formData.message)) errors.push('Le message est requis');
        else if (formData.message.trim().length < 10) errors.push('Le message doit contenir au moins 10 caractères');
        if (!this.validatePhone(formData.phone))      errors.push('Le numéro de téléphone n\'est pas valide');
        return { isValid: errors.length === 0, errors };
    }
}

/**
 * ==================== CONTACT FORM ====================
 */
class ContactForm {
    constructor() {
        this.form           = document.querySelector(CONFIG.SELECTORS.contactForm);
        this.messageElement = document.querySelector(CONFIG.SELECTORS.formMessage);
        this.submitBtn      = document.querySelector(CONFIG.SELECTORS.submitBtn);
        this.validator      = new FormValidator();
        this.init();
    }

    init() {
        if (!this.form) return;
        this.form.addEventListener('submit', (e) => { e.preventDefault(); this.handleSubmit(); });
    }

    getFormData() {
        return {
            name:    document.getElementById('name')?.value    || '',
            email:   document.getElementById('email')?.value   || '',
            phone:   document.getElementById('phone')?.value   || '',
            subject: document.getElementById('subject')?.value || '',
            message: document.getElementById('message')?.value || ''
        };
    }

    showMessage(message, type = 'success') {
        if (!this.messageElement) return;
        this.messageElement.textContent = message;
        this.messageElement.className = `form__message show ${type}`;
        setTimeout(() => this.messageElement.classList.remove('show'), CONFIG.MESSAGE_DISPLAY_TIME);
    }

    setLoading(isLoading) {
        if (!this.submitBtn) return;
        const btnText   = this.submitBtn.querySelector('.button__text');
        const btnLoader = this.submitBtn.querySelector('.button__loader');
        if (isLoading) {
            btnText.style.display   = 'none';
            btnLoader.style.display = 'inline-block';
            this.submitBtn.disabled = true;
        } else {
            btnText.style.display   = 'inline';
            btnLoader.style.display = 'none';
            this.submitBtn.disabled = false;
        }
    }

    async sendToBackend(data) {
        try {
            const res = await fetch(`${CONFIG.API_URL}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) { console.error('Erreur serveur:', await res.text()); return { success: false }; }
            return { success: true, data: await res.json() };
        } catch(err) {
            console.error('Erreur réseau:', err);
            return { success: false };
        }
    }

    async handleSubmit() {
        const formData   = this.getFormData();
        const validation = this.validator.validateForm(formData);
        if (!validation.isValid) { this.showMessage(validation.errors.join(', '), 'error'); return; }
        this.setLoading(true);
        const result = await this.sendToBackend(formData);
        if (result.success) {
            this.showMessage('✅ Message envoyé avec succès ! Nous analysons votre demande.', 'success');
            this.form.reset();
        } else {
            this.showMessage('❌ Une erreur est survenue. Veuillez réessayer.', 'error');
        }
        this.setLoading(false);
    }
}

/**
 * ==================== AUTH MODAL ====================
 */
class AuthModal {
    constructor() {
        this.overlay   = document.querySelector(CONFIG.SELECTORS.modalOverlay);
        this.closeBtn  = document.querySelector(CONFIG.SELECTORS.modalClose);
        this.tabLogin  = document.querySelector(CONFIG.SELECTORS.tabLogin);
        this.tabReg    = document.querySelector(CONFIG.SELECTORS.tabRegister);
        this.fLogin    = document.querySelector(CONFIG.SELECTORS.formLogin);
        this.fRegister = document.querySelector(CONFIG.SELECTORS.formRegister);
        this.init();
    }

    init() {
        if (!this.overlay) return;

        // Open via any [data-open-modal] element
        document.querySelectorAll('[data-open-modal]').forEach(el => {
            el.addEventListener('click', (e) => { e.preventDefault(); this.open(); });
        });

        this.closeBtn?.addEventListener('click', () => this.close());
        this.overlay?.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });

        this.tabLogin?.addEventListener('click', () => this.switchTab('login'));
        this.tabReg?.addEventListener('click',   () => this.switchTab('register'));

        document.querySelector(CONFIG.SELECTORS.loginBtn)?.addEventListener('click',    () => this.doLogin());
        document.querySelector(CONFIG.SELECTORS.registerBtn)?.addEventListener('click', () => this.doRegister());

        // Enter key on inputs
        [CONFIG.SELECTORS.loginEmail, CONFIG.SELECTORS.loginPassword].forEach(sel => {
            document.querySelector(sel)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.doLogin(); });
        });

        [CONFIG.SELECTORS.registerEmail, CONFIG.SELECTORS.registerPassword].forEach(sel => {
            document.querySelector(sel)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.doRegister(); });
        });
    }

    open(tab = 'login') {
        this.overlay?.classList.add('visible');
        this.switchTab(tab);
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.overlay?.classList.remove('visible');
        document.body.style.overflow = '';
        this._clearErrors();
    }

    switchTab(tab) {
        this.tabLogin?.classList.toggle('active', tab === 'login');
        this.tabReg?.classList.toggle('active',   tab === 'register');
        if (this.fLogin)    this.fLogin.style.display    = tab === 'login'    ? 'flex' : 'none';
        if (this.fRegister) this.fRegister.style.display = tab === 'register' ? 'flex' : 'none';
        this._clearErrors();
    }

    _clearErrors() {
        ['login-error','login-success','register-error','register-success'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('visible');
        });
    }

    _showMsg(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        el.classList.add('visible');
    }

    async doLogin() {
        const email    = document.querySelector(CONFIG.SELECTORS.loginEmail)?.value.trim();
        const password = document.querySelector(CONFIG.SELECTORS.loginPassword)?.value;
        const btn      = document.querySelector(CONFIG.SELECTORS.loginBtn);

        this._clearErrors();
        if (!email || !password) { this._showMsg('login-error', 'Remplissez tous les champs'); return; }

        btn.disabled    = true;
        btn.textContent = 'Connexion...';

        try {
            const form = new FormData();
            form.append('username', email);
            form.append('password', password);

            const res  = await fetch(`${CONFIG.API_URL}/api/auth/login`, { method: 'POST', body: form });
            const data = await res.json();

            if (!res.ok) { this._showMsg('login-error', data.detail || 'Identifiants incorrects'); return; }

            Auth.save(data.access_token, email);
            this.close();
            NavUser.show(email);

            // Redirect to dashboard if on landing
            if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                window.location.href = 'dashboard.html';
            }
        } catch(e) {
            this._showMsg('login-error', 'Erreur de connexion au serveur');
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Se connecter';
        }
    }

    async doRegister() {
        const email    = document.querySelector(CONFIG.SELECTORS.registerEmail)?.value.trim();
        const password = document.querySelector(CONFIG.SELECTORS.registerPassword)?.value;
        const btn      = document.querySelector(CONFIG.SELECTORS.registerBtn);

        this._clearErrors();
        if (!email || !password) { this._showMsg('register-error', 'Remplissez tous les champs'); return; }
        if (password.length < 8) { this._showMsg('register-error', 'Mot de passe trop court (8 min)'); return; }

        btn.disabled    = true;
        btn.textContent = 'Création...';

        try {
            const res  = await fetch(`${CONFIG.API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) { this._showMsg('register-error', data.detail || "Erreur lors de l'inscription"); return; }

            this._showMsg('register-success', '✅ Compte créé ! Connectez-vous maintenant.');
            setTimeout(() => this.switchTab('login'), 1600);
        } catch(e) {
            this._showMsg('register-error', 'Erreur de connexion au serveur');
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Créer mon compte';
        }
    }
}

/**
 * ==================== NAV USER STATE ====================
 */
const NavUser = {
    show(email) {
        const authLinks = document.querySelector(CONFIG.SELECTORS.navAuthLinks);
        const userBlock = document.querySelector(CONFIG.SELECTORS.navUser);
        const emailEl   = document.querySelector(CONFIG.SELECTORS.navUserEmail);
        if (authLinks) authLinks.style.display = 'none';
        if (userBlock) userBlock.classList.add('visible');
        if (emailEl)   emailEl.textContent = email;
        // Attach logout
        document.querySelector(CONFIG.SELECTORS.navLogout)?.addEventListener('click', () => this.logout());
    },

    logout() {
        Auth.clear();
        const authLinks = document.querySelector(CONFIG.SELECTORS.navAuthLinks);
        const userBlock = document.querySelector(CONFIG.SELECTORS.navUser);
        if (authLinks) authLinks.style.display = '';
        if (userBlock) userBlock.classList.remove('visible');
        // If on protected page, redirect home
        if (window.location.pathname.includes('dashboard')) {
            window.location.href = 'index.html';
        }
    }
};

/**
 * ==================== INITIALIZATION ====================
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Sterve initialized');

    // Core UI
    new Navigation();
    new ScrollToTop();
    new ScrollReveal();
    new ContactForm();
    new AuthModal();

    // Restore auth state
    if (Auth.isLoggedIn()) {
        NavUser.show(Auth.getEmail());
    }

    console.log('✅ All modules loaded');
});

// Expose globally for inline onclick (dashboard etc.)
window.AUTH = Auth;
window.NAV_USER = NavUser;
window.openAuthModal = (tab = 'login') => {
    document.querySelector(CONFIG.SELECTORS.modalOverlay)?.classList.add('visible');
    document.body.style.overflow = 'hidden';
};