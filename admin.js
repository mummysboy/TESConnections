// TESConnections - Admin Dashboard JavaScript


// Configuration
const CONFIG = {
    API_ENDPOINT: 'https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/submit-contact',
    ADMIN_ENDPOINT: 'https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/admin-data',
    DELETE_ENDPOINT: 'https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/delete-submission',
    PIN_AUTH_ENDPOINT: 'https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/pin-auth',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};


// Authentication state
let isAuthenticated = false;
let authToken = null;

// DOM Elements - will be initialized after DOM loads
let totalMeetingsEl;
let todayMeetingsEl;
let totalConnectionsEl;
let loadingState;

// Meetings Section
let meetingsTableBody;
let meetingsCount;
let meetingsEmptyState;
let refreshMeetings;
let exportMeetings;

// Connections Section
let connectionsTableBody;
let connectionsCount;
let connectionsEmptyState;
let refreshConnections;
let exportConnections;

// Data storage
let allData = [];
let meetingsData = [];
let connectionsData = [];

// Mobile optimization function
function optimizeForMobile() {
    // Prevent zoom on input focus for iOS
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
    
    // Add touch-friendly styles
    document.body.style.touchAction = 'manipulation';
    
    // Optimize table scrolling
    const tableContainers = document.querySelectorAll('.mobile-table-container');
    tableContainers.forEach(container => {
        container.style.webkitOverflowScrolling = 'touch';
        container.style.overflowX = 'auto';
    });
    
    // Add mobile-specific event listeners
    addMobileEventListeners();
}

// Add mobile-specific event listeners
function addMobileEventListeners() {
    // Prevent double-tap zoom on buttons
    const buttons = document.querySelectorAll('.action-btn, .btn, button');
    buttons.forEach(button => {
        button.addEventListener('touchend', function(e) {
            e.preventDefault();
            button.click();
        }, { passive: false });
    });
    
    // Optimize table row interactions
    const tableRows = document.querySelectorAll('tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('touchstart', function(e) {
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        });
        
        row.addEventListener('touchend', function(e) {
            setTimeout(() => {
                this.style.backgroundColor = '';
            }, 150);
        });
    });
}

// Initialize DOM elements
function initializeDOMElements() {
    totalMeetingsEl = document.getElementById('totalMeetings');
    todayMeetingsEl = document.getElementById('todayMeetings');
    totalConnectionsEl = document.getElementById('totalConnections');
    loadingState = document.getElementById('loadingState');
    
    // Add mobile-specific optimizations
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        optimizeForMobile();
    }

    // Meetings Section
    meetingsTableBody = document.getElementById('meetingsTableBody');
    meetingsCount = document.getElementById('meetingsCount');
    meetingsEmptyState = document.getElementById('meetingsEmptyState');
    refreshMeetings = document.getElementById('refreshMeetings');
    exportMeetings = document.getElementById('exportMeetings');

    // Connections Section
    connectionsTableBody = document.getElementById('connectionsTableBody');
    connectionsCount = document.getElementById('connectionsCount');
    connectionsEmptyState = document.getElementById('connectionsEmptyState');
    refreshConnections = document.getElementById('refreshConnections');
    exportConnections = document.getElementById('exportConnections');
}

// Detect local development environment (kept for diagnostics only)
const IS_LOCAL = (typeof window !== 'undefined') && (
    location.protocol === 'file:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '0.0.0.0'
);

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    checkAuthentication();
    setupEventListeners();
    setupModal();
    // Optional: auto-open PIN modal via ?pin=1 or #pin
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('pin') === '1' || window.location.hash === '#pin') {
            showPinModal();
        }
    } catch (_) {}
});

// Check if user is already authenticated
function checkAuthentication() {
    console.log('Checking authentication...');
    
    // Check if user is already authenticated via PIN
    const storedAuth = localStorage.getItem('admin_authenticated');
    const storedToken = localStorage.getItem('admin_token');
    
    console.log('Stored auth:', storedAuth, 'Stored token:', storedToken ? 'present' : 'missing');
    
    if (storedAuth === 'true' && storedToken) {
        // Validate token format (basic check)
        try {
            // Basic JWT token validation - check if it has the right structure
            const tokenParts = storedToken.split('.');
            if (tokenParts.length === 3) {
                isAuthenticated = true;
                authToken = storedToken;
                console.log('Authentication valid, showing dashboard');
                showAdminDashboard();
            } else {
                console.log('Invalid token format, clearing authentication');
                clearAuthentication();
                showLoginScreen();
            }
        } catch (error) {
            console.log('Token validation failed:', error);
            clearAuthentication();
            showLoginScreen();
        }
    } else {
        console.log('No valid authentication found, showing login screen');
        clearAuthentication();
        showLoginScreen();
    }
}

// Clear authentication data
function clearAuthentication() {
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_token');
    isAuthenticated = false;
    authToken = null;
}

// Show login screen
function showLoginScreen() {
    const login = document.getElementById('loginScreen');
    const dashboard = document.getElementById('adminDashboard');
    if (login) login.style.display = 'block';
    if (dashboard) dashboard.style.display = 'none';
    isAuthenticated = false;
    authToken = null;
}

// Show admin dashboard
function showAdminDashboard() {
    const loginScreen = document.getElementById('loginScreen');
    const adminDashboard = document.getElementById('adminDashboard');

    // Ensure PIN modal is completely hidden first
    const pinModal = document.getElementById('pinModal');
    if (pinModal) {
        pinModal.classList.remove('show');
        pinModal.style.display = 'none';
    }
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminDashboard) adminDashboard.style.display = 'block';
    
    loadData();
}

