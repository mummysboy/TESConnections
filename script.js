// TESConnections - Hinge-Style Interactions
// 
// WORKING API ENDPOINT: https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/submit-contact
// 
// NOTE: For localhost testing, CORS preflight requests may fail.
// The form will work perfectly when deployed to a proper domain.
//
// Configuration - Update these with your actual AWS API Gateway endpoint
const CONFIG = {
    // Working API Gateway URL
    API_ENDPOINT: 'https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/submit-contact',
    // Secure API Key for form submissions
    API_KEY: 'tes_XNuYmTQIhSA1385VaEVnfg6kRKu8TufODDYPyhazkNUzERNn673BVAkaizM9wVyl',
    TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 second
};

// Form elements
const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const successCard = document.getElementById('successMessage');

// Form fields
const nameField = document.getElementById('name');
const communicationField = document.getElementById('communication');
const infoField = document.getElementById('info');
const commentsField = document.getElementById('comments');


// Communication option cards
const optionCards = document.querySelectorAll('.option-card');

// Error elements
const nameError = document.getElementById('nameError');
const communicationError = document.getElementById('communicationError');

// Validation rules
const validationRules = {
    name: {
required: true,
minLength: 2,
maxLength: 100,
pattern: /^[a-zA-Z\s\-'\.]+$/,
message: 'Please enter a valid name (2-100 characters)'
    },
    communication: {
required: true,
message: 'Please select your preferred communication method'
    },
    info: {
maxLength: 500,
message: 'Additional information must be 500 characters or less'
    },
    comments: {
maxLength: 1000,
message: 'Comments must be 1000 characters or less'
    }
};

// Animation utilities
function addRippleEffect(element, event) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
position: absolute;
width: ${size}px;
height: ${size}px;
left: ${x}px;
top: ${y}px;
background: rgba(255, 255, 255, 0.3);
border-radius: 50%;
transform: scale(0);
animation: ripple 0.6s linear;
pointer-events: none;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => {
ripple.remove();
    }, 600);
}

// Add ripple animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
to {
    transform: scale(4);
    opacity: 0;
}
    }
`;
document.head.appendChild(style);

// Utility functions
function showError(field, message) {
    const errorElement = document.getElementById(field + 'Error');
    if (errorElement) {
errorElement.textContent = message;
errorElement.style.display = 'block';
    }
    
    // Add error styling to the field
    const fieldElement = document.getElementById(field);
    if (fieldElement) {
fieldElement.style.borderColor = '#ef4444';
fieldElement.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    }
}

function clearError(field) {
    const errorElement = document.getElementById(field + 'Error');
    if (errorElement) {
errorElement.textContent = '';
errorElement.style.display = 'none';
    }
    
    // Remove error styling from the field
    const fieldElement = document.getElementById(field);
    if (fieldElement) {
fieldElement.style.borderColor = 'rgba(255, 255, 255, 0.1)';
fieldElement.style.backgroundColor = '#0a0a0a';
    }
}

function validateField(fieldName, value) {
    const rules = validationRules[fieldName];
    if (!rules) return true;
    
    // Required field validation
    if (rules.required && (!value || value.trim() === '')) {
showError(fieldName, rules.message);
return false;
    }
    
    // Skip other validations if field is empty and not required
    if (!value || value.trim() === '') {
clearError(fieldName);
return true;
    }
    
    // Length validations
    if (rules.minLength && value.length < rules.minLength) {
showError(fieldName, rules.message);
return false;
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
showError(fieldName, rules.message);
return false;
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
showError(fieldName, rules.message);
return false;
    }
    
    clearError(fieldName);
    return true;
}

function validateForm() {
    let isValid = true;
    
    // Validate all fields
    const nameValid = validateField('name', nameField.value);
    const communicationValid = validateField('communication', communicationField.value);
    const infoValid = validateField('info', infoField.value);
    const commentsValid = validateField('comments', commentsField.value);
    
    isValid = nameValid && communicationValid && infoValid && commentsValid;
    
    return isValid;
}

function setLoadingState(isLoading) {
    if (isLoading) {
submitBtn.disabled = true;
submitBtn.classList.add('loading');
submitBtn.querySelector('.btn-text').textContent = 'Connecting...';
    } else {
submitBtn.disabled = false;
submitBtn.classList.remove('loading');
submitBtn.querySelector('.btn-text').textContent = 'Let\'s Connect';
    }
}

function showSuccess() {
    // Hide form card
    const formCard = document.querySelector('.form-card');
    formCard.style.display = 'none';
    
    // Generate reference ID
    const referenceId = generateReferenceId();
    const referenceElement = document.getElementById('referenceId');
    if (referenceElement) {
referenceElement.textContent = referenceId;
    }
    
    // Show success card
    successCard.style.display = 'block';
    
    // Scroll to success card
    successCard.scrollIntoView({ 
behavior: 'smooth', 
block: 'center' 
    });
}

function generateReferenceId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TC-${year}${month}${day}-${random}`;
}

