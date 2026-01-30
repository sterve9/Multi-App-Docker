/**
 * ==================== CONFIGURATION ====================
 * Configuration centrale pour le site
 */
const CONFIG = {
    // URL du webhook n8n (à remplacer par votre webhook réel)
    // Format attendu : https://votre-n8n-instance.com/webhook/votre-webhook-id
    N8N_WEBHOOK_URL: 'https://your-n8n-instance.com/webhook/contact',
    
    // Temps d'affichage des messages (en millisecondes)
    MESSAGE_DISPLAY_TIME: 5000,
    
    // Sélecteurs DOM
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
 * Gestion du menu de navigation responsive
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
        // Toggle menu mobile
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => this.showMenu());
        }

        if (this.navClose) {
            this.navClose.addEventListener('click', () => this.hideMenu());
        }

        // Fermer le menu lors du clic sur un lien
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => this.hideMenu());
        });

        // Gestion du scroll (header shadow + active link)
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });

        // Activer le lien correspondant à la section visible
        this.setupActiveLinks();
    }

    showMenu() {
        if (this.navMenu) {
            this.navMenu.classList.add('show-menu');
        }
    }

    hideMenu() {
        if (this.navMenu) {
            this.navMenu.classList.remove('show-menu');
        }
    }

    handleScroll() {
        // Ajouter une ombre au header lors du scroll
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
 * Bouton de retour en haut de page
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
 * Validation côté client des champs du formulaire
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
        // Le téléphone est optionnel, donc valide si vide
        if (!phone) return true;
        return this.phoneRegex.test(phone) && phone.length >= 10;
    }

    validateRequired(value) {
        return value && value.trim().length > 0;
    }

    validateForm(formData) {
        const errors = [];

        // Validation du nom
        if (!this.validateRequired(formData.name)) {
            errors.push('Le nom est requis');
        }

        // Validation de l'email
        if (!this.validateRequired(formData.email)) {
            errors.push('L\'email est requis');
        } else if (!this.validateEmail(formData.email)) {
            errors.push('L\'email n\'est pas valide');
        }

        // Validation du téléphone (optionnel)
        if (formData.phone && !this.validatePhone(formData.phone)) {
            errors.push('Le numéro de téléphone n\'est pas valide');
        }

        // Validation du sujet
        if (!this.validateRequired(formData.subject)) {
            errors.push('Le sujet est requis');
        }

        // Validation du message
        if (!this.validateRequired(formData.message)) {
            errors.push('Le message est requis');
        } else if (formData.message.trim().length < 10) {
            errors.push('Le message doit contenir au moins 10 caractères');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

/**
 * ==================== CONTACT FORM ====================
 * Gestion du formulaire de contact et envoi vers n8n
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

    // Récupérer les données du formulaire
    getFormData() {
        return {
            name: document.getElementById('name')?.value || '',
            email: document.getElementById('email')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            subject: document.getElementById('subject')?.value || '',
            message: document.getElementById('message')?.value || '',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language
        };
    }

    // Afficher un message à l'utilisateur
    showMessage(message, type = 'success') {
        if (!this.messageElement) return;

        this.messageElement.textContent = message;
        this.messageElement.className = `form__message show ${type}`;

        // Masquer le message après un délai
        setTimeout(() => {
            this.messageElement.classList.remove('show');
        }, CONFIG.MESSAGE_DISPLAY_TIME);
    }

    // Afficher l'état de chargement
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

    // Envoyer les données vers le webhook n8n
    async sendToWebhook(data) {
        try {
            const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            // Vérifier si la réponse est OK (status 200-299)
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            // Tenter de parser la réponse JSON (si disponible)
            let result;
            try {
                result = await response.json();
            } catch {
                // Si pas de JSON, considérer comme succès
                result = { success: true };
            }

            return {
                success: true,
                data: result
            };

        } catch (error) {
            console.error('Erreur lors de l\'envoi:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Gérer la soumission du formulaire
    async handleSubmit() {
        // 1. Récupérer les données
        const formData = this.getFormData();

        // 2. Valider les données côté client
        const validation = this.validator.validateForm(formData);
        
        if (!validation.isValid) {
            this.showMessage(validation.errors.join(', '), 'error');
            return;
        }

        // 3. Afficher le loader
        this.setLoading(true);

        // 4. Envoyer vers le webhook n8n
        const result = await this.sendToWebhook(formData);

        // 5. Gérer la réponse
        if (result.success) {
            this.showMessage('✅ Message envoyé avec succès ! Nous vous répondrons rapidement.', 'success');
            this.form.reset();
        } else {
            this.showMessage('❌ Une erreur est survenue. Veuillez réessayer ou nous contacter directement par email.', 'error');
        }

        // 6. Retirer le loader
        this.setLoading(false);
    }
}

/**
 * ==================== SMOOTH SCROLL ====================
 * Amélioration du scroll smooth pour tous les liens d'ancrage
 */
class SmoothScroll {
    constructor() {
        this.init();
    }

    init() {
        // Sélectionner tous les liens d'ancrage
        const links = document.querySelectorAll('a[href^="#"]');

        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                // Ignorer les liens vides
                if (href === '#') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                }

                const target = document.querySelector(href);
                
                if (target) {
                    e.preventDefault();
                    const offsetTop = target.offsetTop - 80; // Offset pour le header fixe
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

/**
 * ==================== ANIMATIONS ====================
 * Animations d'apparition au scroll (Intersection Observer)
 */
class ScrollAnimations {
    constructor() {
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };
        this.init();
    }

    init() {
        // Éléments à animer
        const animatedElements = document.querySelectorAll(
            '.service__card, .stat__item, .contact__card, .about__content'
        );

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '0';
                        entry.target.style.transform = 'translateY(20px)';
                        
                        // Animer l'élément
                        setTimeout(() => {
                            entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                        }, 100);

                        observer.unobserve(entry.target);
                    }
                });
            }, this.observerOptions);

            animatedElements.forEach(el => observer.observe(el));
        }
    }
}