// Update user info in header
function updateUserInfo(tokenPayload) {
    const userEmail = document.getElementById('userEmail');
    if (userEmail && tokenPayload.email) {
        userEmail.textContent = tokenPayload.email;
    }
}

// PIN Entry State
let pinEntry = '';
let pinModal = null;

// Handle PIN login
function handlePinLogin() {
    showPinModal();
}

// Show iPhone-style PIN modal
function showPinModal() {
    pinModal = document.getElementById('pinModal');
    if (pinModal) {
        pinModal.classList.add('show');
        pinEntry = '';
        updatePinDisplay();
        setupPinKeypad();
    }
}

// Hide PIN modal
function hidePinModal() {
    if (pinModal) {
        pinModal.classList.remove('show');
        pinModal.style.display = 'none'; // Ensure modal is completely hidden
        pinEntry = '';
        updatePinDisplay();
    }
}

// Update PIN display dots
function updatePinDisplay() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
        if (index < pinEntry.length) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
    });
    
    // Update submit button state
    const submitBtn = document.getElementById('pinSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = pinEntry.length !== 4;
    }
}

// Setup PIN keypad event listeners
function setupPinKeypad() {
    // Number keys
    const numberKeys = document.querySelectorAll('.pin-key[data-number]');
    numberKeys.forEach(key => {
        key.addEventListener('click', () => {
            const number = key.getAttribute('data-number');
            addPinDigit(number);
        });
    });
    
    // Backspace key
    const backspaceBtn = document.getElementById('backspaceBtn');
    if (backspaceBtn) {
        backspaceBtn.addEventListener('click', removePinDigit);
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('pinCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hidePinModal);
    }
    
    // Submit button
    const submitBtn = document.getElementById('pinSubmitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitPin);
    }
    
    // Keyboard support
    document.addEventListener('keydown', handlePinKeydown);
}

// Handle keyboard input for PIN
function handlePinKeydown(event) {
    if (!pinModal || !pinModal.classList.contains('show')) return;
    
    if (event.key >= '0' && event.key <= '9') {
        addPinDigit(event.key);
    } else if (event.key === 'Backspace') {
        removePinDigit();
    } else if (event.key === 'Enter' && pinEntry.length === 4) {
        submitPin();
    } else if (event.key === 'Escape') {
        hidePinModal();
    }
}

// Add digit to PIN entry
function addPinDigit(digit) {
    if (pinEntry.length < 4) {
        pinEntry += digit;
        updatePinDisplay();
        
        // Add visual feedback
        const key = document.querySelector(`[data-number="${digit}"]`);
        if (key) {
            key.classList.add('pressed');
            setTimeout(() => key.classList.remove('pressed'), 100);
        }
        
        // Auto-submit when 4 digits entered
        if (pinEntry.length === 4) {
            setTimeout(submitPin, 300);
        }
    }
}

// Remove last digit from PIN entry
function removePinDigit() {
    if (pinEntry.length > 0) {
        pinEntry = pinEntry.slice(0, -1);
        updatePinDisplay();
        
        // Add visual feedback
        const backspaceBtn = document.getElementById('backspaceBtn');
        if (backspaceBtn) {
            backspaceBtn.classList.add('pressed');
            setTimeout(() => backspaceBtn.classList.remove('pressed'), 100);
        }
    }
}

// Submit PIN for authentication
async function submitPin() {
    if (pinEntry.length !== 4) return;
    
    console.log('=== PIN AUTHENTICATION DEBUG ===');
    console.log('Submitting PIN for authentication...');
    console.log('PIN_AUTH_ENDPOINT:', CONFIG.PIN_AUTH_ENDPOINT);
    console.log('PIN length:', pinEntry.length);
    
    try {
        showPinLoading(true);
        
        // Call the PIN authentication endpoint
        const response = await fetch(CONFIG.PIN_AUTH_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pin: pinEntry }),
            mode: 'cors' // Explicitly set CORS mode
        });
        
        console.log('PIN auth response status:', response.status);
        console.log('PIN auth response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('PIN auth response data:', data);
        
        if (response.ok && data.success) {
            // Store the session token
            authToken = data.sessionToken;
            isAuthenticated = true;
            
            console.log('PIN authentication successful, storing token');
            console.log('Token length:', authToken.length);
            console.log('Token preview:', authToken.substring(0, 20) + '...');
            
            // Store authentication state in localStorage
            localStorage.setItem('admin_authenticated', 'true');
            localStorage.setItem('admin_token', authToken);
            
            // Create user object
            const user = {
                email: 'admin@tesconnections.com',
                name: 'Admin User'
            };
            
            hidePinModal();
            // Small delay to ensure modal is hidden before showing dashboard
            setTimeout(() => {
                showAdminDashboard();
                updateUserInfo(user);
            }, 100);
        } else {
            console.error('PIN authentication failed:', data.message);
            showPinError(data.message || 'Invalid PIN. Please try again.');
        }
    } catch (error) {
        console.error('PIN authentication error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        showPinError(`Authentication failed: ${error.message}`);
    } finally {
        showPinLoading(false);
    }
}

// Show PIN loading state
function showPinLoading(loading) {
    const submitBtn = document.getElementById('pinSubmitBtn');
    if (submitBtn) {
        if (loading) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            submitBtn.disabled = true;
        } else {
            submitBtn.innerHTML = 'Submit';
            submitBtn.disabled = pinEntry.length !== 4;
        }
    }
}

