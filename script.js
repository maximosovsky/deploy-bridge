// DeployBridge — Landing Page Interactions

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('deployForm');
    const progressEl = document.getElementById('deployProgress');
    const deployBtn = document.getElementById('deployBtn');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Disable button, show spinner
        deployBtn.disabled = true;
        deployBtn.style.opacity = '0.7';
        deployBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-color:rgba(255,255,255,0.2);border-top-color:#fff;"></span>';

        // Show progress
        progressEl.classList.add('visible');

        const steps = progressEl.querySelectorAll('.progress-step');
        let current = 0;
        const times = [1.8, 3.2, 2.5, 1.9, 1.4];

        function runStep() {
            if (current >= steps.length) {
                deployBtn.innerHTML = '<span class="deploy-btn__text">✓ Deployed</span>';
                deployBtn.style.opacity = '1';
                deployBtn.style.background = '#22c55e';
                return;
            }

            // Complete previous
            if (current > 0) {
                const prev = steps[current - 1];
                prev.classList.remove('active');
                prev.classList.add('completed');
                prev.querySelector('.progress-step__icon').innerHTML = '✓';
                prev.querySelector('.progress-step__time').textContent = times[current - 1] + 's';
            }

            // Activate current
            const step = steps[current];
            step.classList.add('active');
            step.querySelector('.progress-step__icon').innerHTML = '<span class="spinner"></span>';

            current++;
            setTimeout(runStep, 1000 + Math.random() * 2000);
        }

        setTimeout(runStep, 400);
    });

    // Card glow on input focus
    const card = document.querySelector('.deploy-card');
    const inputs = card.querySelectorAll('.form-input');

    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            card.style.boxShadow = '0 16px 60px rgba(124, 58, 237, 0.14), 0 2px 6px rgba(0, 0, 0, 0.06)';
        });
        input.addEventListener('blur', () => {
            card.style.boxShadow = '';
        });
    });
});
