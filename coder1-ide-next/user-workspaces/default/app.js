// Coder1 IDE Starter JavaScript

// Simple button click handler
document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('clickMe');
    const output = document.getElementById('output');
    let clickCount = 0;
    
    button.addEventListener('click', function() {
        clickCount++;
        output.textContent = `Button clicked ${clickCount} time${clickCount !== 1 ? 's' : ''}! 🎉`;
        
        // Add some fun animation
        output.style.transform = 'scale(1.1)';
        setTimeout(() => {
            output.style.transform = 'scale(1)';
        }, 200);
    });
    
    console.log('Welcome to Coder1 IDE! 🚀');
    console.log('Edit this file to add your own JavaScript!');
});

// Example function you can use
function greet(name) {
    return `Hello, ${name}! Welcome to Coder1 IDE! 👋`;
}

// Try uncommenting this line:
// console.log(greet('Developer'));
