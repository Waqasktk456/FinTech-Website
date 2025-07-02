// Import company data and Firebase
import companies from '../company_data.js';
import { auth, db } from './firebaseConfig.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js";

// Global variables
let currentUser = null;

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    checkAuthState();
    
    // Navigation menu toggle for mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Populate companies section
    populateCompanies();
    
    // Populate company dropdowns
    populateDropdowns();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup auth event listeners
    setupAuthEventListeners();
});

// Check authentication state
function checkAuthState() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateNavigation();
        if (user) {
            console.log('User logged in:', user.email);
        } else {
            console.log('User logged out');
        }
    });
}

// Update navigation based on auth state
function updateNavigation() {
    const navMenu = document.querySelector('.nav-menu');
    
    // Remove existing auth links
    const existingAuthLinks = navMenu.querySelectorAll('.auth-link');
    existingAuthLinks.forEach(link => link.remove());
    
    if (currentUser) {
        // Add My Investments and Logout links
        const myInvestmentsLi = document.createElement('li');
        myInvestmentsLi.innerHTML = '<a href="#my-investments" class="auth-link">My Investments</a>';
        
        const logoutLi = document.createElement('li');
        logoutLi.innerHTML = '<a href="#" class="auth-link" id="logout-btn">Logout</a>';
        
        navMenu.appendChild(myInvestmentsLi);
        navMenu.appendChild(logoutLi);
        
        // Add logout functionality
        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.href = '#home';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
        
        // Add My Investments navigation
        myInvestmentsLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            showMyInvestments();
        });
        
    } else {
        // Add Login link
        const loginLi = document.createElement('li');
        loginLi.innerHTML = '<a href="#" class="auth-link" id="login-nav-btn">Login/Signup</a>';
        navMenu.appendChild(loginLi);
        
        // Add login navigation
        document.getElementById('login-nav-btn').addEventListener('click', (e) => {
            e.preventDefault();
            showAuthModal();
        });
    }
}

// Show authentication modal
function showAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.style.display = 'block';
    }
}

// Show My Investments page
function showMyInvestments() {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    // Hide all sections
    const sections = document.querySelectorAll('section');
    sections.forEach(section => section.style.display = 'none');
    
    // Show my investments section
    const myInvestmentsSection = document.getElementById('my-investments');
    if (myInvestmentsSection) {
        myInvestmentsSection.style.display = 'block';
        loadUserInvestments();
    }
}

// Load user investments
async function loadUserInvestments() {
    if (!currentUser) return;
    
    const investmentsContainer = document.getElementById('investments-container');
    if (!investmentsContainer) return;
    
    try {
        const q = query(
            collection(db, 'investments'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        investmentsContainer.innerHTML = '';
        
        if (querySnapshot.empty) {
            investmentsContainer.innerHTML = '<p class="no-investments">No investments found. Start investing to see your portfolio here!</p>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const investment = doc.data();
            const investmentCard = createInvestmentCard(investment);
            investmentsContainer.appendChild(investmentCard);
        });
        
    } catch (error) {
        console.error('Error loading investments:', error);
        investmentsContainer.innerHTML = '<p class="error">Error loading investments. Please try again.</p>';
    }
}

// Create investment card
function createInvestmentCard(investment) {
    const card = document.createElement('div');
    card.className = 'investment-card';
    
    const date = investment.timestamp && investment.timestamp.toDate ? 
                 new Date(investment.timestamp.toDate()).toLocaleDateString() : 
                 new Date().toLocaleDateString();
    
    card.innerHTML = `
        <div class="investment-header">
            <h3>${investment.companyName}</h3>
            <span class="investment-date">${date}</span>
        </div>
        <div class="investment-details">
            <div class="detail-row">
                <span>Investment Amount:</span>
                <span>PKR ${formatNumber(investment.amount)}</span>
            </div>
            <div class="detail-row">
                <span>Duration:</span>
                <span>${investment.duration} years</span>
            </div>
            <div class="detail-row">
                <span>Expected Total Profit:</span>
                <span>PKR ${formatNumber(investment.totalProfit)}</span>
            </div>
            <div class="detail-row">
                <span>Payback Period:</span>
                <span>${investment.paybackPeriod} years</span>
            </div>
            <div class="detail-row">
                <span>NPV:</span>
                <span>PKR ${formatNumber(investment.npv)}</span>
            </div>
            <div class="detail-row">
                <span>IRR:</span>
                <span>${(investment.irr * 100).toFixed(2)}%</span>
            </div>
        </div>
    `;
    
    return card;
}

// Setup authentication event listeners
function setupAuthEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Auth modal close
    const closeAuthModal = document.querySelector('.close-auth-modal');
    if (closeAuthModal) {
        closeAuthModal.addEventListener('click', function() {
            document.getElementById('auth-modal').style.display = 'none';
        });
    }
    
    // Toggle between login and signup
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('signup-container').style.display = 'block';
        });
    }
    
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signup-container').style.display = 'none';
            document.getElementById('login-container').style.display = 'block';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const authModal = document.getElementById('auth-modal');
        if (event.target === authModal) {
            authModal.style.display = 'none';
        }
    });
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById('auth-modal').style.display = 'none';
        // Show success message
        showMessage('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showMessage(error.message, 'error');
    }
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        document.getElementById('auth-modal').style.display = 'none';
        showMessage('Account created successfully!', 'success');
    } catch (error) {
        console.error('Signup error:', error);
        showMessage(error.message, 'error');
    }
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Save investment to Firebase
async function saveInvestment(investmentData) {
    if (!currentUser) {
        showAuthModal();
        return false;
    }
    
    try {
        const investment = {
            ...investmentData,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            timestamp: serverTimestamp()
        };
        
        await addDoc(collection(db, 'investments'), investment);
        showMessage('Investment saved successfully!', 'success');
        return true;
        
    } catch (error) {
        console.error('Error saving investment:', error);
        showMessage('Error saving investment. Please try again.', 'error');
        return false;
    }
}

