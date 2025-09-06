// TESConnections - Hinge-Style Interactions
// Configuration - Update these with your actual AWS API Gateway endpoint
const CONFIG = {
    API_ENDPOINT: 'https://your-api-gateway-url.amazonaws.com/prod/submit-contact',
    TIMEOUT: 10000 // 10 seconds
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
    // Hide form card with animation
    const formCard = document.querySelector('.form-card');
    formCard.style.transform = 'translateX(-100%)';
    formCard.style.opacity = '0';
    
    setTimeout(() => {
        formCard.style.display = 'none';
        successCard.style.display = 'block';
        successCard.style.transform = 'translateX(100%)';
        successCard.style.opacity = '0';
        
        // Animate success card in
        setTimeout(() => {
            successCard.style.transform = 'translateX(0)';
            successCard.style.opacity = '1';
        }, 50);
    }, 300);
    
    // Scroll to success card
    setTimeout(() => {
        successCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }, 400);
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
    formCard.style.transform = 'translateX(0)';
    formCard.style.opacity = '1';
    
    // Hide success card
    successCard.style.display = 'none';
}

async function submitToAWS(formData) {
    try {
        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error submitting form:', error);
        throw new Error('Failed to submit form. Please try again.');
    }
}

// Communication option selection
optionCards.forEach(card => {
    card.addEventListener('click', (e) => {
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
    });
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
                event_category: 'engagement',
                event_label: 'contact_form'
            });
        }
        
    } catch (error) {
        // Show error message with animation
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.textContent = 'Connection failed. Please try again.';
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
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'slideUp 0.3s ease-in';
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
        
        console.error('Form submission error:', error);
        
    } finally {
        setLoadingState(false);
    }
});

// Real-time validation with smooth animations
nameField.addEventListener('blur', () => {
    validateField('name', nameField.value);
});

nameField.addEventListener('input', () => {
    if (nameError.textContent) {
        validateField('name', nameField.value);
    }
});

infoField.addEventListener('blur', () => {
    validateField('info', infoField.value);
});

infoField.addEventListener('input', () => {
    if (infoField.value.length > validationRules.info.maxLength) {
        showError('info', validationRules.info.message);
    } else {
        clearError('info');
    }
});

commentsField.addEventListener('blur', () => {
    validateField('comments', commentsField.value);
});

commentsField.addEventListener('input', () => {
    if (commentsField.value.length > validationRules.comments.maxLength) {
        showError('comments', validationRules.comments.message);
    } else {
        clearError('comments');
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

// Character count indicators with animations
function addCharacterCounters() {
    const infoCounter = document.createElement('div');
    infoCounter.className = 'char-counter';
    infoCounter.style.cssText = `
        text-align: right; 
        font-size: 0.75rem; 
        color: #6b7280; 
        margin-top: 4px;
        transition: color 0.3s ease;
    `;
    infoField.parentNode.appendChild(infoCounter);
    
    const commentsCounter = document.createElement('div');
    commentsCounter.className = 'char-counter';
    commentsCounter.style.cssText = `
        text-align: right; 
        font-size: 0.75rem; 
        color: #6b7280; 
        margin-top: 4px;
        transition: color 0.3s ease;
    `;
    commentsField.parentNode.appendChild(commentsCounter);
    
    function updateCounters() {
        const infoCount = infoField.value.length;
        const commentsCount = commentsField.value.length;
        
        infoCounter.textContent = `${infoCount}/${validationRules.info.maxLength}`;
        commentsCounter.textContent = `${commentsCount}/${validationRules.comments.maxLength}`;
        
        // Change color when approaching limit
        if (infoCount > validationRules.info.maxLength * 0.8) {
            infoCounter.style.color = infoCount >= validationRules.info.maxLength ? '#ef4444' : '#f59e0b';
        } else {
            infoCounter.style.color = '#6b7280';
        }
        
        if (commentsCount > validationRules.comments.maxLength * 0.8) {
            commentsCounter.style.color = commentsCount >= validationRules.comments.maxLength ? '#ef4444' : '#f59e0b';
        } else {
            commentsCounter.style.color = '#6b7280';
        }
    }
    
    infoField.addEventListener('input', updateCounters);
    commentsField.addEventListener('input', updateCounters);
    
    // Initial count
    updateCounters();
}

// Initialize character counters
addCharacterCounters();

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

// Focus management with smooth transitions
form.addEventListener('submit', () => {
    setTimeout(() => {
        const firstError = form.querySelector('.error-message:not([style*="display: none"])');
        if (firstError) {
            const fieldName = firstError.id.replace('Error', '');
            const field = document.getElementById(fieldName);
            if (field) {
                field.focus();
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, 100);
});

// Initialize with smooth entrance animations
document.addEventListener('DOMContentLoaded', () => {
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

// Service Worker registration (optional - for offline support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}