/**
 * ==================== ANALYTICS ====================
 * Tracking des événements (prêt pour Google Analytics, Matomo, etc.)
 */
class Analytics {
    constructor() {
        this.init();
    }

    init() {
        // Tracking des clics sur les boutons CTA
        const ctaButtons = document.querySelectorAll('.button--primary');
        ctaButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.trackEvent('CTA Click', button.textContent.trim());
            });
        });

        // Tracking de la soumission du formulaire
        const form = document.querySelector(CONFIG.SELECTORS.contactForm);
        if (form) {
            form.addEventListener('submit', () => {
                this.trackEvent('Form', 'Submit Contact Form');
            });
        }
    }

    trackEvent(category, action, label = '') {
        // Placeholder pour Google Analytics ou autre
        console.log('📊 Event tracked:', { category, action, label });

        // Exemple avec Google Analytics (à décommenter si configuré)
        // if (typeof gtag !== 'undefined') {
        //     gtag('event', action, {
        //         'event_category': category,
        //         'event_label': label
        //     });
        // }

        // Exemple avec Matomo (à décommenter si configuré)
        // if (typeof _paq !== 'undefined') {
        //     _paq.push(['trackEvent', category, action, label]);
        // }
    }
}

/**
 * ==================== INITIALIZATION ====================
 * Point d'entrée principal - Initialisation de tous les modules
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Site initialized');

    // Initialiser tous les modules
    new Navigation();
    new ScrollToTop();
    new ContactForm();
    new SmoothScroll();
    new ScrollAnimations();
    new Analytics();

    // Log de confirmation
    console.log('✅ All modules loaded successfully');
    
    // Avertissement si le webhook n8n n'est pas configuré
    if (CONFIG.N8N_WEBHOOK_URL.includes('your-n8n-instance')) {
        console.warn('⚠️ ATTENTION: Le webhook n8n n\'est pas configuré!');
        console.warn('📝 Veuillez modifier la constante N8N_WEBHOOK_URL dans main.js');
    }
});

/**
 * ==================== EXPORTS ====================
 * Export pour utilisation éventuelle dans d'autres scripts
 */
window.SiteModules = {
    Navigation,
    ScrollToTop,
    ContactForm,
    FormValidator,
    SmoothScroll,
    ScrollAnimations,
    Analytics
};
