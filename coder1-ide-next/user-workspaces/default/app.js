// Coder1 IDE - Default Project JavaScript

document.addEventListener('DOMContentLoaded', function () {

    // --- Particle canvas ---
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 50;
    const MAX_DISTANCE = 100;
    const CYAN = 'rgba(0, 217, 255,';

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: Math.random() * 1.5 + 0.5,
        };
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = CYAN + '0.5)';
            ctx.fill();
        });

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAX_DISTANCE) {
                    const opacity = (1 - dist / MAX_DISTANCE) * 0.18;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = CYAN + opacity + ')';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(drawParticles);
    }
    drawParticles();

    // --- Typing effect ---
    const words = ['faster.', 'smarter.', 'together.', 'with AI.'];
    const typedEl = document.getElementById('typed');
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let paused = false;

    function type() {
        if (paused) return;
        const currentWord = words[wordIndex];

        if (!deleting) {
            typedEl.textContent = currentWord.slice(0, charIndex + 1);
            charIndex++;
            if (charIndex === currentWord.length) {
                paused = true;
                setTimeout(() => { deleting = true; paused = false; }, 2000);
            } else {
                setTimeout(type, 80);
            }
        } else {
            typedEl.textContent = currentWord.slice(0, charIndex - 1);
            charIndex--;
            if (charIndex === 0) {
                deleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                setTimeout(type, 300);
            } else {
                setTimeout(type, 45);
            }
        }
    }
    setTimeout(type, 600);

    // --- Animated counters ---
    function animateCounter(el) {
        const target = parseInt(el.getAttribute('data-target'), 10);
        const isZero = target === 0;
        let current = 0;
        const duration = 1200;
        const steps = 40;
        const increment = target / steps;
        const interval = duration / steps;

        if (isZero) {
            el.textContent = '0';
            return;
        }

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.textContent = Math.round(current);
        }, interval);
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.querySelectorAll('.stat-number').forEach(animateCounter);
                observer.disconnect();
            }
        });
    });
    const statsEl = document.querySelector('.stats');
    if (statsEl) observer.observe(statsEl);

    // --- CTA button ---
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function () {
            this.textContent = 'Open terminal and type: claude';
            this.style.color = '#00D9FF';
            this.style.borderColor = '#00D9FF';
        });
    }

});
