// ===== LOGIN SYSTEM =====

// User credentials (in production, validate on backend)
const validUsers = {
    'rindo': '5115',
};

// Current logged in user
let currentLoggedInUser = null;

// Wrapper for showNotification that works before sparepart.js loads
function showNotificationSafe(message, type = 'info') {
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        // Fallback: create simple notification
        const container = document.getElementById('notificationContainer');
        if (container) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            container.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeLoginSystem();
});

function initializeLoginSystem() {
    // Check if user is already logged in (from session storage)
    const savedUser = sessionStorage.getItem('loggedInUser');
    
    if (savedUser) {
        // User is still logged in (same session)
        loginUser(savedUser);
    } else {
        // Show login screen
        showLoginScreen();
    }

    // Setup login form event listener
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (loginScreen) loginScreen.classList.add('active');
    if (mainApp) mainApp.style.display = 'none';
    
    // Focus on username input
    setTimeout(() => {
        const usernameInput = document.getElementById('loginUsername');
        if (usernameInput) usernameInput.focus();
    }, 100);
}

function showMainApp() {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (loginScreen) loginScreen.classList.remove('active');
    if (mainApp) mainApp.style.display = 'block';
}

function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const errorDiv = document.getElementById('loginError');

    // Clear previous error
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }

    // Validate credentials
    if (!username) {
        showLoginError('Username tidak boleh kosong', errorDiv);
        return;
    }

    if (!password) {
        showLoginError('Password tidak boleh kosong', errorDiv);
        return;
    }

    // Check credentials
    if (validUsers[username] && validUsers[username] === password) {
        console.log(`✅ Login successful for user: ${username}`);
        
        // Save user to session
        sessionStorage.setItem('loggedInUser', username);
        
        // Save to localStorage if "remember me" is checked
        if (rememberMe) {
            localStorage.setItem('lastLoginUser', username);
            console.log(`🔖 User "${username}" saved for next login`);
        }

        // Login the user
        loginUser(username);
    } else {
        console.log(`❌ Login failed: Invalid credentials for user "${username}"`);
        showLoginError('❌ Username atau password salah. Gunakan kredensial di bawah.', errorDiv);
        
        // Clear password field
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginPassword').focus();
    }
}

function loginUser(username) {
    currentLoggedInUser = username;
    
    // Save login timestamp
    const loginTime = new Date();
    sessionStorage.setItem('loginTime', loginTime.toLocaleString('id-ID'));
    
    console.log(`🔓 User logged in: ${username}`);
    
    // Update UI
    const currentUserSpan = document.getElementById('currentUser');
    if (currentUserSpan) {
        currentUserSpan.textContent = username;
    }

    // Update hamburger menu username
    updateHamburgerMenuUser();

    // Show main app
    showMainApp();

    // Clear login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();

    // Show welcome notification
    setTimeout(() => {
        showNotificationSafe(`👋 Selamat datang, ${username}!`, 'success');
    }, 300);
}

function handleLogout() {
    // Confirm logout
    if (!confirm('Apakah Anda yakin ingin keluar?')) {
        return;
    }

    console.log(`🚪 User logged out: ${currentLoggedInUser}`);

    // Clear session
    sessionStorage.removeItem('loggedInUser');
    currentLoggedInUser = null;

    // Clear login form
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('rememberMe').checked = false;

    // Show login screen
    showLoginScreen();

    // Show logout notification
    showNotificationSafe('👋 Anda telah keluar dari sistem', 'info');

    // Clear barcode and QR scanner states (if any)
    if (typeof stopScanning === 'function') {
        try {
            stopScanning();
        } catch (e) {
            console.log('QR Scanner not active');
        }
    }

    if (typeof stopBarcodeScanning === 'function') {
        try {
            stopBarcodeScanning();
        } catch (e) {
            console.log('Barcode Scanner not active');
        }
    }
}

