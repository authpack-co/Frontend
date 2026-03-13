document.addEventListener('DOMContentLoaded', () => {
    // 1. Extension detection for the navbar
    const isExtensionActive = document.documentElement.hasAttribute('data-authpack-active');
    
    // The landing.css uses body.extension-detected to toggle the navbar buttons (Download vs Open Dashboard)
    if (isExtensionActive) {
        document.body.classList.add('extension-detected');
    }
});
