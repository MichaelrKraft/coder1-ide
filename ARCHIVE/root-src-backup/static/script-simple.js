// Simple script for the main page
document.addEventListener('DOMContentLoaded', function() {
    // Handle IDE button click
    const ideButton = document.getElementById('enterIdeBtn');
    
    if (ideButton) {
        ideButton.addEventListener('click', function() {
            console.log('IDE button clicked');
            // Navigate to the Coder1 IDE
            window.location.href = '/ide';
        });
    }
    
    // Add smooth scroll for any internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});