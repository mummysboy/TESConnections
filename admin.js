// TESConnections - Admin Dashboard JavaScript with Cognito Authentication

// Cognito Configuration
const COGNITO_CONFIG = {
    // These will be populated from CloudFormation outputs
    userPoolId: 'us-west-1_NFh1iQlAb', // Updated with actual Cognito User Pool ID
    userPoolClientId: '7ht4bhg5016dbd337ukmv6947e', // Updated with new Client ID
    region: 'us-west-1'
};

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

// Cognito User Pool and Client
let userPool;
let userPoolClient;
let currentUser;

// Authentication state
let isAuthenticated = false;
let authToken = null;

// DOM Elements
const totalMeetingsEl = document.getElementById('totalMeetings');
const todayMeetingsEl = document.getElementById('todayMeetings');
const totalConnectionsEl = document.getElementById('totalConnections');
const loadingState = document.getElementById('loadingState');

// Meetings Section
const meetingsTableBody = document.getElementById('meetingsTableBody');
const meetingsCount = document.getElementById('meetingsCount');
const meetingsEmptyState = document.getElementById('meetingsEmptyState');
const refreshMeetings = document.getElementById('refreshMeetings');
const exportMeetings = document.getElementById('exportMeetings');

// Connections Section
const connectionsTableBody = document.getElementById('connectionsTableBody');
const connectionsCount = document.getElementById('connectionsCount');
const connectionsEmptyState = document.getElementById('connectionsEmptyState');
const refreshConnections = document.getElementById('refreshConnections');
const exportConnections = document.getElementById('exportConnections');

// Data storage
let allData = [];
let meetingsData = [];
let connectionsData = [];

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeCognito();
    checkAuthentication();
    setupEventListeners();
    setupModal();
});

// Initialize Cognito
function initializeCognito() {
    try {
        userPool = new AmazonCognitoIdentity.CognitoUserPool({
            UserPoolId: COGNITO_CONFIG.userPoolId,
            ClientId: COGNITO_CONFIG.userPoolClientId
        });
        
        console.log('Cognito initialized successfully');
    } catch (error) {
        console.error('Error initializing Cognito:', error);
        // Don't show error for Cognito initialization failure
        // PIN authentication will still work
    }
}

// Check if user is already authenticated
function checkAuthentication() {
    const cognitoUser = userPool.getCurrentUser();
    
    if (cognitoUser) {
        cognitoUser.getSession((err, session) => {
            if (err) {
                console.log('No valid session found:', err);
                showLoginScreen();
            } else {
                console.log('Valid session found');
                authToken = session.getIdToken().getJwtToken();
                isAuthenticated = true;
                showAdminDashboard();
                updateUserInfo(session.getIdToken().payload);
            }
        });
    } else {
        showLoginScreen();
    }
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
    isAuthenticated = false;
    authToken = null;
}

// Show admin dashboard
function showAdminDashboard() {
    console.log('Showing admin dashboard...');
    const loginScreen = document.getElementById('loginScreen');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginScreen) {
        loginScreen.style.display = 'none';
        console.log('Login screen hidden');
    } else {
        console.error('Login screen element not found!');
    }
    
    if (adminDashboard) {
        adminDashboard.style.display = 'block';
        console.log('Admin dashboard shown, computed style:', window.getComputedStyle(adminDashboard).display);
        console.log('Admin dashboard visibility:', window.getComputedStyle(adminDashboard).visibility);
        console.log('Admin dashboard opacity:', window.getComputedStyle(adminDashboard).opacity);
    } else {
        console.error('Admin dashboard element not found!');
    }
    
    console.log('Admin dashboard elements updated, loading data...');
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
    
    try {
        showPinLoading(true);
        
        // Call the PIN authentication endpoint
        const response = await fetch(CONFIG.PIN_AUTH_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pin: pinEntry })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Store the session token
            authToken = data.sessionToken;
            isAuthenticated = true;
            
            // Create user object
            const user = {
                email: 'admin@tesconnections.com',
                name: 'Admin User'
            };
            
            hidePinModal();
            showAdminDashboard();
            updateUserInfo(user);
            showSuccess('PIN authentication successful');
        } else {
            showPinError(data.message || 'Invalid PIN. Please try again.');
        }
    } catch (error) {
        console.error('PIN authentication error:', error);
        showPinError('Authentication failed. Please try again.');
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
    
    // Show error message briefly, then redirect
    showError(message);
    
    // Redirect to www.youneedjesus.com after a short delay
    setTimeout(() => {
        window.location.href = 'https://www.youneedjesus.com';
    }, 2000);
}

// Clean up PIN modal event listeners
function cleanupPinModal() {
    document.removeEventListener('keydown', handlePinKeydown);
}