// Populate companies section with company cards
function populateCompanies() {
    const companiesContainer = document.getElementById('companies-container');
    
    if (!companiesContainer) return;
    
    companies.forEach(company => {
        const card = createCompanyCard(company);
        companiesContainer.appendChild(card);
    });
}

// Create company card element
function createCompanyCard(company) {
    const card = document.createElement('div');
    card.className = 'company-card';
    
    // Determine risk class based on risk level
    let riskClass = '';
    switch(company.riskLevel.toLowerCase()) {
        case 'low':
            riskClass = 'risk-low';
            break;
        case 'medium':
            riskClass = 'risk-medium';
            break;
        case 'high':
            riskClass = 'risk-high';
            break;
        default:
            riskClass = 'risk-medium';
    }
    
    card.innerHTML = `
        <div class="company-logo">
            <img src="${company.logo}" alt="${company.name} Logo">
        </div>
        <div class="company-info">
            <h3>${company.name}</h3>
            <p><strong>Sector:</strong> ${company.sector}</p>
            <p><strong>Annual Profit:</strong> <span class="profit">${company.annualProfit}%</span></p>
            <p><strong>Annual Cash Flow:</strong> PKR ${formatNumber(company.annualCashFlow)}</p>
            <p><strong>Risk Level:</strong> <span class="risk ${riskClass}">${company.riskLevel}</span></p>
            <button class="btn btn-primary invest-btn" data-company="${company.name}">Invest</button>
        </div>
    `;
    
    return card;
}

// Populate company dropdowns in calculator sections
function populateDropdowns() {
    const calcCompanySelect = document.getElementById('calc-company');
    const riskCompanySelect = document.getElementById('risk-company');
    
    if (calcCompanySelect) {
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.name;
            option.textContent = company.name;
            calcCompanySelect.appendChild(option);
        });
    }
    
    if (riskCompanySelect) {
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.name;
            option.textContent = company.name;
            riskCompanySelect.appendChild(option);
        });
    }
}