// Show PIN error
function showPinError(message) {
    const dots = document.querySelector('.pin-dots');
    if (dots) {
        dots.classList.add('error');
        setTimeout(() => dots.classList.remove('error'), 500);
    }
    
    // Clear PIN entry
    pinEntry = '';
    updatePinDisplay();
    
    // Show error message
    showError(message);
}

// Clean up PIN modal event listeners
function cleanupPinModal() {
    document.removeEventListener('keydown', handlePinKeydown);
}

// Handle logout
function handleLogout() {
    // Clear authentication data
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_token');
    sessionStorage.clear();
    
    // Reset authentication state
    isAuthenticated = false;
    authToken = null;
    
    // Show login screen
    showLoginScreen();
}

// Show debug information
function showDebugInfo() {
    const debugInfo = {
        isLocal: IS_LOCAL,
        isAuthenticated: isAuthenticated,
        hasToken: !!authToken,
        tokenType: authToken === 'test-token' ? 'test' : 'real',
        apiEndpoint: CONFIG.ADMIN_ENDPOINT,
        pinAuthEndpoint: CONFIG.PIN_AUTH_ENDPOINT,
        localStorage: {
            admin_authenticated: localStorage.getItem('admin_authenticated'),
            admin_token: localStorage.getItem('admin_token') ? 'present' : 'missing'
        },
        dataCounts: {
            allData: allData.length,
            meetings: meetingsData.length,
            connections: connectionsData.length
        },
        userAgent: navigator.userAgent,
        location: window.location.href
    };
    
    const debugText = JSON.stringify(debugInfo, null, 2);
    
    // Create debug modal
    const modalContent = `
        <div class="debug-modal-header">
            <h3 class="debug-modal-title">
                <i class="fas fa-bug"></i>
                Debug Information
            </h3>
            <button class="debug-modal-close" onclick="closeDebugModal()">&times;</button>
        </div>
        <div class="debug-modal-body">
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${debugText}</pre>
            <div style="margin-top: 15px;">
                <button onclick="copyDebugInfo()" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-copy"></i> Copy Debug Info
                </button>
                <button onclick="testApiConnection()" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                    <i class="fas fa-network-wired"></i> Test API Connection
                </button>
            </div>
        </div>
    `;
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'debug-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="debug-modal-content">
            ${modalContent}
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    // Store debug info globally for copying
    window.debugInfo = debugText;
    
    // Show modal with animation
    setTimeout(() => {
        modalOverlay.classList.add('active');
    }, 10);
    
    // Close on outside click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeDebugModal();
        }
    });
}

// Close debug modal
function closeDebugModal() {
    const modalOverlay = document.querySelector('.debug-modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
        setTimeout(() => {
            modalOverlay.remove();
        }, 300);
    }
}

// Copy debug info to clipboard
function copyDebugInfo() {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(window.debugInfo).then(() => {
            showSuccess('Debug info copied to clipboard');
        }).catch(() => {
            showError('Failed to copy debug info');
        });
    } else {
        showError('Clipboard API not available');
    }
}

