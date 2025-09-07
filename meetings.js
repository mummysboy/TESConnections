// TESConnections - Meetings Page JavaScript
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
const selectedTimeSlotField = document.getElementById('selectedTimeSlot');

// Communication option cards
const optionCards = document.querySelectorAll('.option-card');

// Error elements
const nameError = document.getElementById('nameError');
const communicationError = document.getElementById('communicationError');
const timeSlotError = document.getElementById('timeSlotError');

// Calendar elements
const selectedDayElement = document.getElementById('selectedDay');
const prevDayBtn = document.getElementById('prevDay');
const nextDayBtn = document.getElementById('nextDay');

// Calendar data
const calendarData = {
    availableDates: [
        new Date(2024, 8, 12), // September 12, 2024 (month is 0-indexed)
        new Date(2024, 8, 13), // September 13, 2024
        new Date(2024, 8, 14), // September 14, 2024
        new Date(2024, 8, 15)  // September 15, 2024
    ],
    currentDateIndex: 0,
    selectedTimeSlot: null,
    bookedSlots: new Set([
        '2024-09-12-09:00',
        '2024-09-12-10:30',
        '2024-09-12-14:00',
        '2024-09-13-11:00',
        '2024-09-13-15:30',
        '2024-09-14-09:30',
        '2024-09-14-16:00',
        '2024-09-15-10:00',
        '2024-09-15-13:30'
    ])
};

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
    },
    timeSlot: {
        required: true,
        message: 'Please select a meeting time'
    }
};

// Generate time slots for a given date
function generateTimeSlots(date) {
    const slots = [];
    const startHour = 9; // 9:00 AM
    const endHour = 17; // 5:00 PM
    const interval = 15; // 15 minutes
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const dateString = date.toISOString().split('T')[0];
            const slotId = `${dateString}-${timeString}`;
            
            slots.push({
                id: slotId,
                time: timeString,
                date: dateString,
                booked: calendarData.bookedSlots.has(slotId)
            });
        }
    }
    
    return slots;
}

// Format date for display
function formatDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format date for day display
function formatDayDisplay(date) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayNumber = date.getDate();
    return { dayName, dayNumber };
}

// Update day navigation display
function updateDayDisplay() {
    const currentDate = calendarData.availableDates[calendarData.currentDateIndex];
    const { dayName, dayNumber } = formatDayDisplay(currentDate);
    
    selectedDayElement.innerHTML = `
        <div class="selected-day-date">${dayNumber}</div>
        <div class="selected-day-name">${dayName}</div>
    `;
    
    // Update navigation buttons
    prevDayBtn.disabled = calendarData.currentDateIndex === 0;
    nextDayBtn.disabled = calendarData.currentDateIndex === calendarData.availableDates.length - 1;
    
    // Generate time slots for current date
    generateTimeSlotsForDate(currentDate);
    clearError('timeSlot');
}

// Navigate to previous day
function navigateToPreviousDay() {
    if (calendarData.currentDateIndex > 0) {
        calendarData.currentDateIndex--;
        calendarData.selectedTimeSlot = null; // Reset time slot selection
        updateDayDisplay();
        
        // Add ripple effect to button
        addRippleEffect(prevDayBtn, { clientX: prevDayBtn.offsetLeft + prevDayBtn.offsetWidth/2, clientY: prevDayBtn.offsetTop + prevDayBtn.offsetHeight/2 });
    }
}

// Navigate to next day
function navigateToNextDay() {
    if (calendarData.currentDateIndex < calendarData.availableDates.length - 1) {
        calendarData.currentDateIndex++;
        calendarData.selectedTimeSlot = null; // Reset time slot selection
        updateDayDisplay();
        
        // Add ripple effect to button
        addRippleEffect(nextDayBtn, { clientX: nextDayBtn.offsetLeft + nextDayBtn.offsetWidth/2, clientY: nextDayBtn.offsetTop + nextDayBtn.offsetHeight/2 });
    }
}