function showLoginError(message, errorDiv) {
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Shake animation by adding and removing class
        errorDiv.style.animation = 'none';
        setTimeout(() => {
            errorDiv.style.animation = 'shake 0.5s ease';
        }, 10);
    }
}

// Auto-fill username from last login if available
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const lastUser = localStorage.getItem('lastLoginUser');
        if (lastUser) {
            const usernameInput = document.getElementById('loginUsername');
            if (usernameInput) {
                usernameInput.value = lastUser;
                console.log(`🔖 Auto-filled username from last login: ${lastUser}`);
            }
        }
    }, 100);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+Enter to submit login form on login screen
    if (e.ctrlKey && e.key === 'Enter') {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen && loginScreen.classList.contains('active')) {
            const loginForm = document.getElementById('loginForm');
            if (loginForm) loginForm.submit();
        }
    }
});

// Session timeout (optional - set to 30 minutes)
let sessionTimer = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function resetSessionTimer() {
    // Clear existing timer
    if (sessionTimer) {
        clearTimeout(sessionTimer);
    }

    // Set new timer only if user is logged in
    if (currentLoggedInUser) {
        sessionTimer = setTimeout(() => {
            console.log('⏱️ Session timeout');
            showNotificationSafe('⏱️ Sesi Anda telah berakhir. Silakan login kembali.', 'warning');
            handleLogout();
        }, SESSION_TIMEOUT);
    }
}

// Reset timer on user activity
document.addEventListener('click', resetSessionTimer);
document.addEventListener('keydown', resetSessionTimer);
document.addEventListener('mousemove', resetSessionTimer);

// ===== HAMBURGER MENU FUNCTION =====
// ===== HAMBURGER & MOBILE SIDEBAR HANDLING =====
// On desktop the button opens the account dropdown.
// On mobile it opens the sidebar as an off-canvas drawer.
function toggleHamburgerMenu() {
    const dropdown = document.getElementById('hamburgerDropdown');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // toggle mobile sidebar
        document.body.classList.toggle('sidebar-open');
        const backdrop = document.getElementById('mobileSidebarBackdrop');
        if (backdrop) backdrop.style.display = document.body.classList.contains('sidebar-open') ? 'block' : 'none';
    } else {
        if (dropdown) dropdown.classList.toggle('active');
    }
}

// Close mobile sidebar (called from backdrop or programmatically)
function closeMobileSidebar() {
    document.body.classList.remove('sidebar-open');
    const backdrop = document.getElementById('mobileSidebarBackdrop');
    if (backdrop) backdrop.style.display = 'none';
}

// Update dropdown username when user logs in
function updateHamburgerMenuUser() {
    const dropdownUser = document.getElementById('dropdownUser');
    if (dropdownUser && currentLoggedInUser) {
        dropdownUser.textContent = currentLoggedInUser.charAt(0).toUpperCase() + currentLoggedInUser.slice(1);
    }
    
    // Update last login time display
    const lastLoginTimeEl = document.getElementById('lastLoginTime');
    if (lastLoginTimeEl) {
        const loginTime = sessionStorage.getItem('loginTime');
        lastLoginTimeEl.textContent = loginTime || 'Just now';
    }
}

// Close hamburger menu or mobile sidebar when clicking outside
document.addEventListener('click', (e) => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const hamburgerDropdown = document.getElementById('hamburgerDropdown');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('mobileSidebarBackdrop');
    
    if (hamburgerBtn && hamburgerDropdown && !hamburgerBtn.contains(e.target) && !hamburgerDropdown.contains(e.target)) {
        hamburgerDropdown.classList.remove('active');
    }

    // if mobile and clicked outside sidebar, close it
    if (window.innerWidth <= 768 && sidebar && !sidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) {
        closeMobileSidebar();
    }
    // if clicked the backdrop element itself, ensure sidebar closed
    if (backdrop && e.target === backdrop) closeMobileSidebar();
});

// Log system status
console.log('✅ Login system initialized');
console.log('Demo credentials:');
console.log('  Username: rindo, Password: 5115');