// Test API connection
async function testApiConnection() {
    try {
        const response = await fetch(CONFIG.ADMIN_ENDPOINT, {
            method: 'GET',
            mode: 'cors'
        });
        
        const result = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            url: response.url
        };
        
        console.log('API connection test result:', result);
        showSuccess(`API test completed. Status: ${response.status}`);
    } catch (error) {
        console.error('API connection test failed:', error);
        showError(`API test failed: ${error.message}`);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Authentication events
    const pinLoginBtn = document.getElementById('pinLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const testDashboardBtn = document.getElementById('testDashboardBtn');
    const debugInfoBtn = document.getElementById('debugInfoBtn');
    
    if (pinLoginBtn) {
        pinLoginBtn.addEventListener('click', handlePinLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    if (testDashboardBtn) {
        testDashboardBtn.addEventListener('click', () => {
            console.log('Test dashboard button clicked');
            isAuthenticated = true;
            authToken = 'test-token';
            showAdminDashboard();
        });
    }
    
    if (debugInfoBtn) {
        debugInfoBtn.addEventListener('click', showDebugInfo);
    }
    
    // Meetings section
    if (refreshMeetings) {
        refreshMeetings.addEventListener('click', loadData);
    }
    if (exportMeetings) {
        exportMeetings.addEventListener('click', () => exportData('meetings'));
    }
    
    // Connections section
    if (refreshConnections) {
        refreshConnections.addEventListener('click', loadData);
    }
    if (exportConnections) {
        exportConnections.addEventListener('click', () => exportData('connections'));
    }
    
    // Use event delegation for table row clicks
    setupTableClickDelegation();
}

// Load data from API
async function loadData() {
    console.log('=== LOAD DATA DEBUG ===');
    console.log('Loading admin data...');
    console.log('Current authentication state:', {
        isAuthenticated: isAuthenticated,
        hasToken: !!authToken,
        tokenType: authToken === 'test-token' ? 'test' : 'real'
    });
    
    showLoading(true);
    
    try {
        const data = await fetchAdminData();
        console.log('Fetched data:', data);
        console.log('Data length:', data.length);
        
        if (data.length === 0) {
            console.log('No data found in database');
            showError('No data found in database.');
            meetingsData = [];
            connectionsData = [];
        } else {
            allData = data;
            console.log('Total data items:', allData.length);
            
            // Separate meetings and connections
            meetingsData = allData.filter(item => item.type === 'meeting');
            connectionsData = allData.filter(item => item.type === 'connection');
            
            console.log('Meetings:', meetingsData.length, 'Connections:', connectionsData.length);
            
            // Sort meetings by actual meeting time (soonest to latest)
            meetingsData.sort((a, b) => {
                const timeA = getActualMeetingTime(a);
                const timeB = getActualMeetingTime(b);
                
                // If both have valid meeting times, sort by time (soonest first)
                if (timeA && timeB) {
                    return timeA - timeB;
                }
                // If only one has a valid meeting time, prioritize it
                if (timeA && !timeB) return -1;
                if (!timeA && timeB) return 1;
                // If neither has a valid meeting time, sort by submission timestamp (oldest first)
                return new Date(a.timestamp) - new Date(b.timestamp);
            });
            
            // Sort connections by submission date (newest first)
            connectionsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        
        console.log('About to update stats and render tables');
        updateStats();
        renderTables();
        console.log('Stats updated and tables rendered');
        
    } catch (error) {
        console.error('Error in loadData:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        showError(`Failed to load data: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Fetch data from API
async function fetchAdminData() {
    try {
        console.log('=== FETCH ADMIN DATA DEBUG ===');
        console.log('IS_LOCAL:', IS_LOCAL);
        console.log('isAuthenticated:', isAuthenticated);
        console.log('authToken:', authToken ? 'present' : 'missing');
        console.log('ADMIN_ENDPOINT:', CONFIG.ADMIN_ENDPOINT);
        
        // In local development, load mock data
        if (IS_LOCAL) {
            console.log('Loading mock data for local development');
            try {
                const resp = await fetch('admin-sample.json', { cache: 'no-store' });
                if (resp.ok) {
                    const mock = await resp.json();
                    console.log('Loaded mock data:', mock);
                    return Array.isArray(mock) ? mock : (mock.submissions || []);
                }
            } catch (error) {
                console.error('Failed to load mock data:', error);
            }
            return [];
        }
        
        // Check authentication before making API call
        if (!isAuthenticated || !authToken) {
            console.error('Not authenticated - cannot fetch admin data');
            showError('Authentication required. Please log in again.');
            return [];
        }
        
        // Handle test token - load mock data
        if (authToken === 'test-token') {
            console.log('Using test token, loading mock data');
            try {
                const resp = await fetch('admin-sample.json', { cache: 'no-store' });
                if (resp.ok) {
                    const mock = await resp.json();
                    console.log('Loaded mock data for test:', mock);
                    return Array.isArray(mock) ? mock : (mock.submissions || []);
                }
            } catch (error) {
                console.error('Failed to load mock data for test:', error);
            }
            return [];
        }
        
        // Avoid sending Content-Type on GET; pass token via query to prevent preflight
        let url = CONFIG.ADMIN_ENDPOINT;
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}token=${encodeURIComponent(authToken)}`;
        
        console.log('Fetching admin data from:', url);
        console.log('Token length:', authToken.length);
        console.log('Token preview:', authToken.substring(0, 20) + '...');
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('Admin data response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Handle authentication errors
        if (response.status === 401) {
            console.error('Authentication failed - token may be expired');
            showError('Authentication expired. Please log in again.');
            // Clear invalid authentication
            localStorage.removeItem('admin_authenticated');
            localStorage.removeItem('admin_token');
            isAuthenticated = false;
            authToken = null;
            showLoginScreen();
            return [];
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error:', response.status, errorText);
            throw new Error(`Failed to fetch data: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Received admin data:', data);
        console.log('Data type:', typeof data);
        console.log('Is array:', Array.isArray(data));
        
        // Handle different response formats
        if (Array.isArray(data)) {
            console.log('Returning data as array, length:', data.length);
            return data;
        } else if (data.submissions) {
            console.log('Returning data.submissions, length:', data.submissions.length);
            return data.submissions;
        } else if (data.data) {
            console.log('Returning data.data, length:', data.data.length);
            return data.data;
        } else {
            console.warn('Unexpected data format:', data);
            return [];
        }
        
    } catch (error) {
        console.error('Error fetching admin data:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        if (!IS_LOCAL) {
            showError(`Failed to load data: ${error.message}`);
        }
        return [];
    }
}


// Update statistics
function updateStats() {
    const totalMeetings = meetingsData.length;
    const totalConnections = connectionsData.length;
    const today = new Date().toDateString();
    
    const todayMeetings = meetingsData.filter(item => {
        const meetingDate = item.timeSlot ? new Date(item.timeSlot).toDateString() : null;
        return meetingDate === today;
    }).length;
    
    if (totalMeetingsEl) totalMeetingsEl.textContent = totalMeetings;
    if (totalConnectionsEl) totalConnectionsEl.textContent = totalConnections;
    if (todayMeetingsEl) todayMeetingsEl.textContent = todayMeetings;
    
    // Update count badges
    if (meetingsCount) meetingsCount.textContent = meetingsData.length;
    if (connectionsCount) connectionsCount.textContent = connectionsData.length;
}

// Render both tables
function renderTables() {
    renderMeetingsTable();
    renderConnectionsTable();
}

// Render meetings table
function renderMeetingsTable() {
    if (!meetingsTableBody || !meetingsEmptyState) {
        return;
    }
    
    if (meetingsData.length === 0) {
        meetingsTableBody.innerHTML = '';
        meetingsEmptyState.style.display = 'block';
        return;
    }
    
    meetingsEmptyState.style.display = 'none';
    meetingsTableBody.innerHTML = meetingsData.map(item => {
        // Validate and clean data
        const cleanItem = validateAndCleanMeetingData(item);
        
        // Check if mobile device
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile layout - show only essential info
            let actualTimeSlot = 'Not scheduled';
            if (item.timeSlot && item.timeSlot.trim()) {
                // Extract just the time part from format "YYYY-MM-DD-HH:MM"
                if (item.timeSlot.includes('-') && item.timeSlot.includes(':')) {
                    const parts = item.timeSlot.split('-');
                    if (parts.length >= 4) {
                        actualTimeSlot = parts[3]; // Get the time part (HH:MM)
                    }
                } else {
                    actualTimeSlot = item.timeSlot;
                }
            }
            return `
            <tr class="clickable-row" data-id="${cleanItem.id}" data-type="meeting">
                <td class="mobile-hide"></td>
                <td class="name-cell">
                    <div class="mobile-name-info">
                        <div class="name">${cleanItem.name}</div>
                        <div class="mobile-meeting-time">${actualTimeSlot}</div>
                    </div>
                </td>
                <td class="meeting-time mobile-hide">${cleanItem.meetingTime}</td>
                <td class="meeting-actions">
                    <div class="action-buttons">
                        <button class="action-btn-small view-btn" onclick="event.stopPropagation(); showDetailedView('${cleanItem.id}', 'meeting')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn-small delete-btn" onclick="event.stopPropagation(); deleteItem('${cleanItem.id}')" title="Delete Meeting">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        } else {
            // Desktop layout - show all columns
            return `
            <tr class="clickable-row" data-id="${cleanItem.id}" data-type="meeting">
                <td></td>
                <td class="name-cell">${cleanItem.name}</td>
                <td class="meeting-time">${cleanItem.meetingTime}</td>
                <td class="meeting-actions">
                    <div class="action-buttons">
                        <button class="action-btn view-btn" onclick="event.stopPropagation(); showDetailedView('${cleanItem.id}', 'meeting')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="event.stopPropagation(); editMeeting('${cleanItem.id}')" title="Edit Meeting">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="event.stopPropagation(); deleteItem('${cleanItem.id}')" title="Delete Meeting">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }
    }).join('');
}

// Validate and clean meeting data
function validateAndCleanMeetingData(item) {
    
    const cleaned = {
        id: item.id || 'unknown',
        name: item.name || '',
        communication: item.communication ? item.communication.trim() : 'Not specified',
        contactDetails: getContactDetailsDisplay(item),
        meetingTime: getMeetingTimeDisplay(item),
        comments: item.comments ? item.comments.trim() : 'No comments',
        submittedDate: formatDate(item.timestamp),
        originalData: item // Keep original for detailed view
    };
    
    return cleaned;
}

// Render connections table
function renderConnectionsTable() {
    if (!connectionsTableBody || !connectionsEmptyState) {
        return;
    }
    
    if (connectionsData.length === 0) {
        connectionsTableBody.innerHTML = '';
        connectionsEmptyState.style.display = 'block';
        return;
    }
    
    connectionsEmptyState.style.display = 'none';
    connectionsTableBody.innerHTML = connectionsData.map(item => {
        // Validate and clean data
        const cleanItem = validateAndCleanConnectionData(item);
        
        // Check if mobile device
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile layout - show only essential info
            return `
            <tr class="clickable-row" data-id="${cleanItem.id}" data-type="connection">
                <td class="name-cell">
                    <div class="mobile-connection-info">
                        <div class="name">${cleanItem.name}</div>
                        <div class="mobile-contact-info">
                            <i class="fas fa-${getCommunicationIcon(cleanItem.communication)}"></i>
                            ${cleanItem.communication}: ${cleanItem.contactDetails}
                        </div>
                        <div class="mobile-submitted-date">Submitted: ${cleanItem.submittedDate}</div>
                    </div>
                </td>
                <td class="contact-info-cell mobile-hide">
                    <div class="contact-method">
                        <i class="fas fa-${getCommunicationIcon(cleanItem.communication)}"></i>
                        ${cleanItem.communication}
                    </div>
                    <div class="contact-details">${cleanItem.contactDetails}</div>
                </td>
                <td class="meeting-time mobile-hide">${cleanItem.submittedDate}</td>
                <td class="meeting-actions">
                    <div class="action-buttons">
                        <button class="action-btn-small view-btn" onclick="event.stopPropagation(); showDetailedView('${cleanItem.id}', 'connection')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn-small delete-btn" onclick="event.stopPropagation(); deleteItem('${cleanItem.id}')" title="Delete Connection">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        } else {
            // Desktop layout - show all columns
            return `
            <tr class="clickable-row" data-id="${cleanItem.id}" data-type="connection">
                <td class="name-cell">${cleanItem.name}</td>
                <td class="contact-info-cell">
                    <div class="contact-method">
                        <i class="fas fa-${getCommunicationIcon(cleanItem.communication)}"></i>
                        ${cleanItem.communication}
                    </div>
                    <div class="contact-details">${cleanItem.contactDetails}</div>
                </td>
                <td class="meeting-time">${cleanItem.submittedDate}</td>
                <td class="meeting-actions">
                    <div class="action-buttons">
                        <button class="action-btn view-btn" onclick="event.stopPropagation(); showDetailedView('${cleanItem.id}', 'connection')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="event.stopPropagation(); editConnection('${cleanItem.id}')" title="Edit Connection">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="event.stopPropagation(); deleteItem('${cleanItem.id}')" title="Delete Connection">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }
    }).join('');
}

// Validate and clean connection data
function validateAndCleanConnectionData(item) {
    return {
        id: item.id || 'unknown',
        name: item.name || '',
        communication: item.communication ? item.communication.trim() : 'Not specified',
        contactDetails: getContactDetailsDisplay(item),
        comments: item.comments ? item.comments.trim() : 'No comments',
        submittedDate: formatDate(item.timestamp),
        originalData: item // Keep original for detailed view
    };
}

// Get contact details display - properly extract contact information
function getContactDetailsDisplay(item) {
    // The info field should contain the actual contact details (email, phone, username, etc.)
    if (item.info && item.info.trim()) {
        const info = item.info.trim();
        
        // Check if info contains a date/time pattern (which shouldn't be contact details)
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i;
        
        // If info field contains ONLY a date pattern, don't use it for contact details
        if (datePattern.test(info) && info.match(datePattern)[0] === info) {
            return 'Contact details not provided';
        }
        
        // If info field contains a date pattern, extract the non-date part
        if (datePattern.test(info)) {
            const nonDatePart = info.replace(datePattern, '').trim();
            if (nonDatePart) {
                return nonDatePart;
            }
        }
        
        // Use the info field as contact details
        return info;
    }
    
    // If no info field, check if comments might contain contact details
    if (item.comments && item.comments.trim()) {
        const comments = item.comments.trim();
        
        // Don't use comments if they contain date patterns
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i;
        if (!datePattern.test(comments)) {
            return comments;
        }
    }
    
    return 'Contact details not provided';
}

// Get actual meeting time for sorting - extracts the actual Date object
function getActualMeetingTime(item) {
    // First priority: timeSlot field (this is the proper field for meeting times)
    if (item.timeSlot && item.timeSlot.trim() && item.timeSlot !== 'N/A' && item.timeSlot !== '') {
        try {
            // Handle the custom format used by the calendar (YYYY-MM-DD-HH:MM)
            if (item.timeSlot.includes('-') && item.timeSlot.includes(':')) {
                const parts = item.timeSlot.split('-');
                if (parts.length >= 4) {
                    const [year, month, day, time] = parts;
                    const [hour, minute] = time.split(':');
                    const meetingDate = new Date(year, month - 1, day, hour, minute);
                    if (!isNaN(meetingDate.getTime())) {
                        return meetingDate.getTime();
                    }
                }
            }
            
            // Try to parse as ISO date
            const date = new Date(item.timeSlot);
            if (!isNaN(date.getTime())) {
                return date.getTime();
            }
        } catch (error) {
        }
    }
    
    // Second priority: Check if info field contains a formatted date/time
    if (item.info && item.info.trim()) {
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i;
        const dateMatch = item.info.match(datePattern);
        if (dateMatch) {
            const date = new Date(dateMatch[0]);
            if (!isNaN(date.getTime())) {
                return date.getTime();
            }
        }
    }
    
    // Third priority: Check if comments field contains a formatted date/time
    if (item.comments && item.comments.trim()) {
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i;
        const dateMatch = item.comments.match(datePattern);
        if (dateMatch) {
            const date = new Date(dateMatch[0]);
            if (!isNaN(date.getTime())) {
                return date.getTime();
            }
        }
    }
    
    return null;
}

// Get meeting time display - properly extract and format meeting times
function getMeetingTimeDisplay(item) {
    // First priority: timeSlot field (this is the proper field for meeting times)
    if (item.timeSlot && item.timeSlot.trim() && item.timeSlot !== 'N/A' && item.timeSlot !== '') {
        return formatMeetingTime(item.timeSlot);
    }
    
    // Second priority: Check if info field contains a formatted date/time
    if (item.info && item.info.trim()) {
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i;
        const dateMatch = item.info.match(datePattern);
        if (dateMatch) {
            return dateMatch[0];
        }
    }
    
    // Third priority: Check if comments field contains a formatted date/time
    if (item.comments && item.comments.trim()) {
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i;
        const dateMatch = item.comments.match(datePattern);
        if (dateMatch) {
            return dateMatch[0];
        }
    }
    
    // Fallback: Use timestamp if no meeting time is found
    if (item.timestamp) {
        return formatDate(item.timestamp);
    }
    
    return 'Not scheduled';
}

// Format meeting time - handles various timeSlot formats
function formatMeetingTime(timeSlot) {
    if (!timeSlot) return 'N/A';
    
    try {
        // Handle the custom format used by the calendar (YYYY-MM-DD-HH:MM)
        if (timeSlot.includes('-') && timeSlot.includes(':')) {
            const parts = timeSlot.split('-');
            if (parts.length >= 4) {
                const [year, month, day, time] = parts;
                const [hour, minute] = time.split(':');
                const meetingDate = new Date(year, month - 1, day, hour, minute);
                if (!isNaN(meetingDate.getTime())) {
                    return meetingDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                }
            }
        }
        
        // Try to parse as ISO date
        const date = new Date(timeSlot);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
        
        // If it's already a formatted string, return as-is
        if (typeof timeSlot === 'string' && timeSlot.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i)) {
            return timeSlot;
        }
        
        // If all else fails, return the raw value
        return timeSlot;
    } catch (error) {
        return timeSlot || 'Invalid time';
    }
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

// Get communication icon based on communication method
function getCommunicationIcon(communication) {
    if (!communication) return 'question-circle';
    
    const comm = communication.toLowerCase().trim();
    
    // Map communication methods to appropriate icons
    const iconMap = {
        'email': 'envelope',
        'telegram': 'paper-plane',
        'teams': 'video',
        'whatsapp': 'whatsapp',
        'phone': 'phone',
        'call': 'phone',
        'text': 'sms',
        'sms': 'sms',
        'linkedin': 'linkedin',
        'zoom': 'video',
        'meeting': 'video',
        'discord': 'discord',
        'slack': 'slack'
    };
    
    // Check for exact matches first
    if (iconMap[comm]) {
        return iconMap[comm];
    }
    
    // Check for partial matches
    for (const [key, icon] of Object.entries(iconMap)) {
        if (comm.includes(key)) {
            return icon;
        }
    }
    
    // Default fallback
    return 'comment';
}

// Setup event delegation for table clicks
function setupTableClickDelegation() {
    // Add click listener to document to catch clicks on dynamically added rows
    document.addEventListener('click', (e) => {
        // Check if clicked element is a clickable row or inside one
        const clickableRow = e.target.closest('.clickable-row');
        if (clickableRow) {
            
            const id = clickableRow.getAttribute('data-id');
            const type = clickableRow.getAttribute('data-type');
            
            if (id && type) {
                showDetailedView(id, type);
            }
        }
    });
}

// Show detailed view popup
function showDetailedView(id, type) {
    const item = allData.find(item => item.id === id);
    if (!item) {
        return;
    }
    
    // Clean the data for display
    const cleanItem = type === 'meeting' ? validateAndCleanMeetingData(item) : validateAndCleanConnectionData(item);
    
    const typeIcon = type === 'meeting' ? 'calendar-check' : 'handshake';
    const typeLabel = type === 'meeting' ? 'Meeting Details' : 'Connection Details';
    
    const modalContent = `
        <div class="detail-modal-header">
            <h3 class="detail-modal-title">
                <i class="fas fa-${typeIcon}"></i>
                ${typeLabel}
            </h3>
            <button class="detail-modal-close" onclick="closeDetailedView()">&times;</button>
        </div>
        <div class="detail-modal-body">
            <div class="detail-section">
                <h4 class="detail-section-title">
                    <i class="fas fa-user"></i>
                    Contact Information
                </h4>
                <div class="detail-field">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value highlight">${cleanItem.name}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Communication:</span>
                    <span class="detail-value">
                        <i class="fas fa-${getCommunicationIcon(cleanItem.communication)}"></i>
                        ${cleanItem.communication}
                    </span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Contact Details:</span>
                    <span class="detail-value contact-info">${cleanItem.contactDetails}</span>
                </div>
            </div>
            
            ${type === 'meeting' && cleanItem.meetingTime !== 'Not scheduled' ? `
                <div class="detail-section">
                    <h4 class="detail-section-title">
                        <i class="fas fa-clock"></i>
                        Meeting Schedule
                    </h4>
                    <div class="detail-field">
                        <span class="detail-label">Scheduled Time:</span>
                        <span class="detail-value highlight">${cleanItem.meetingTime}</span>
                    </div>
                </div>
            ` : ''}
            
            <div class="detail-section">
                <h4 class="detail-section-title">
                    <i class="fas fa-comment"></i>
                    Comments
                </h4>
                <div class="detail-field">
                    <span class="detail-value comments">${item.comments || 'No comments provided'}</span>
                </div>
            </div>
        </div>
    `;
    
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'detail-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="detail-modal-content">
            ${modalContent}
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    // Show modal with animation
    setTimeout(() => {
        modalOverlay.classList.add('active');
    }, 10);
    
    // Close on outside click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeDetailedView();
        }
    });
    
    // Close on escape key
    document.addEventListener('keydown', handleDetailModalEscape);
}

// Close detailed view
function closeDetailedView() {
    const modalOverlay = document.querySelector('.detail-modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
        setTimeout(() => {
            modalOverlay.remove();
        }, 300);
    }
    document.removeEventListener('keydown', handleDetailModalEscape);
}

// Handle escape key for detail modal
function handleDetailModalEscape(e) {
    if (e.key === 'Escape') {
        closeDetailedView();
    }
}

// Edit meeting function
function editMeeting(id) {
    const item = allData.find(item => item.id === id);
    if (!item) {
        showError('Meeting not found');
        return;
    }
    
    // For now, show a simple prompt to edit the meeting time
    const currentTime = getMeetingTimeDisplay(item);
    const newTime = prompt('Edit meeting time:', currentTime);
    
    if (newTime && newTime !== currentTime) {
        // Update the item in the data
        item.timeSlot = newTime;
        
        // Re-render the table
        renderTables();
        
        showSuccess('Meeting time updated successfully');
    }
}

// Edit connection function
function editConnection(id) {
    const item = allData.find(item => item.id === id);
    if (!item) {
        showError('Connection not found');
        return;
    }
    
    // For now, show a simple prompt to edit the comments
    const currentComments = item.comments || '';
    const newComments = prompt('Edit comments:', currentComments);
    
    if (newComments !== null && newComments !== currentComments) {
        // Update the item in the data
        item.comments = newComments;
        
        // Re-render the table
        renderTables();
        
        showSuccess('Connection updated successfully');
    }
}

// Delete item
async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    
    try {
        // Call delete API endpoint
        await deleteFromAPI(id);
        
        // Remove from data
        allData = allData.filter(item => item.id !== id);
        meetingsData = meetingsData.filter(item => item.id !== id);
        connectionsData = connectionsData.filter(item => item.id !== id);
        
        updateStats();
        renderTables();
        
        showSuccess('Submission deleted successfully');
        
    } catch (error) {
        showError('Failed to delete submission. Please try again.');
    }
}

// Delete from API
async function deleteFromAPI(id) {
    // Use query params to avoid DELETE body/preflight
    let url = CONFIG.DELETE_ENDPOINT;
    const params = new URLSearchParams();
    params.set('id', id);
    if (isAuthenticated && authToken) {
        params.set('token', authToken);
    }
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}${params.toString()}`;
    const response = await fetch(url, {
        method: 'DELETE'
    });
    
    if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
    }
    
    return response.json();
}

// Export data
function exportData(type = 'all') {
    let dataToExport = [];
    let filename = '';
    
    switch (type) {
        case 'meetings':
            dataToExport = meetingsData;
            filename = 'tesconnections-meetings.csv';
            break;
        case 'connections':
            dataToExport = connectionsData;
            filename = 'tesconnections-connections.csv';
            break;
        default:
            dataToExport = [...meetingsData, ...connectionsData];
            filename = 'tesconnections-all-data.csv';
    }
    
    const csvContent = generateCSV(dataToExport);
    downloadCSV(csvContent, filename);
}

// Generate CSV content
function generateCSV(data) {
    const headers = ['ID', 'Name', 'Communication', 'Contact Details', 'Meeting Time', 'Comments', 'Submitted', 'Type'];
    const rows = data.map(item => [
        item.id,
        item.name,
        item.communication,
        item.info,
        item.timeSlot ? formatMeetingTime(item.timeSlot) : 'N/A',
        item.comments || '',
        formatDate(item.timestamp),
        item.type
    ]);
    
    const csvRows = [headers, ...rows].map(row => 
        row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
    );
    
    return csvRows.join('\n');
}

// Download CSV file
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Show/hide loading state
function showLoading(show) {
    if (!loadingState) {
        return;
    }
    
    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
        if (meetingsEmptyState) meetingsEmptyState.style.display = 'none';
        if (connectionsEmptyState) connectionsEmptyState.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-toast';
    errorDiv.textContent = message;
    
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => errorDiv.remove(), 300);
    }, 4000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-toast';
    successDiv.textContent = message;
    
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

// Modal functionality
let currentModal = null;

function showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content">
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
    currentModal = modal;
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close on escape key
    document.addEventListener('keydown', handleEscapeKey);
}

function closeModal() {
    if (currentModal) {
        currentModal.remove();
        currentModal = null;
        document.removeEventListener('keydown', handleEscapeKey);
    }
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
}

// Setup hamburger menu modal
function setupModal() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const aboutModal = document.getElementById('aboutModal');
    const closeModal = document.getElementById('closeModal');

    if (hamburgerMenu && aboutModal && closeModal) {
        hamburgerMenu.addEventListener('click', () => {
            hamburgerMenu.classList.toggle('active');
            aboutModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        closeModal.addEventListener('click', () => {
            hamburgerMenu.classList.remove('active');
            aboutModal.classList.remove('active');
            document.body.style.overflow = '';
        });

        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                hamburgerMenu.classList.remove('active');
                aboutModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}


// Test API endpoints directly
window.testAdminAPI = async function() {
    console.log('=== TESTING ADMIN API ENDPOINTS ===');
    
    // Test PIN auth endpoint
    console.log('Testing PIN auth endpoint...');
    try {
        const pinResponse = await fetch(CONFIG.PIN_AUTH_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pin: '1234' }),
            mode: 'cors'
        });
        
        console.log('PIN auth response status:', pinResponse.status);
        const pinData = await pinResponse.json();
        console.log('PIN auth response data:', pinData);
        
        if (pinData.success && pinData.sessionToken) {
            console.log('PIN auth successful! Testing admin-data endpoint...');
            
            // Test admin-data endpoint
            const adminUrl = `${CONFIG.ADMIN_ENDPOINT}?token=${encodeURIComponent(pinData.sessionToken)}`;
            console.log('Testing admin-data endpoint:', adminUrl);
            
            const adminResponse = await fetch(adminUrl, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('Admin data response status:', adminResponse.status);
            const adminData = await adminResponse.json();
            console.log('Admin data response:', adminData);
            
            return {
                pinAuth: { status: pinResponse.status, data: pinData },
                adminData: { status: adminResponse.status, data: adminData }
            };
        } else {
            console.error('PIN auth failed, cannot test admin-data endpoint');
            return { pinAuth: { status: pinResponse.status, data: pinData } };
        }
    } catch (error) {
        console.error('API test error:', error);
        return { error: error.message };
    }
};

// Test admin data endpoint with current token
window.testAdminData = async function() {
    console.log('=== TESTING ADMIN DATA WITH CURRENT TOKEN ===');
    console.log('Current token:', authToken ? 'present' : 'missing');
    
    if (!authToken) {
        console.error('No authentication token available');
        return;
    }
    
    try {
        const url = `${CONFIG.ADMIN_ENDPOINT}?token=${encodeURIComponent(authToken)}`;
        console.log('Testing URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('Response data:', data);
        
        return { status: response.status, data: data };
    } catch (error) {
        console.error('Test error:', error);
        return { error: error.message };
    }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .name-cell {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }
    
    .action-buttons {
        display: flex;
        gap: var(--spacing-xs);
    }
    
    .view-btn:hover {
        color: var(--electric-blue);
    }
    
    .delete-btn:hover {
        color: var(--electric-red);
    }
    
    .detail-section {
        margin-bottom: var(--spacing-lg);
    }
    
    .detail-section h4 {
        color: var(--electric-blue);
        margin-bottom: var(--spacing-sm);
        font-family: var(--font-primary);
    }
    
    .detail-section p {
        margin-bottom: var(--spacing-xs);
        line-height: 1.5;
    }
    
    .debug-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .debug-modal-overlay.active {
        opacity: 1;
    }
    
    .debug-modal-content {
        background: white;
        border-radius: 8px;
        max-width: 80%;
        max-height: 80%;
        overflow: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .debug-modal-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .debug-modal-title {
        margin: 0;
        color: var(--electric-blue);
    }
    
    .debug-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
    }
    
    .debug-modal-body {
        padding: 20px;
    }
`;
document.head.appendChild(style);
