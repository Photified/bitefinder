// FILE: auth-manager.js
// VERSION 3: This fixes the "double header" bug.

/**
 * Creates the main navigation header based on login state.
 * This function will be called by all pages to ensure a consistent header.
 */
function createHeader(activePage = 'home', session) {
    
    // --- START OF FIX ---
    // Find and remove any existing header. This prevents the double-bar bug.
    const oldHeader = document.getElementById('appHeaderNavContainer');
    if (oldHeader) {
        oldHeader.remove();
    }
    // --- END OF FIX ---

    // Now we create the new one
    const headerContainer = document.createElement('div');
    headerContainer.className = 'w-full max-w-6xl mx-auto mb-4';
    headerContainer.id = 'appHeaderNavContainer'; // Give it an ID so we can find it next time
    
    const activeClass = 'bg-blue-600 text-white';
    const inactiveClass = 'bg-gray-700 hover:bg-gray-600 text-gray-300';

    let navLinks = `
        <a href="index.html" class="py-2 px-4 rounded-lg font-semibold text-sm ${activePage === 'home' ? activeClass : inactiveClass}">Home</a>
        <a href="social.html" class="py-2 px-4 rounded-lg font-semibold text-sm ${activePage === 'social' ? activeClass : inactiveClass}">Social Feed</a>
    `;

    // Auth state-dependent links
    let authLinks = '';

    if (session && session.user) {
        // User is LOGGED IN
        const username = session.user.user_metadata?.username || session.user.email;
        
        navLinks += `
            <a href="mytacklebox.html" class="py-2 px-4 rounded-lg font-semibold text-sm ${activePage === 'tacklebox' ? activeClass : inactiveClass}">My Tacklebox</a>
            <a href="logbook.html" class="py-2 px-4 rounded-lg font-semibold text-sm ${activePage === 'logbook' ? activeClass : inactiveClass}">My Logbook</a>
        `;
        
        authLinks = `
            <span class="text-sm text-gray-400 hidden sm:block">Welcome, ${username}!</span>
            <button id="logoutButton" class="${inactiveClass} py-2 px-4 rounded-lg font-semibold text-sm">Logout</button>
        `;
    } else {
        // User is LOGGED OUT
        navLinks += `
            <span class="py-2 px-4 rounded-lg font-semibold text-sm bg-gray-800 text-gray-500 cursor-not-allowed" title="Login to access">My Tacklebox</span>
            <span class="py-2 px-4 rounded-lg font-semibold text-sm bg-gray-800 text-gray-500 cursor-not-allowed" title="Login to access">My Logbook</span>
        `;

        authLinks = `
            <button id="openLoginModalBtn" class="${inactiveClass} py-2 px-4 rounded-lg font-semibold text-sm">Login / Sign Up</button>
        `;
    }

    headerContainer.innerHTML = `
        <nav class="bg-gray-800 rounded-lg p-3 shadow-lg flex flex-wrap justify-between items-center gap-4">
            <div class="flex items-center space-x-2 flex-wrap gap-2">
                ${navLinks}
            </div>
            <div class="flex items-center space-x-3">
                ${authLinks}
            </div>
        </nav>
    `;
    
    document.body.prepend(headerContainer);

    // Add event listeners for the new buttons
    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    const loginModalBtn = document.getElementById('openLoginModalBtn');
    if (loginModalBtn) {
        loginModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('authModal');
            if(modal) modal.classList.remove('hidden');
        });
    }
}

/**
 * Creates and injects the Authentication Modal into the page.
 */