// Setup event listeners for interactive elements
function setupEventListeners() {
    // Profit Calculator
    const calculateProfitBtn = document.getElementById('calculate-profit');
    if (calculateProfitBtn) {
        calculateProfitBtn.addEventListener('click', calculateProfit);
    }
    
    // Risk Analyzer
    const analyzeRiskBtn = document.getElementById('analyze-risk');
    if (analyzeRiskBtn) {
        analyzeRiskBtn.addEventListener('click', analyzeRisk);
    }
    
    // Investment Modal
    const investButtons = document.querySelectorAll('.invest-btn');
    const modal = document.getElementById('investment-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalCalculateBtn = document.getElementById('modal-calculate');
    
    investButtons.forEach(button => {
        button.addEventListener('click', function() {
            const companyName = this.getAttribute('data-company');
            document.getElementById('modal-company-name').textContent = companyName;
            modal.style.display = 'block';
            
            // Reset form and results
            document.getElementById('modal-amount').value = '';
            document.getElementById('modal-duration').value = '';
            document.getElementById('modal-total-profit').textContent = '-';
            document.getElementById('modal-payback').textContent = '-';
            document.getElementById('modal-npv').textContent = '-';
            document.getElementById('modal-pi').textContent = '-';
            document.getElementById('modal-irr').textContent = '-';
            
            // Hide invest button until calculation is done
            const investBtn = document.getElementById('modal-invest');
            if (investBtn) {
                investBtn.style.display = 'none';
            }
        });
    });
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    if (modalCalculateBtn) {
        modalCalculateBtn.addEventListener('click', calculateModalInvestment);
    }
    
    // Add event listener for the invest button
    const modalInvestBtn = document.getElementById('modal-invest');
    if (modalInvestBtn) {
        modalInvestBtn.addEventListener('click', handleModalInvestment);
    }
    
    // Navigation for sections
    const navLinks = document.querySelectorAll('.nav-menu a:not(.auth-link)');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = e.target.getAttribute('href');
            if (href && href.startsWith('#')) {
                // Show all sections first
                const sections = document.querySelectorAll('section');
                sections.forEach(section => section.style.display = 'block');
                
                // Hide my-investments section if not logged in
                if (!currentUser) {
                    const myInvestmentsSection = document.getElementById('my-investments');
                    if (myInvestmentsSection) {
                        myInvestmentsSection.style.display = 'none';
                    }
                }
            }
        });
    });
}

// Handle modal investment
async function handleModalInvestment() {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    const companyName = document.getElementById('modal-company-name').textContent;
    const amount = parseFloat(document.getElementById('modal-amount').value);
    const duration = parseInt(document.getElementById('modal-duration').value);
    
    if (!companyName || isNaN(amount) || isNaN(duration) || amount <= 0 || duration <= 0) {
        showMessage('Please enter valid investment details.', 'error');
        return;
    }
    
    const company = companies.find(c => c.name === companyName);
    if (!company) {
        showMessage('Company not found.', 'error');
        return;
    }
    
    const results = calculateInvestmentMetrics(company, amount, duration);
    
    const investmentData = {
        companyName,
        amount,
        duration,
        totalProfit: results.totalProfit,
        paybackPeriod: parseFloat(results.paybackPeriod.toFixed(2)),
        npv: parseFloat(results.npv.toFixed(2)),
        pi: parseFloat(results.pi.toFixed(2)),
        irr: results.irr
    };
    
    const success = await saveInvestment(investmentData);
    if (success) {
        document.getElementById('investment-modal').style.display = 'none';
        
        // If we're on the My Investments page, refresh it
        const myInvestmentsSection = document.getElementById('my-investments');
        if (myInvestmentsSection && myInvestmentsSection.style.display !== 'none') {
            loadUserInvestments();
        }
    }
}

// Calculate profit based on selected company and inputs
function calculateProfit() {
    const companyName = document.getElementById('calc-company').value;
    const amount = parseFloat(document.getElementById('calc-amount').value);
    const duration = parseInt(document.getElementById('calc-duration').value);
    
    if (!companyName || isNaN(amount) || isNaN(duration) || amount <= 0 || duration <= 0) {
        alert('Please enter valid investment details.');
        return;
    }
    
    const company = companies.find(c => c.name === companyName);
    if (!company) {
        alert('Company not found.');
        return;
    }
    
    const results = calculateInvestmentMetrics(company, amount, duration);
    
    // Get result elements
    const resultTotalProfit = document.getElementById('result-total-profit');
    const resultPayback = document.getElementById('result-payback');
    const resultNpv = document.getElementById('result-npv');
    const resultPi = document.getElementById('result-pi');
    const resultIrr = document.getElementById('result-irr');
    
    // Display results
    if (resultTotalProfit) resultTotalProfit.textContent = `PKR ${formatNumber(results.totalProfit.toFixed(2))}`;
    if (resultPayback) resultPayback.textContent = `${results.paybackPeriod.toFixed(2)} years`;
    if (resultNpv) resultNpv.textContent = `PKR ${formatNumber(results.npv.toFixed(2))}`;
    if (resultPi) resultPi.textContent = results.pi.toFixed(2);
    if (resultIrr) resultIrr.textContent = `${(results.irr * 100).toFixed(2)}%`;
}