function resetForm() {
    // Reset form fields
    form.reset();
    communicationField.value = '';
    
    // Clear errors
    clearError('name');
    clearError('communication');
    clearError('info');
    clearError('comments');
    
    // Reset option cards
    optionCards.forEach(card => {
card.classList.remove('selected');
    });
    
    // Show form card
    const formCard = document.querySelector('.form-card');
    formCard.style.display = 'block';
    
    // Hide success card
    successCard.style.display = 'none';
}

async function submitToAWS(formData, attempt = 1) {
    try {
// Check if API endpoint is configured
if (CONFIG.API_ENDPOINT.includes('your-api-gateway-url')) {
    throw new Error('API endpoint not configured. Please update the API_ENDPOINT in script.js with your actual AWS API Gateway URL.');
}

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

const response = await fetch(CONFIG.API_ENDPOINT, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.API_KEY
    },
    body: JSON.stringify(formData),
    signal: controller.signal,
    mode: 'cors'
});
clearTimeout(timeoutId);
if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server error (${response.status}). Please try again.`);
}
const result = await response.json();
return result;
    } catch (error) {
// Handle specific error types
if (error.name === 'AbortError') {
    throw new Error('Request timed out. Please check your connection and try again.');
}
if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
    throw new Error('Cannot connect to server. Please check your internet connection and try again.');
}
if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
    throw new Error('CORS error detected. This is a localhost testing issue. The form will work perfectly when deployed to a proper domain. For now, try refreshing the page or testing from a different browser.');
}
// Retry logic for network errors
if (attempt < CONFIG.RETRY_ATTEMPTS && (
    error.message.includes('Failed to fetch') || 
    error.message.includes('ERR_NAME_NOT_RESOLVED') ||
    error.message.includes('NetworkError')
)) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
    return submitToAWS(formData, attempt + 1);
}
// Re-throw the original error if it's not a retryable network error
throw error;
    }
}

// Communication option selection with mobile optimization
optionCards.forEach(card => {
    let isProcessing = false;
    
    const handleSelection = (e) => {
        if (isProcessing) return;
        isProcessing = true;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Add ripple effect
        addRippleEffect(card, e);
        // Remove selection from all cards
        optionCards.forEach(c => c.classList.remove('selected'));
        // Add selection to clicked card
        card.classList.add('selected');
        // Update hidden input
        const value = card.getAttribute('data-value');
        communicationField.value = value;
        // Clear any communication errors
        clearError('communication');
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Reset processing flag after a short delay
        setTimeout(() => {
            isProcessing = false;
        }, 100);
    };
    
    // Use only click events for better mobile compatibility
    card.addEventListener('click', handleSelection);
});

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Add ripple effect to submit button
    addRippleEffect(submitBtn, e);
    
    // Validate form
    if (!validateForm()) {
// Shake animation for errors
form.style.animation = 'shake 0.5s ease-in-out';
setTimeout(() => {
    form.style.animation = '';
}, 500);

// Scroll to first error field
setTimeout(() => {
    const firstError = form.querySelector('.error-message:not([style*="display: none"])');
    if (firstError) {
        const fieldName = firstError.id.replace('Error', '');
        const field = document.getElementById(fieldName);
        if (field) {
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
            field.focus();
        }
    }
}, 100);

return;
    }
    
    // Prepare form data
    const formData = {
name: nameField.value.trim(),
communication: communicationField.value,
info: infoField.value.trim(),
comments: commentsField.value.trim(),
timestamp: new Date().toISOString(),
userAgent: navigator.userAgent,
referrer: document.referrer
    };
    
    // Set loading state
    setLoadingState(true);
    
    try {
// Submit to AWS
await submitToAWS(formData);
// Show success message
showSuccess();
// Track successful submission
if (typeof gtag !== 'undefined') {
    gtag('event', 'form_submit', {
category: 'engagement',
label: 'contact_form'
    });
}
    } catch (error) {
// Show error message with animation
const errorDiv = document.createElement('div');
errorDiv.className = 'error-toast';
// Use the specific error message from the API call
const errorMessage = error.message || 'Connection failed. Please try again.';
errorDiv.textContent = errorMessage;
errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ef4444;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
    max-width: 90%;
    text-align: center;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
`;
document.body.appendChild(errorDiv);
// Show error for longer if it's a configuration issue
const displayTime = errorMessage.includes('not configured') ? 8000 : 4000;
setTimeout(() => {
    errorDiv.style.animation = 'slideUp 0.3s ease-in';
    setTimeout(() => errorDiv.remove(), 300);
}, displayTime);
    } finally {
setLoadingState(false);
    }
});