function injectAuthModal() {
    const modalHTML = `
    <div id="authModal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 hidden z-50">
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-600 max-w-md w-full relative card-glow">
            <button id="closeAuthModal" class="absolute top-3 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
            
            <div id="loginView">
                <h3 class="text-xl font-semibold text-white mb-4">Welcome Back!</h3>
                <div id="loginError" class="text-red-400 text-sm mb-3 hidden"></div>
                <form id="loginForm" class="space-y-4">
                    <input type="email" id="loginEmail" placeholder="Email" class="w-full rounded-lg text-sm bg-gray-900 border-gray-600 text-white" required>
                    <input type="password" id="loginPassword" placeholder="Password" class="w-full rounded-lg text-sm bg-gray-900 border-gray-600 text-white" required>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg btn-glow">Login</button>
                </form>
                <p class="text-sm text-gray-400 mt-4 text-center">
                    New angler? <button id="showSignupBtn" class="text-blue-400 hover:underline">Create an account</button>
                </p>
            </div>

            <div id="signupView" class="hidden">
                <h3 class="text-xl font-semibold text-white mb-4">Create Your Account</h3>
                <div id="signupError" class="text-red-400 text-sm mb-3 hidden"></div>
                <form id="signupForm" class="space-y-4">
                     <input type="text" id="signupUsername" placeholder="Display Name (must be unique)" class="w-full rounded-lg text-sm bg-gray-900 border-gray-600 text-white" required>
                    <input type="email" id="signupEmail" placeholder="Email" class="w-full rounded-lg text-sm bg-gray-900 border-gray-600 text-white" required>
                    <input type="password" id="signupPassword" placeholder="Password (6+ characters)" class="w-full rounded-lg text-sm bg-gray-900 border-gray-600 text-white" required>
                    <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg btn-glow">Create Account</button>
                </form>
                <p class="text-sm text-gray-400 mt-4 text-center">
                    Already have an account? <button id="showLoginBtn" class="text-blue-400 hover:underline">Login here</button>
                </p>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Get elements
    const authModal = document.getElementById('authModal');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const loginView = document.getElementById('loginView');
    const signupView = document.getElementById('signupView');
    const showSignupBtn = document.getElementById('showSignupBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');

    // Add modal functionality
    closeAuthModal.addEventListener('click', () => authModal.classList.add('hidden'));
    showSignupBtn.addEventListener('click', () => {
        loginView.classList.add('hidden');
        signupView.classList.remove('hidden');
    });
    showLoginBtn.addEventListener('click', () => {
        signupView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        loginError.classList.add('hidden');

        try {
            const { error } = await supaClient.auth.signInWithPassword({
                email: email,
                password: pass,
            });
            if (error) throw error;
            window.location.reload(); 
        } catch (error) {
            console.error('Login error:', error.message);
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        }
    });

    // Handle Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const pass = document.getElementById('signupPassword').value;
        signupError.classList.add('hidden');

        if (username.length < 3) {
             signupError.textContent = "Username must be at least 3 characters.";
             signupError.classList.remove('hidden');
             return;
        }

        try {
            // Step 1: Create the user in the Auth service
            const { data, error: authError } = await supaClient.auth.signUp({
                email: email,
                password: pass,
                options: {
                    data: {
                        username: username 
                    }
                }
            });

            if (authError) throw authError;
            if (!data.user) throw new Error('Signup successful, but no user data returned.');

            console.log('User created in Auth:', data.user);
            
            // Step 2: Create the corresponding row in our public 'profiles' table
            const { error: profileError } = await supaClient
                .from('user_data')
                .insert({ 
                    id: data.user.id,
                    username: username,
                    fishing_log: [], // Set default empty values
                    tacklebag_state: [new Array(10).fill(null)]
                });

            if (profileError) {
                 console.error("CRITICAL ERROR: Could not create profile row. Deleting orphan auth user.");
                 // This next line might fail due to permissions, but it's best practice to try
                 await supaClient.auth.admin.deleteUser(data.user.id); 
                 throw profileError;
            }

            console.log('Profile created in database.');
            window.location.reload();

        } catch (error) {
            console.error('Signup error:', error.message);
            signupError.textContent = error.message;
            signupError.classList.remove('hidden');
        }
    });
}

// Handle Logout
async function handleLogout() {
    await supaClient.auth.signOut(); 
    window.location.href = 'index.html';
}

/**
 * Auth Guard
 */
async function enforceLogin(redirectPath = 'index.html') {
    const { data: { session } } = await supaClient.auth.getSession(); 
    if (!session) {
        console.log("No user session found, redirecting...");
        alert("You must be logged in to view this page.");
        window.location.href = redirectPath;
        return null;
    }
    return session;

}