// Generate time slots for selected date
function generateTimeSlotsForDate(date) {
    const slots = generateTimeSlots(date);
    
    // Remove existing time slots container
    const existingContainer = document.querySelector('.time-slots-container');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    // Create new time slots container
    const container = document.createElement('div');
    container.className = 'time-slots-container';
    container.style.display = 'block'; // Ensure it's visible
    
    const title = document.createElement('div');
    title.className = 'time-slots-title';
    title.textContent = `Available Times - ${formatDate(date)}`;
    container.appendChild(title);
    
    // Separate available and booked slots
    const availableSlots = slots.filter(slot => !slot.booked);
    const bookedSlots = slots.filter(slot => slot.booked);
    
    // Create time slots grid
    const grid = document.createElement('div');
    grid.className = 'time-slots-grid';
    
    // Create time slot elements
    slots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = 'time-slot';
        slotElement.dataset.slotId = slot.id;
        
        if (slot.booked) {
            slotElement.classList.add('booked');
        }
        
        slotElement.innerHTML = `
            <div class="time-slot-time">${slot.time}</div>
        `;
        
        if (!slot.booked) {
            slotElement.addEventListener('click', () => {
                selectTimeSlot(slot);
            });
        }
        
        grid.appendChild(slotElement);
    });
    
    container.appendChild(grid);
    
    // Insert after calendar container
    const calendarContainer = document.querySelector('.calendar-container');
    if (calendarContainer && calendarContainer.parentNode) {
        calendarContainer.parentNode.insertBefore(container, calendarContainer.nextSibling);
    }
    
    // Animate time slots appearance
    const timeSlots = container.querySelectorAll('.time-slot');
    timeSlots.forEach((slot, index) => {
        slot.style.opacity = '0';
        slot.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            slot.style.transition = 'all 0.4s ease-out';
            slot.style.opacity = '1';
            slot.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// Select a time slot
function selectTimeSlot(slot) {
    // Remove previous selection
    document.querySelectorAll('.time-slot').forEach(timeSlot => {
        timeSlot.classList.remove('selected');
    });
    
    // Add selection to clicked slot
    const slotElement = document.querySelector(`[data-slot-id="${slot.id}"]`);
    if (slotElement) {
        slotElement.classList.add('selected');
        
        // Add ripple effect
        addRippleEffect(slotElement, { clientX: slotElement.offsetLeft + slotElement.offsetWidth/2, clientY: slotElement.offsetTop + slotElement.offsetHeight/2 });
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    }
    
    calendarData.selectedTimeSlot = slot;
    selectedTimeSlotField.value = slot.id;
    clearError('timeSlot');
    
    // Scroll to submit button to show next step
    setTimeout(() => {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

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
    const timeSlotValid = validateField('timeSlot', selectedTimeSlotField.value);
    
    isValid = nameValid && communicationValid && infoValid && commentsValid && timeSlotValid;
    
    return isValid;
}

function setLoadingState(isLoading) {
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.querySelector('.btn-text').textContent = 'Booking...';
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.querySelector('.btn-text').textContent = 'Book Meeting';
    }
}

function showSuccess() {
    // Hide form card
    const formCard = document.querySelector('.form-card');
    formCard.style.display = 'none';
    
    // Show success card
    successCard.style.display = 'block';
    
    // Scroll to success card
    successCard.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
}

function resetForm() {
    // Reset form fields
    form.reset();
    communicationField.value = '';
    selectedTimeSlotField.value = '';
    
    // Clear errors
    clearError('name');
    clearError('communication');
    clearError('info');
    clearError('comments');
    clearError('timeSlot');
    
    // Reset option cards
    optionCards.forEach(card => {
        card.classList.remove('selected');
    });
    
    // Reset calendar navigation
    calendarData.currentDateIndex = 0;
    calendarData.selectedTimeSlot = null;
    
    // Remove time slots container
    const timeSlotsContainer = document.querySelector('.time-slots-container');
    if (timeSlotsContainer) {
        timeSlotsContainer.remove();
    }
    
    // Update day display
    updateDayDisplay();
    
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
            throw new Error('API endpoint not configured. Please update the API_ENDPOINT in meetings.js with your actual AWS API Gateway URL.');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
            signal: controller.signal,
            mode: 'cors'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP ${response.status}: ${errorText}`);
            throw new Error(`Server error (${response.status}). Please try again.`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
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
            console.log(`Retrying in ${CONFIG.RETRY_DELAY}ms... (attempt ${attempt + 1}/${CONFIG.RETRY_ATTEMPTS})`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            return submitToAWS(formData, attempt + 1);
        }
        
        // Re-throw the original error if it's not a retryable network error
        throw error;
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
        timeSlot: selectedTimeSlotField.value,
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
                event_label: 'meeting_booking'
            });
        }
        
    } catch (error) {
        // Show error message with animation
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        
        // Use the specific error message from the API call
        const errorMessage = error.message || 'Booking failed. Please try again.';
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
    // Capitalize first letter of each word
    if (nameField.value.length > 0) {
        const words = nameField.value.split(' ');
        const capitalizedWords = words.map(word => {
            if (word.length > 0) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word;
        });
        const capitalizedText = capitalizedWords.join(' ');
        
        if (nameField.value !== capitalizedText) {
            nameField.value = capitalizedText;
        }
    }
    
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
    // Capitalize first letter
    if (commentsField.value.length > 0) {
        const firstChar = commentsField.value.charAt(0);
        const restOfText = commentsField.value.slice(1);
        const capitalizedText = firstChar.toUpperCase() + restOfText;
        
        if (commentsField.value !== capitalizedText) {
            commentsField.value = capitalizedText;
        }
    }
    
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
        
        // Apply on multiple events
        input.addEventListener('input', forceStyle);
        input.addEventListener('change', forceStyle);
        input.addEventListener('focus', forceStyle);
        input.addEventListener('blur', forceStyle);
        input.addEventListener('keyup', forceStyle);
        input.addEventListener('keydown', forceStyle);
        
        // Apply immediately
        forceStyle();
        
        // Use MutationObserver to catch any style changes
        const observer = new MutationObserver(() => {
            if (input.style.backgroundColor !== '#0a0a0a' || input.style.color !== '#ffffff') {
                forceStyle();
            }
        });
        
        observer.observe(input, {
            attributes: true,
            attributeFilter: ['style']
        });
    });
}

// Initialize with smooth entrance animations
document.addEventListener('DOMContentLoaded', () => {
    // Force input styling
    forceInputStyling();
    
    // Initialize day navigation
    updateDayDisplay();
    
    // Add event listeners for navigation buttons
    prevDayBtn.addEventListener('click', navigateToPreviousDay);
    nextDayBtn.addEventListener('click', navigateToNextDay);
    
    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && !prevDayBtn.disabled) {
            navigateToPreviousDay();
        } else if (e.key === 'ArrowRight' && !nextDayBtn.disabled) {
            navigateToNextDay();
        }
    });
    
    // Animate elements on load
    const elements = document.querySelectorAll('.form-card');
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
    const animatedElements = document.querySelectorAll('.form-card, .success-card');
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.6s ease-out';
        observer.observe(element);
    });
});
