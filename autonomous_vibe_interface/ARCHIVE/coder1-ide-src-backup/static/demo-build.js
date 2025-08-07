// Demo build with reduced box implementation
(function() {
    'use strict';

    const DemoVibeInterface = {
        boxConfig: {
            originalWidth: 500,
            originalHeight: 400,
            reducedWidth: 350,  // 30% reduction
            reducedHeight: 280, // 30% reduction
            reductionFactor: 0.7
        },

        init() {
            this.createDemoBox();
            this.addDemoControls();
            this.attachEventHandlers();
        },

        createDemoBox() {
            const demoContainer = document.createElement('div');
            demoContainer.id = 'demo-container';
            demoContainer.style.cssText = `
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                font-family: Arial, sans-serif;
            `;

            const demoBox = document.createElement('div');
            demoBox.id = 'demo-box';
            demoBox.className = 'demo-vibe-box';
            demoBox.style.cssText = `
                width: ${this.boxConfig.reducedWidth}px;
                height: ${this.boxConfig.reducedHeight}px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                margin: 20px auto;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
                font-weight: bold;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            `;

            const boxContent = document.createElement('div');
            boxContent.innerHTML = `
                <div style="text-align: center;">
                    <h3 style="margin: 0 0 10px 0;">Demo Box</h3>
                    <p style="margin: 0; opacity: 0.9; font-size: 14px;">
                        Size: ${this.boxConfig.reducedWidth}×${this.boxConfig.reducedHeight}px
                    </p>
                    <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 12px;">
                        (30% smaller than original)
                    </p>
                </div>
            `;

            demoBox.appendChild(boxContent);
            demoContainer.appendChild(demoBox);
            
            const targetElement = document.getElementById('demo-root') || document.body;
            targetElement.appendChild(demoContainer);

            return demoBox;
        },

        addDemoControls() {
            const controlsContainer = document.createElement('div');
            controlsContainer.id = 'demo-controls';
            controlsContainer.style.cssText = `
                text-align: center;
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            `;

            controlsContainer.innerHTML = `
                <h4 style="margin: 0 0 15px 0; color: #333;">Box Controls</h4>
                <button id="reduceBoxBtn" style="margin: 5px; padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Reduce by 30%</button>
                <button id="resetBoxBtn" style="margin: 5px; padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Reset Original</button>
                <button id="toggleBoxBtn" style="margin: 5px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Toggle Size</button>
            `;

            const demoContainer = document.getElementById('demo-container');
            if (demoContainer) {
                demoContainer.appendChild(controlsContainer);
            }
        },

        attachEventHandlers() {
            const reduceBtn = document.getElementById('reduceBoxBtn');
            const resetBtn = document.getElementById('resetBoxBtn');
            const toggleBtn = document.getElementById('toggleBoxBtn');

            if (reduceBtn) {
                reduceBtn.addEventListener('click', () => this.reduceBoxSize());
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', () => this.resetBoxSize());
            }

            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => this.toggleBoxSize());
            }

            // Error handling for missing buttons
            if (!reduceBtn || !resetBtn || !toggleBtn) {
                this.handleError('Some control buttons are missing');
            }
        },

        reduceBoxSize() {
            const demoBox = document.getElementById('demo-box');
            if (demoBox) {
                demoBox.style.width = this.boxConfig.reducedWidth + 'px';
                demoBox.style.height = this.boxConfig.reducedHeight + 'px';
                demoBox.style.transform = 'scale(0.95)';
                
                this.updateBoxContent(demoBox, 'reduced');
                
                setTimeout(() => {
                    demoBox.style.transform = 'scale(1)';
                }, 150);
            }
        },

        resetBoxSize() {
            const demoBox = document.getElementById('demo-box');
            if (demoBox) {
                demoBox.style.width = this.boxConfig.originalWidth + 'px';
                demoBox.style.height = this.boxConfig.originalHeight + 'px';
                demoBox.style.transform = 'scale(1.05)';
                
                this.updateBoxContent(demoBox, 'original');
                
                setTimeout(() => {
                    demoBox.style.transform = 'scale(1)';
                }, 150);
            }
        },

        toggleBoxSize() {
            const demoBox = document.getElementById('demo-box');
            if (demoBox) {
                const currentWidth = parseInt(demoBox.style.width);
                const isReduced = currentWidth === this.boxConfig.reducedWidth;
                
                if (isReduced) {
                    this.resetBoxSize();
                } else {
                    this.reduceBoxSize();
                }
            }
        },

        updateBoxContent(boxElement, state) {
            const content = boxElement.querySelector('div');
            if (content) {
                const isReduced = state === 'reduced';
                const width = isReduced ? this.boxConfig.reducedWidth : this.boxConfig.originalWidth;
                const height = isReduced ? this.boxConfig.reducedHeight : this.boxConfig.originalHeight;
                
                content.innerHTML = `
                    <div style="text-align: center;">
                        <h3 style="margin: 0 0 10px 0;">Demo Box</h3>
                        <p style="margin: 0; opacity: 0.9; font-size: 14px;">
                            Size: ${width}×${height}px
                        </p>
                        <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 12px;">
                            ${isReduced ? '(30% smaller than original)' : '(Original size)'}
                        </p>
                    </div>
                `;
            }
        },

        handleError(message) {
            console.error('Demo Build Error:', message);
            const errorElement = document.createElement('div');
            errorElement.style.cssText = 'background: #e74c3c; color: white; padding: 10px; margin: 10px; border-radius: 4px; text-align: center;';
            errorElement.textContent = 'Demo Error: ' + message;
            
            const container = document.getElementById('demo-container') || document.body;
            container.appendChild(errorElement);
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DemoVibeInterface.init());
    } else {
        DemoVibeInterface.init();
    }

    // Export for global access
    window.DemoVibeInterface = DemoVibeInterface;
})();