// Calculate investment metrics for modal
function calculateModalInvestment() {
    const companyName = document.getElementById('modal-company-name').textContent;
    const amount = parseFloat(document.getElementById('modal-amount').value);
    const duration = parseInt(document.getElementById('modal-duration').value);
    
    if (!companyName || isNaN(amount) || isNaN(duration) || amount <= 0 || duration <= 0) {
        alert('Please enter valid investment details.');
        return;
    }
    
    const company = companies.find(c => c.name === companyName);
    if (!company) {
        alert('Company not found.');
        return;
    }
    
    const results = calculateInvestmentMetrics(company, amount, duration);
    
    // Display modal results
    const modalTotalProfit = document.getElementById('modal-total-profit');
    const modalPayback = document.getElementById('modal-payback');
    const modalNpv = document.getElementById('modal-npv');
    const modalPi = document.getElementById('modal-pi');
    const modalIrr = document.getElementById('modal-irr');
    
    if (modalTotalProfit) modalTotalProfit.textContent = `PKR ${formatNumber(results.totalProfit.toFixed(2))}`;
    if (modalPayback) modalPayback.textContent = `${results.paybackPeriod.toFixed(2)} years`;
    if (modalNpv) modalNpv.textContent = `PKR ${formatNumber(results.npv.toFixed(2))}`;
    if (modalPi) modalPi.textContent = results.pi.toFixed(2);
    if (modalIrr) modalIrr.textContent = `${(results.irr * 100).toFixed(2)}%`;
    
    // Show invest button
    const investBtn = document.getElementById('modal-invest');
    if (investBtn) {
        investBtn.style.display = 'block';
    }
}

// Analyze risk based on selected company and inputs
function analyzeRisk() {
    const companyName = document.getElementById('risk-company').value;
    const amount = parseFloat(document.getElementById('risk-amount').value);
    const duration = parseInt(document.getElementById('risk-duration').value);
    
    if (!companyName || isNaN(amount) || isNaN(duration) || amount <= 0 || duration <= 0) {
        alert('Please enter valid investment details.');
        return;
    }
    
    const company = companies.find(c => c.name === companyName);
    if (!company) {
        alert('Company not found.');
        return;
    }
    
    // Calculate risk percentage based on company risk level and duration
    let riskPercentage = 0;
    switch(company.riskLevel.toLowerCase()) {
        case 'low':
            riskPercentage = 25 + (duration > 10 ? 5 : 0);
            break;
        case 'medium':
            riskPercentage = 50 + (duration > 5 ? 10 : 0);
            break;
        case 'high':
            riskPercentage = 75 + (duration > 3 ? 15 : 0);
            break;
        default:
            riskPercentage = 50;
    }
    
    // Ensure risk percentage doesn't exceed 100%
    riskPercentage = Math.min(riskPercentage, 100);
    
    // Adjust risk indicator position
    const riskIndicator = document.getElementById('risk-indicator');
    if (riskIndicator) {
        riskIndicator.style.width = `${riskPercentage}%`;
    }
    
    // Update risk statement
    const riskStatement = document.getElementById('risk-statement');
    let riskLevel = '';
    
    if (riskPercentage < 40) {
        riskLevel = 'Low';
    } else if (riskPercentage < 70) {
        riskLevel = 'Medium';
    } else {
        riskLevel = 'High';
    }
    
    if (riskStatement) {
        riskStatement.textContent = `This investment is ${riskLevel} Risk based on historical volatility and risk index of ${company.name}.`;
    }
}

// Calculate investment metrics based on company data and inputs
function calculateInvestmentMetrics(company, amount, duration) {
    // Calculate annual return based on annual profit percentage
    const annualReturn = amount * (company.annualProfit / 100);
    
    // Total profit over the duration
    const totalProfit = annualReturn * duration;
    
    // Payback Period = Initial Investment / Annual Return
    const paybackPeriod = amount / annualReturn;
    
    // Net Present Value (NPV) calculation
    // Using a discount rate (assuming 10% if not provided)
    const discountRate = 0.10;
    let npv = -amount; // Initial investment (negative cash flow)
    
    // Add present value of future cash flows
    for (let year = 1; year <= duration; year++) {
        npv += annualReturn / Math.pow(1 + discountRate, year);
    }
    
    // Profitability Index = (Present Value of Future Cash Flows) / Initial Investment
    const presentValueOfCashFlows = npv + amount;
    const pi = presentValueOfCashFlows / amount;
    
    // Internal Rate of Return (IRR) - using company's IRR if available, otherwise estimate
    let irr;
    if (company.irr) {
        irr = company.irr;
    } else {
        // Simple IRR approximation: annual profit percentage
        irr = company.annualProfit / 100;
    }
    
    return {
        paybackPeriod,
        npv,
        pi,
        irr,
        totalProfit
    };
}

// Format number with commas for thousands
function formatNumber(number) {
    return new Intl.NumberFormat('en-PK').format(number);
}