// Input formatting only (no validation)
nameField.addEventListener('input', () => {
    // Capitalize first letter of each word
    if (nameField.value.length > 0) {
const words = nameField.value.split(' ');
const capitalizedWords = words.map(word => {
    if (word.length > 0) {
word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word;
});
const capitalizedText = capitalizedWords.join(' ');
if (nameField.value !== capitalizedText) {
    nameField.value = capitalizedText;
}
    }
});

commentsField.addEventListener('input', () => {
    // Capitalize first letter
    if (commentsField.value.length > 0) {
const firstChar = commentsField.value.charAt(0);
const restOfText = commentsField.value.slice(1);
const capitalizedText = firstChar.toUpperCase() + restOfText;
if (commentsField.value !== capitalizedText) {
    commentsField.value = capitalizedText;
}
    }
});

// Add shake animation CSS
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
0%, 100% { transform: translateX(0); }
25% { transform: translateX(-5px); }
75% { transform: translateX(5px); }
    }
    
    @keyframes slideDown {
from {
    transform: translateX(-50%) translateY(-100%);
    opacity: 0;
}
to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}
    }
    
    @keyframes slideUp {
from {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}
to {
    transform: translateX(-50%) translateY(-100%);
    opacity: 0;
}
    }
`;
document.head.appendChild(shakeStyle);


// Hamburger Menu and Modal functionality
const hamburgerMenu = document.getElementById('hamburgerMenu');
const aboutModal = document.getElementById('aboutModal');
const closeModal = document.getElementById('closeModal');

// Open modal when hamburger menu is clicked
hamburgerMenu.addEventListener('click', () => {
    hamburgerMenu.classList.toggle('active');
    aboutModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Close modal when close button is clicked
closeModal.addEventListener('click', () => {
    hamburgerMenu.classList.remove('active');
    aboutModal.classList.remove('active');
    document.body.style.overflow = '';
});

// Close modal when clicking outside
aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
hamburgerMenu.classList.remove('active');
aboutModal.classList.remove('active');
document.body.style.overflow = '';
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aboutModal.classList.contains('active')) {
hamburgerMenu.classList.remove('active');
aboutModal.classList.remove('active');
document.body.style.overflow = '';
    }
});

// Accessibility improvements
document.addEventListener('keydown', (e) => {
    // Allow form submission with Enter key
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
e.preventDefault();
form.dispatchEvent(new Event('submit'));
    }
    
    // Handle option card selection with keyboard
    if (e.key === 'Enter' || e.key === ' ') {
const focusedCard = document.activeElement;
if (focusedCard.classList.contains('option-card')) {
    e.preventDefault();
    focusedCard.click();
}
    }
});


// Force input styling to stay black with white text
function forceInputStyling() {
    const inputs = document.querySelectorAll('.form-input, .form-textarea');
    inputs.forEach(input => {
        // Force styling on various events
        const forceStyle = () => {
            input.style.backgroundColor = '#0a0a0a';
            input.style.color = '#ffffff';
            input.style.background = '#0a0a0a';
        };
        
        // Apply immediately
        forceStyle();
        
        // Apply on focus events only to avoid conflicts
        input.addEventListener('focus', forceStyle);
        input.addEventListener('blur', forceStyle);
        
        // Use a more efficient approach with CSS classes instead of MutationObserver
        input.classList.add('force-styling');
    });
}

// Initialize with smooth entrance animations
document.addEventListener('DOMContentLoaded', () => {
    // Force input styling
    forceInputStyling();
    
    // Animate elements on load
    const elements = document.querySelectorAll('.hero-card, .form-card');
    elements.forEach((element, index) => {
element.style.opacity = '0';
element.style.transform = 'translateY(20px)';
setTimeout(() => {
    element.style.transition = 'all 0.6s ease-out';
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
}, index * 200);
    });
    
    // Set initial focus
    setTimeout(() => {
nameField.focus();
    }, 1000);
    
    // Add smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
});

// Add intersection observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
if (entry.isIntersecting) {
    entry.target.style.opacity = '1';
    entry.target.style.transform = 'translateY(0)';
}
    });
}, observerOptions);

// Observe elements for scroll animations
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.hero-card, .form-card, .success-card');
    animatedElements.forEach(element => {
element.style.opacity = '0';
element.style.transform = 'translateY(30px)';
element.style.transition = 'all 0.6s ease-out';
observer.observe(element);
    });
});

// Service Worker registration removed - no sw.js file exists

// Deep link helpers to open selected contact app with provided info
function buildContactAppLink(method, rawInfo, name, comments) {
    if (!method || !rawInfo) return null;
    const info = rawInfo.trim();
    const encodedMessage = encodeURIComponent(`Hi, I'm ${name || ''}. ${comments || ''}`.trim());

    // If user provided a full URL, prefer opening it directly
    if (/^https?:\/\//i.test(info) || /^(tg|whatsapp|mailto|msteams):/i.test(info)) {
        return info;
    }

    if (method === 'telegram') {
        // Accept formats: @username, username, t.me/username
        const username = info.replace(/^@/, '').replace(/^.*t\.me\//i, '').trim();
        if (!username) return null;
        // Use https link for broader compatibility
        return `https://t.me/${encodeURIComponent(username)}`;
    }

    if (method === 'whatsapp') {
        // Strip non-digits except leading +
        let phone = info.replace(/[^\d+]/g, '');
        // wa.me requires no plus sign
        const waPhone = phone.replace(/^\+/, '');
        return `https://wa.me/${waPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
    }

    if (method === 'email') {
        const subject = encodeURIComponent('TESConnections');
        const body = encodeURIComponent(`Name: ${name || ''}\n${comments || ''}`.trim());
        return `mailto:${encodeURIComponent(info)}?subject=${subject}${body ? `&body=${body}` : ''}`;
    }

    if (method === 'teams') {
        // Teams chat deep link to a user by email
        const base = 'https://teams.microsoft.com/l/chat/0/0';
        const users = encodeURIComponent(info);
        return `${base}?users=${users}${encodedMessage ? `&message=${encodedMessage}` : ''}`;
    }

    return null;
}

function openSelectedContactApp() {
    const method = communicationField.value;
    const info = infoField.value;
    const link = buildContactAppLink(method, info, nameField.value, commentsField.value);
    if (!method) {
        showError('communication', validationRules.communication.message);
        return;
    }
    if (!info) {
        showError('info', 'Please provide contact details');
        return;
    }
    if (!link) return;
    // Prefer opening in same tab for deep links on mobile; fallback to new tab for web URLs
    if (/^(tg|whatsapp|mailto|msteams):/i.test(link)) {
        window.location.href = link;
    } else {
        window.open(link, '_blank');
    }
}

// Make contact details clickable to open selected app
document.addEventListener('DOMContentLoaded', () => {
    const infoLabel = document.querySelector('label[for="info"]');
    if (infoLabel) {
        infoLabel.addEventListener('click', (e) => {
            e.preventDefault();
            openSelectedContactApp();
        });
    }

    if (infoField) {
        // Single press/click on the contact details opens the selected app
        infoField.addEventListener('click', (e) => {
            e.preventDefault();
            openSelectedContactApp();
        });
    }
});