// Handle Cognito login (fallback)
function handleCognitoLogin() {
    const loginUrl = `https://tes-connections-admin-prod-851725394837.auth.${COGNITO_CONFIG.region}.amazoncognito.com/login?client_id=${COGNITO_CONFIG.userPoolClientId}&response_type=token&scope=email+openid+profile&redirect_uri=${encodeURIComponent(window.location.href)}`;
    
    // Redirect to Cognito hosted UI
    window.location.href = loginUrl;
}

// Handle logout
function handleLogout() {
    const cognitoUser = userPool.getCurrentUser();
    
    if (cognitoUser) {
        cognitoUser.signOut();
    }
    
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Show login screen
    showLoginScreen();
}

// Handle authentication callback (when returning from Cognito)
function handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = urlParams.get('access_token');
    const idToken = urlParams.get('id_token');
    
    if (idToken) {
        // Store tokens
        localStorage.setItem('cognito_id_token', idToken);
        if (accessToken) {
            localStorage.setItem('cognito_access_token', accessToken);
        }
        
        // Decode and use the token
        const tokenPayload = JSON.parse(atob(idToken.split('.')[1]));
        authToken = idToken;
        isAuthenticated = true;
        
        showAdminDashboard();
        updateUserInfo(tokenPayload);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Authentication events
    const pinLoginBtn = document.getElementById('pinLoginBtn');
    const cognitoLoginBtn = document.getElementById('cognitoLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (pinLoginBtn) {
        pinLoginBtn.addEventListener('click', handlePinLogin);
    }
    
    if (cognitoLoginBtn) {
        cognitoLoginBtn.addEventListener('click', handleCognitoLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Check for authentication callback on page load
    if (window.location.hash.includes('access_token') || window.location.hash.includes('id_token')) {
        handleAuthCallback();
    }
    
    // Meetings section
    refreshMeetings.addEventListener('click', loadData);
    exportMeetings.addEventListener('click', () => exportData('meetings'));
    
    // Connections section
    refreshConnections.addEventListener('click', loadData);
    exportConnections.addEventListener('click', () => exportData('connections'));
    
    // Use event delegation for table row clicks
    setupTableClickDelegation();
}

// Load data from API
async function loadData() {
    console.log('Loading admin data...', { isAuthenticated, authToken: authToken ? 'present' : 'missing' });
    showLoading(true);
    
    try {
        const data = await fetchAdminData();
        console.log('Admin data loaded:', data);
        
        if (data.length === 0) {
            showError('No data found in database.');
            meetingsData = [];
            connectionsData = [];
        } else {
            allData = data;
            console.log('Processing data:', allData);
            
            // Separate meetings and connections
            meetingsData = allData.filter(item => item.type === 'meeting');
            connectionsData = allData.filter(item => item.type === 'connection');
            
            console.log('Meetings data:', meetingsData);
            console.log('Connections data:', connectionsData);
            
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
        
        updateStats();
        renderTables();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Fetch data from API
async function fetchAdminData() {
    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Add authorization header if authenticated
        if (isAuthenticated && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(CONFIG.ADMIN_ENDPOINT, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Raw API response:', data);
        
        // Handle different response formats
        if (Array.isArray(data)) {
            return data;
        } else if (data.submissions) {
            return data.submissions;
        } else if (data.data) {
            return data.data;
        } else {
            console.warn('Unexpected API response format:', data);
            return [];
        }
        
    } catch (error) {
        console.error('Error fetching admin data:', error);
        showError('Failed to load data from database. Please check your connection and try again.');
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
    
    totalMeetingsEl.textContent = totalMeetings;
    totalConnectionsEl.textContent = totalConnections;
    todayMeetingsEl.textContent = todayMeetings;
    
    // Update count badges
    meetingsCount.textContent = meetingsData.length;
    connectionsCount.textContent = connectionsData.length;
}

// Render both tables
function renderTables() {
    renderMeetingsTable();
    renderConnectionsTable();
}

// Render meetings table
function renderMeetingsTable() {
    console.log('Rendering meetings table with data:', meetingsData);
    
    if (meetingsData.length === 0) {
        meetingsTableBody.innerHTML = '';
        meetingsEmptyState.style.display = 'block';
        return;
    }
    
    meetingsEmptyState.style.display = 'none';
    meetingsTableBody.innerHTML = meetingsData.map(item => {
        // Validate and clean data
        const cleanItem = validateAndCleanMeetingData(item);
        
        console.log('Rendering meeting item:', cleanItem);
        console.log('Name:', cleanItem.name);
        console.log('Meeting Time:', cleanItem.meetingTime);
        console.log('Contact Details:', cleanItem.contactDetails);
        
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
    }).join('');
}

// Validate and clean meeting data
function validateAndCleanMeetingData(item) {
    console.log('Raw item data:', item);
    
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
    
    console.log('Cleaned item data:', cleaned);
    return cleaned;
}

// Render connections table
function renderConnectionsTable() {
    console.log('Rendering connections table with data:', connectionsData);
    
    if (connectionsData.length === 0) {
        connectionsTableBody.innerHTML = '';
        connectionsEmptyState.style.display = 'block';
        return;
    }
    
    connectionsEmptyState.style.display = 'none';
    connectionsTableBody.innerHTML = connectionsData.map(item => {
        // Validate and clean data
        const cleanItem = validateAndCleanConnectionData(item);
        
        console.log('Rendering connection item:', cleanItem);
        
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
    console.log('Getting contact details for item:', item);
    
    // The info field should contain the actual contact details (email, phone, username, etc.)
    if (item.info && item.info.trim()) {
        const info = item.info.trim();
        
        // Check if info contains a date/time pattern (which shouldn't be contact details)
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i;
        
        // If info field contains ONLY a date pattern, don't use it for contact details
        if (datePattern.test(info) && info.match(datePattern)[0] === info) {
            console.log('Info field contains only date pattern, not using for contact details');
            return 'Contact details not provided';
        }
        
        // If info field contains a date pattern, extract the non-date part
        if (datePattern.test(info)) {
            const nonDatePart = info.replace(datePattern, '').trim();
            if (nonDatePart) {
                console.log('Using non-date part of info field:', nonDatePart);
                return nonDatePart;
            }
        }
        
        // Use the info field as contact details
        console.log('Using info field for contact details:', info);
        return info;
    }
    
    // If no info field, check if comments might contain contact details
    if (item.comments && item.comments.trim()) {
        const comments = item.comments.trim();
        
        // Don't use comments if they contain date patterns
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i;
        if (!datePattern.test(comments)) {
            console.log('Using comments field as contact details:', comments);
            return comments;
        }
    }
    
    console.log('No contact details found');
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
            console.error('Error parsing timeSlot:', error, 'for timeSlot:', item.timeSlot);
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
    console.log('Getting meeting time for item:', item);
    
    // First priority: timeSlot field (this is the proper field for meeting times)
    if (item.timeSlot && item.timeSlot.trim() && item.timeSlot !== 'N/A' && item.timeSlot !== '') {
        console.log('Using timeSlot field:', item.timeSlot);
        return formatMeetingTime(item.timeSlot);
    }
    
    // Second priority: Check if info field contains a formatted date/time
    if (item.info && item.info.trim()) {
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i;
        const dateMatch = item.info.match(datePattern);
        if (dateMatch) {
            console.log('Found formatted date in info field:', dateMatch[0]);
            return dateMatch[0];
        }
    }
    
    // Third priority: Check if comments field contains a formatted date/time
    if (item.comments && item.comments.trim()) {
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s+(AM|PM)/i;
        const dateMatch = item.comments.match(datePattern);
        if (dateMatch) {
            console.log('Found formatted date in comments field:', dateMatch[0]);
            return dateMatch[0];
        }
    }
    
    // Fallback: Use timestamp if no meeting time is found
    if (item.timestamp) {
        console.log('Using timestamp as fallback:', item.timestamp);
        return formatDate(item.timestamp);
    }
    
    console.log('No meeting time found');
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
        console.error('Error formatting meeting time:', error, 'for timeSlot:', timeSlot);
        return timeSlot || 'Invalid time';
    }
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            console.error('Invalid timestamp:', timestamp);
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
        console.error('Error formatting date:', error, 'for timestamp:', timestamp);
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
    console.log('Setting up table click delegation');
    
    // Add click listener to document to catch clicks on dynamically added rows
    document.addEventListener('click', (e) => {
        console.log('Click detected on:', e.target);
        
        // Check if clicked element is a clickable row or inside one
        const clickableRow = e.target.closest('.clickable-row');
        if (clickableRow) {
            console.log('Clickable row found:', clickableRow);
            
            const id = clickableRow.getAttribute('data-id');
            const type = clickableRow.getAttribute('data-type');
            console.log('Row data - ID:', id, 'Type:', type);
            
            if (id && type) {
                showDetailedView(id, type);
            } else {
                console.log('Missing ID or type data');
            }
        }
    });
}

// Show detailed view popup
function showDetailedView(id, type) {
    console.log('showDetailedView called with:', id, type);
    const item = allData.find(item => item.id === id);
    console.log('Found item:', item);
    if (!item) {
        console.log('Item not found!');
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
        console.error('Error deleting item:', error);
        showError('Failed to delete submission. Please try again.');
    }
}

// Delete from API
async function deleteFromAPI(id) {
    const headers = {
        'Content-Type': 'application/json',
    };
    
    // Add authorization header if authenticated
    if (isAuthenticated && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(CONFIG.DELETE_ENDPOINT, {
        method: 'DELETE',
        headers: headers,
        body: JSON.stringify({ id: id })
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
    console.log('showLoading called with:', show);
    if (!loadingState) {
        console.error('Loading state element not found!');
        return;
    }
    loadingState.style.display = show ? 'block' : 'none';
    console.log('Loading state display:', loadingState.style.display);
    if (show) {
        meetingsEmptyState.style.display = 'none';
        connectionsEmptyState.style.display = 'none';
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
`;
document.head.appendChild(style);
