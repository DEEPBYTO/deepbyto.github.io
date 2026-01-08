// Taglines array - Updated as requested
const taglines = [
    "Hello! Welcome to DEEPBYTO.",
    "Digital innovations by DEEPBYTO.",
    "Innovation distinguishes us from others.",
    "Learning today, leading tomorrow.",
    "Stay curious, keep building!",
    "Turning ideas into intelligent solutions.",
    "Code. Innovate. Repeat.",
    "Learning today, building tomorrow.",
    "Experiment. Learn. Evolve.",
    "Innovation starts here."
];

// Animated tagline typing effect
class TaglineAnimator {
    constructor() {
        this.currentTaglineIndex = 0;
        this.currentCharIndex = 0;
        this.isDeleting = false;
        this.isPaused = false;
        this.taglineElement = document.getElementById('tagline-text');
        this.typeSpeed = 50;
        this.deleteSpeed = 30;
        this.pauseDuration = 2000;
        
        // Only initialize if tagline element exists (home page)
        if (this.taglineElement) {
            this.init();
        }
    }

    init() {
        this.type();
    }

    type() {
        if (this.isPaused) return;

        const currentTagline = taglines[this.currentTaglineIndex];
        
        if (!this.isDeleting) {
            // Typing phase
            this.taglineElement.textContent = currentTagline.substring(0, this.currentCharIndex + 1);
            this.currentCharIndex++;
            
            if (this.currentCharIndex === currentTagline.length) {
                this.isPaused = true;
                setTimeout(() => {
                    this.isPaused = false;
                    this.isDeleting = true;
                    this.type();
                }, this.pauseDuration);
                return;
            }
        } else {
            // Deleting phase
            this.taglineElement.textContent = currentTagline.substring(0, this.currentCharIndex - 1);
            this.currentCharIndex--;
            
            if (this.currentCharIndex === 0) {
                this.isDeleting = false;
                this.currentTaglineIndex = (this.currentTaglineIndex + 1) % taglines.length;
            }
        }

        const speed = this.isDeleting ? this.deleteSpeed : this.typeSpeed;
        setTimeout(() => this.type(), speed);
    }
}

// Initialize Particle.js
function initParticles() {
    const particlesContainer = document.getElementById('particles-js');
    if (!particlesContainer) return;
    
    particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: "#00d4ff" },
            shape: { 
                type: ["circle", "triangle", "polygon"],
                polygon: { nb_sides: 6 }
            },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: {
                enable: true,
                distance: 150,
                color: "#00d4ff",
                opacity: 0.2,
                width: 1
            },
            move: {
                enable: true,
                speed: 2,
                direction: "none",
                random: true,
                straight: false,
                out_mode: "out",
                bounce: false
            }
        },
        interactivity: {
            detect_on: "canvas",
            events: {
                onhover: { enable: true, mode: "repulse" },
                onclick: { enable: true, mode: "push" },
                resize: true
            }
        },
        retina_detect: true
    });
}

// Circuit animation
function initCircuitAnimation() {
    const circuitContainer = document.getElementById('circuit-animation');
    if (!circuitContainer) return;
    
    const nodeCount = 20;
    
    for (let i = 0; i < nodeCount; i++) {
        // Create nodes
        const node = document.createElement('div');
        node.className = 'circuit-node';
        node.style.left = `${Math.random() * 100}%`;
        node.style.top = `${Math.random() * 100}%`;
        circuitContainer.appendChild(node);
        
        // Create connections between some nodes
        if (i > 0 && Math.random() > 0.7) {
            const line = document.createElement('div');
            line.className = 'circuit-line';
            
            const prevNode = circuitContainer.children[i-1];
            const x1 = parseFloat(node.style.left);
            const y1 = parseFloat(node.style.top);
            const x2 = parseFloat(prevNode.style.left);
            const y2 = parseFloat(prevNode.style.top);
            
            const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            
            line.style.width = `${distance}%`;
            line.style.height = '2px';
            line.style.left = `${x1}%`;
            line.style.top = `${y1}%`;
            line.style.transform = `rotate(${angle}deg)`;
            line.style.transformOrigin = '0 0';
            
            circuitContainer.appendChild(line);
        }
    }
}

// Code stream animation
function initCodeStream() {
    const codeStream = document.getElementById('code-stream');
    if (!codeStream) return;
    
    const codeSnippets = [
        "def train_model(data):",
        "const neuralNetwork = new AI();",
        "from tensorflow import keras",
        "async function processData() {",
        "import numpy as np",
        "class DeepLearningModel:",
        "response = await fetch(api);",
        "model.compile(optimizer='adam')",
        "if (accuracy > 0.95) {",
        "plt.plot(history.history['loss'])",
        "for epoch in range(epochs):",
        "const loss = model.train(x, y);"
    ];

    for (let i = 0; i < 15; i++) {
        const codeLine = document.createElement('div');
        codeLine.className = 'code-line';
        codeLine.textContent = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
        codeLine.style.left = `${Math.random() * 100}%`;
        codeLine.style.top = `${Math.random() * 100}%`;
        codeLine.style.animationDelay = `${Math.random() * 20}s`;
        codeStream.appendChild(codeLine);
    }

    // Animate code lines
    const codeLines = document.querySelectorAll('.code-line');
    codeLines.forEach(line => {
        animateCodeLine(line, codeSnippets);
    });

    function animateCodeLine(element, snippets) {
        let currentTop = parseFloat(element.style.top);
        
        function move() {
            currentTop += 0.1;
            
            if (currentTop > 100) {
                currentTop = -5;
                element.style.left = `${Math.random() * 100}%`;
                element.textContent = snippets[Math.floor(Math.random() * snippets.length)];
            }
            
            element.style.top = `${currentTop}%`;
            requestAnimationFrame(move);
        }
        
        move();
    }
}

// Header scroll effect
function initHeaderScroll() {
    window.addEventListener('scroll', function() {
        const header = document.getElementById('header');
        if (!header) return;
        
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Parallax effect for hero section
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
        }
    });
}

// Mobile menu toggle
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    
    if (!mobileMenuToggle || !navLinks) return;
    
    mobileMenuToggle.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        mobileMenuToggle.innerHTML = navLinks.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
}

// Form submission
function initForms() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your message! We will get back to you soon.');
            this.reset();
        });
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Start tagline animation if on home page
    new TaglineAnimator();
    
    // Initialize all animations
    initParticles();
    initCircuitAnimation();
    initCodeStream();
    initHeaderScroll();
    initMobileMenu();
    initForms();
});