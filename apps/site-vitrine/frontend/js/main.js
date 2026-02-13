/**
 * ==================== CONFIGURATION ====================
 */
const CONFIG = {
    MESSAGE_DISPLAY_TIME: 5000,
    SELECTORS: {
        header: '#header',
        navMenu: '#nav-menu',
        navToggle: '#nav-toggle',
        navClose: '#nav-close',
        navLinks: '.nav__link',
        scrollTop: '#scroll-top',
        contactForm: '#contact-form',
        formMessage: '#form-message',
        submitBtn: '#submit-btn'
    }
};

/**
 * ==================== NAVIGATION ====================
 */
class Navigation {
    constructor() {
        this.header = document.querySelector(CONFIG.SELECTORS.header);
        this.navMenu = document.querySelector(CONFIG.SELECTORS.navMenu);
        this.navToggle = document.querySelector(CONFIG.SELECTORS.navToggle);
        this.navClose = document.querySelector(CONFIG.SELECTORS.navClose);
        this.navLinks = document.querySelectorAll(CONFIG.SELECTORS.navLinks);
        this.init();
    }

    init() {
        this.navToggle?.addEventListener('click', () => this.showMenu());
        this.navClose?.addEventListener('click', () => this.hideMenu());
        this.navLinks.forEach(link =>
            link.addEventListener('click', () => this.hideMenu())
        );

        window.addEventListener('scroll', () => this.handleScroll());
        this.setupActiveLinks();
    }

    showMenu() {
        this.navMenu?.classList.add('show-menu');
    }

    hideMenu() {
        this.navMenu?.classList.remove('show-menu');
    }

    handleScroll() {
        if (window.scrollY >= 50) {
            this.header?.classList.add('scroll-header');
        } else {
            this.header?.classList.remove('scroll-header');
        }
    }

    setupActiveLinks() {
        const sections = document.querySelectorAll('.section[id]');

        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset;

            sections.forEach(section => {
                const sectionHeight = section.offsetHeight;
                const sectionTop = section.offsetTop - 100;
                const sectionId = section.getAttribute('id');
                const navLink = document.querySelector(`.nav__link[href*="${sectionId}"]`);

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
            if (window.scrollY >= 560) {
                this.scrollTop.classList.add('show-scroll');
            } else {
                this.scrollTop.classList.remove('show-scroll');
            }
        });
    }
}

/**
 * ==================== FORM VALIDATION ====================
 */
class FormValidator {
    constructor() {
        this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        this.phoneRegex = /^[\d\s+\-()]+$/;
    }

    validateEmail(email) {
        return this.emailRegex.test(email);
    }

    validatePhone(phone) {
        if (!phone) return true;
        return this.phoneRegex.test(phone) && phone.length >= 8;
    }

    validateRequired(value) {
        return value && value.trim().length > 0;
    }

    validateForm(formData) {
        const errors = [];

        if (!this.validateRequired(formData.name)) {
            errors.push('Le nom est requis');
        }

        if (!this.validateRequired(formData.email)) {
            errors.push("L'email est requis");
        } else if (!this.validateEmail(formData.email)) {
            errors.push("L'email n'est pas valide");
        }

        if (!this.validateRequired(formData.subject)) {
            errors.push('Le sujet est requis');
        }

        if (!this.validateRequired(formData.message)) {
            errors.push('Le message est requis');
        } else if (formData.message.trim().length < 10) {
            errors.push('Le message doit contenir au moins 10 caractères');
        }

        if (!this.validatePhone(formData.phone)) {
            errors.push('Le numéro de téléphone n’est pas valide');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

/**
 * ==================== CONTACT FORM ====================
 */
class ContactForm {
    constructor() {
        this.form = document.querySelector(CONFIG.SELECTORS.contactForm);
        this.messageElement = document.querySelector(CONFIG.SELECTORS.formMessage);
        this.submitBtn = document.querySelector(CONFIG.SELECTORS.submitBtn);
        this.validator = new FormValidator();
        this.init();
    }

    init() {
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    getFormData() {
        return {
            name: document.getElementById('name')?.value || '',
            email: document.getElementById('email')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            subject: document.getElementById('subject')?.value || '',
            message: document.getElementById('message')?.value || ''
        };
    }

    showMessage(message, type = 'success') {
        if (!this.messageElement) return;

        this.messageElement.textContent = message;
        this.messageElement.className = `form__message show ${type}`;

        setTimeout(() => {
            this.messageElement.classList.remove('show');
        }, CONFIG.MESSAGE_DISPLAY_TIME);
    }

    setLoading(isLoading) {
        if (!this.submitBtn) return;

        const buttonText = this.submitBtn.querySelector('.button__text');
        const buttonLoader = this.submitBtn.querySelector('.button__loader');

        if (isLoading) {
            buttonText.style.display = 'none';
            buttonLoader.style.display = 'inline-block';
            this.submitBtn.disabled = true;
        } else {
            buttonText.style.display = 'inline';
            buttonLoader.style.display = 'none';
            this.submitBtn.disabled = false;
        }
    }

    async sendToBackend(data) {
        try {
            const response = await fetch('https://api.sterveshop.cloud/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    subject: data.subject,
                    message: data.message
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Erreur serveur:", errorText);
                return { success: false };
            }

            const result = await response.json();
            return { success: true, data: result };

        } catch (error) {
            console.error("Erreur réseau:", error);
            return { success: false };
        }
    }

    async handleSubmit() {
        const formData = this.getFormData();
        const validation = this.validator.validateForm(formData);

        if (!validation.isValid) {
            this.showMessage(validation.errors.join(', '), 'error');
            return;
        }

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
 * ==================== INITIALIZATION ====================
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Site initialized');
    new Navigation();
    new ScrollToTop();
    new ContactForm();
    console.log('✅ All modules loaded successfully');
});
