// Deployment Web App URL (not Script ID!)
const DEPLOYMENT_URL = "https://script.google.com/macros/s/AKfycbyooi8owqIXu0205Ikg21m1_ETWwYMUtPow0V1asNXr0aXK_2_s3aBs6vVL-j9Ekf5M/exec";

// Store all data for searching
let allUnitsData = {};

/**
 * Helper to fetch JSON from Apps Script Web App
 * @param {string} sheetName - The sheet name to query
 */
async function getJSON(sheetName = "") {
    console.log(`🔄 Fetching data from sheet: "${sheetName}"`);
    try {
        const url = `${DEPLOYMENT_URL}?sheet=${encodeURIComponent(sheetName)}`;
        // console.log(`📡 Request URL: ${url}`);
        
        const res = await fetch(url, {
            method: "GET",
            mode: "cors"
        });

        console.log(`📥 Response status: ${res.status} ${res.statusText}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const jsonData = await res.json();
        console.log(`✅ Successfully fetched ${jsonData.length} rows from "${sheetName}"`);
        console.log(`📊 Sample data from "${sheetName}":`, jsonData.slice(0, 2)); // Log first 2 rows as sample
        
        return jsonData;
    } catch (err) {
        console.error(`❌ Fetch error for sheet "${sheetName}":`, err);
        return null;
    }
}

// Format Date Utility
const formatDate = (isoString) => {
    // console.log(`📅 Formatting date: "${isoString}"`);
    if (!isoString) {
        console.log(`⚠️ No date provided, returning "N/A"`);
        return "N/A";
    }
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        console.log(`❌ Invalid date format: "${isoString}"`);
        return "Invalid Date";
    }
    const formatted = date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
    // console.log(`✅ Formatted date result: "${formatted}"`);
    return formatted;
};

// Session Protection
function checkAuthentication() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    console.log(`🔐 Checking authentication - isLoggedIn: ${isLoggedIn}`);
    if (isLoggedIn !== 'true') {
        console.log(`❌ User not authenticated, redirecting to login`);
        window.location.href = 'login.html';
        return false;
    }
    console.log(`✅ User authenticated successfully`);
    return true;
}

function logout() {
    console.log(`👋 User logging out`);
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    window.location.href = 'login.html';
}

// Function to count buildings from data
function countBuildings(data) {
    console.log(`🏢 Counting buildings from ${data.length} units`);
    const buildingCounts = {};
    
    data.forEach((row, index) => {
        if (row["Unit"]) {
            // Assuming column AP contains the building code
            const building = row["AP"] || row["Building"] || "Unknown";
            buildingCounts[building] = (buildingCounts[building] || 0) + 1;
            if (index < 5) { // Log first 5 for debugging
                console.log(`🏢 Unit ${index}: "${row["Unit"]}" -> Building: "${building}"`);
            }
        }
    });
    
    console.log(`📊 Building counts result:`, buildingCounts);
    return buildingCounts;
}

// Function to create building counts HTML
function createBuildingCountsHTML(buildingCounts) {
    console.log(`🏗️ Creating building counts HTML from:`, buildingCounts);
    if (!buildingCounts || Object.keys(buildingCounts).length === 0) {
        // console.log(`⚠️ No building counts available`);
        return '<div class="building-count">No buildings</div>';
    }
    
    const html = Object.entries(buildingCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([building, count]) => 
            `<div class="building-count">${building} - ${count}</div>`
        ).join('');
    
    // console.log(`✅ Generated building counts HTML (${html.length} characters)`);
    return html;
}

// Load and store all data for searching
async function loadAllData() {
    // console.log(`🚀 Loading all data for searching...`);
    const sheets = ['Terminated', 'Contract Signed', 'Verified', 'Approved', 'Actives'];
    
    for (const sheet of sheets) {
        console.log(`📋 Processing sheet: "${sheet}"`);
        const data = await getJSON(sheet);
        if (data) {
            const unitsWithData = data.filter(row => row["Unit"]);
            allUnitsData[sheet] = unitsWithData;
            console.log(`✅ Stored ${unitsWithData.length} units from "${sheet}" (filtered from ${data.length} total rows)`);
        } else {
            console.log(`❌ Failed to load data from "${sheet}"`);
        }
    }
    console.log(`📊 All data loaded. Total sheets: ${Object.keys(allUnitsData).length}`);
    console.log(`📈 Units per sheet:`, Object.fromEntries(
        Object.entries(allUnitsData).map(([sheet, data]) => [sheet, data.length])
    ));
}

// Date utilities for move-out alerts
function getDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // month is 0-based
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  
//   console.log(`📅 getDateString (LOCAL): ${date} -> "${dateStr}"`);
  return dateStr;
}

function getTodayString() {
  const today = new Date();
  const todayStr = getDateString(today);
//   console.log(`📅 Today's date string (LOCAL): "${todayStr}"`);
  return todayStr;
}


function getYesterdayString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getDateString(yesterday);
    // console.log(`📅 Yesterday's date string: "${yesterdayStr}"`);
    return yesterdayStr;
}

function getTomorrowString() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getDateString(tomorrow);
    // console.log(`📅 Tokmorrow's date string: "${tomorrowStr}"`);
    return tomorrowStr;
}

function normalizeDateString(dateStr) {
    // console.log(`🔄 Normalizing date string: "${dateStr}"`);
    if (!dateStr) {
        console.log(`⚠️ Empty date string provided`);
        return null;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        console.log(`❌ Invalid date: "${dateStr}"`);
        return null;
    }
    const normalized = getDateString(date);
    // console.log(`✅ Normalized date: "${dateStr}" -> "${normalized}"`);
    return normalized;
}

// Filter units by move-out date
function filterUnitsByMoveOut(period) {
    console.log(`🔍 Filtering units by move-out period: "${period}"`);
    const targetDate = period === 'today' ? getTodayString() : 
                      period === 'yesterday' ? getYesterdayString() : 
                      getTomorrowString();
    
    console.log(`🎯 Target date for filtering: "${targetDate}"`);
    const filteredUnits = [];
    
    Object.keys(allUnitsData).forEach(sheetName => {
        console.log(`🔍 Searching in sheet "${sheetName}" (${allUnitsData[sheetName].length} units)`);
        let sheetMatches = 0;
        
        allUnitsData[sheetName].forEach((unit, index) => {
            const moveOutDate = normalizeDateString(unit["Move-Out"]);
            if (moveOutDate === targetDate) {
                filteredUnits.push({
                    ...unit,
                    sheetName: sheetName
                });
                sheetMatches++;
                if (sheetMatches <= 3) { // Log first 3 matches per sheet
                    console.log(`✅ Match found in "${sheetName}": Unit "${unit["Unit"]}" moving out on "${moveOutDate}"`);
                }
            }
        });
        
        console.log(`📊 Found ${sheetMatches} matches in "${sheetName}"`);
    });
    
    // console.log(`🎯 Total filtered units for "${period}": ${filteredUnits.length}`);
    return filteredUnits;
}

// Display move-out units
function displayMoveOutUnits(units, containerId) {
    // console.log(`🖼️ Displaying ${units.length} move-out units in container "${containerId}"`);
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error(`❌ Container with ID "${containerId}" not found`);
        return;
    }
    
    if (units.length === 0) {
        // console.log(`ℹ️ No units to display, showing empty state`);
        container.innerHTML = `
            <div class="no-moveout-units">
                <i class="fas fa-check-circle no-moveout-icon"></i>
                <div class="no-moveout-text">No move-outs for this period</div>
            </div>
        `;
        return;
    }
    
    // console.log(`🏗️ Building HTML for ${units.length} units...`);
    let unitsHTML = '';
    units.forEach((unit, index) => {
        const statusClass = unit.sheetName.toLowerCase().replace(' ', '-');
        const statusDisplay = unit.sheetName === 'Actives' ? 'Active' : unit.sheetName;
        
        if (index < 3) { // Log first 3 units being processed
            console.log(`🔨 Processing unit ${index}: "${unit["Unit"]}" (${statusDisplay})`);
        }
        
        unitsHTML += `
            <div class="moveout-unit-card">
                <div class="moveout-unit-header">
                    <div class="moveout-unit-info">
                        <h3 class="moveout-unit-name">${unit["Unit"] || 'N/A'}</h3>
                        <span class="moveout-unit-badge status-${statusClass}">${statusDisplay}</span>
                    </div>
                    <div class="moveout-date-info">
                        <span class="moveout-date">${formatDate(unit["Move-Out"])}</span>
                    </div>
                </div>
                <div class="moveout-unit-details">
                    <div class="moveout-detail-item">
                        <span class="moveout-detail-label">Lease ID</span>
                        <span class="moveout-detail-value">${unit["Lease ID"] || 'N/A'}</span>
                    </div>
                    <div class="moveout-detail-item">
                        <span class="moveout-detail-label">COL ID</span>
                        <span class="moveout-detail-value">${unit["COL ID"] || 'N/A'}</span>
                    </div>
                    <div class="moveout-detail-item">
                        <span class="moveout-detail-label">Move-In Date</span>
                        <span class="moveout-detail-value">${formatDate(unit["Move-In"]) || 'N/A'}</span>
                    </div>
                    <div class="moveout-detail-item">
                        <span class="moveout-detail-label">Move-Out Date</span>
                        <span class="moveout-detail-value">${formatDate(unit["Move-Out"]) || 'N/A'}</span>
                    </div>
                    <div class="moveout-detail-item">
                        <span class="moveout-detail-label">Duration</span>
                        <span class="moveout-detail-value">${unit["Duration"] || 'N/A'}</span>
                    </div>
                    <div class="moveout-detail-item">
                        <span class="moveout-detail-label">Class</span>
                        <span class="moveout-detail-value">${unit["Class"] || 'N/A'}</span>
                    </div>
                    <div class="moveout-detail-item">
                        <span class="moveout-detail-label">Rental Unit Promo</span>
                        <span class="moveout-detail-value">${unit["Promo Name: Rental"] || 'N/A'}</span>
                    </div>
                    <div class="moveout-detail-item">
                        <span class="moveout-detail-label">Add-on Promo</span>
                        <span class="moveout-detail-value">${unit["Promo Name: Addons"] || 'N/A'}</span>
                    </div>
                    <div class="moveout-detail-item moveout-detail-item-tenants ${!unit["Tenant 1: Email"] || unit["Tenant 1: Email"] === 'N/A' ? 'no-tenant' : ''}">
                        <span class="moveout-detail-label">Tenant 1</span>
                        <span class="moveout-detail-value">${unit["Tenant 1: Email"] || 'N/A'}</span>
                        <span class="moveout-detail-value">${unit["Tenant 1: Name"] || 'N/A'}</span>
                        <span class="moveout-detail-value">${unit["Tenant 1: Contact"] || 'N/A'}</span>
                    </div>
                    <div class="moveout-detail-item moveout-detail-item-tenants ${!unit["Tenant 2: Email"] || unit["Tenant 2: Email"] === 'N/A' ? 'no-tenant' : ''}">
                        <span class="moveout-detail-label">Tenant 2</span>
                        <span class="moveout-detail-value">${unit["Tenant 2: Email"] || 'N/A'}</span>
                        <span class="moveout-detail-value">${unit["Tenant 2: Name"] || 'N/A'}</span>
                        <span class="moveout-detail-value">${unit["Tenant 2: Contact"] || 'N/A'}</span>
                    </div>
                    <div class="moveout-detail-item moveout-detail-item-tenants ${!unit["Tenant 3: Email"] || unit["Tenant 3: Email"] === 'N/A' ? 'no-tenant' : ''}">
                        <span class="moveout-detail-label">Tenant 3</span>
                        <span class="moveout-detail-value">${unit["Tenant 3: Email"] || 'N/A'}</span>
                        <span class="moveout-detail-value">${unit["Tenant 3: Name"] || 'N/A'}</span>
                        <span class="moveout-detail-value">${unit["Tenant 3: Contact"] || 'N/A'}</span>
                    </div>

                </div>
            </div>
        `;
    });
    
    container.innerHTML = unitsHTML;
    // console.log(`✅ Successfully populated container "${containerId}" with ${units.length} units`);
}

// Load move-out alerts data
async function loadMoveOutAlerts() {
    // console.log(`🚨 Loading move-out alerts...`);
    document.getElementById('moveoutLoading').style.display = 'block';
    
    // Wait for all data to be loaded
    if (Object.keys(allUnitsData).length === 0) {
        // console.log(`📊 No data loaded yet, loading all data first...`);
        await loadAllData();
    } else {
        console.log(`✅ Data already loaded, proceeding with filtering`);
    }
    
    // Filter and display units for each period
    // console.log(`🔍 Filtering units for all periods...`);
    const yesterdayUnits = filterUnitsByMoveOut('yesterday');
    const todayUnits = filterUnitsByMoveOut('today');
    const tomorrowUnits = filterUnitsByMoveOut('tomorrow');
    
    // Update counts
    // console.log(`📊 Updating count displays...`);
    console.log(`📈 Counts - Yesterday: ${yesterdayUnits.length}, Today: ${todayUnits.length}, Tomorrow: ${tomorrowUnits.length}`);
    
    document.getElementById('yesterdayCount').textContent = yesterdayUnits.length;
    document.getElementById('todayCount').textContent = todayUnits.length;
    document.getElementById('tomorrowCount').textContent = tomorrowUnits.length;
    
    // Display units
    displayMoveOutUnits(yesterdayUnits, 'yesterdayUnits');
    displayMoveOutUnits(todayUnits, 'todayUnits');
    displayMoveOutUnits(tomorrowUnits, 'tomorrowUnits');
    
    document.getElementById('moveoutLoading').style.display = 'none';
    // console.log(`✅ Move-out alerts loaded successfully`);
}

// Handle move-out tab switching
function switchMoveOutTab(period) {
    // console.log(`📋 Switching to move-out tab: "${period}"`);
    
    // Update active tab
    document.querySelectorAll('.moveout-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`[data-period="${period}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        console.log(`✅ Activated tab for period: "${period}"`);
    } else {
        console.error(`❌ Tab not found for period: "${period}"`);
    }
    
    // Show corresponding units
    document.querySelectorAll('.moveout-units').forEach(units => {
        units.style.display = 'none';
    });
    const targetContainer = document.getElementById(`${period}Units`);
    if (targetContainer) {
        targetContainer.style.display = 'block';
        // console.log(`✅ Showing units container for: "${period}"`);
    } else {
        console.error(`❌ Units container not found for period: "${period}"`);
    }
}

// Search function
function searchUnits(query) {
    console.log(`🔍 Searching for units with query: "${query}"`);
    
    if (!query.trim()) {
        // console.log(`⚠️ Empty search query, clearing results`);
        document.getElementById('searchResults').innerHTML = '';
        return;
    }

    const results = [];
    const searchTerm = query.toLowerCase().trim();
    console.log(`🎯 Processed search term: "${searchTerm}"`);

    // Search across all sheets
    Object.keys(allUnitsData).forEach(sheetName => {
        console.log(`🔍 Searching in sheet "${sheetName}" (${allUnitsData[sheetName].length} units)`);
        let sheetMatches = 0;
        
        allUnitsData[sheetName].forEach(unit => {
            if (unit["Unit"] && unit["Unit"].toLowerCase().includes(searchTerm)) {
                results.push({
                    ...unit,
                    sheetName: sheetName
                });
                sheetMatches++;
            }
        });
        
        console.log(`📊 Found ${sheetMatches} matches in "${sheetName}"`);
    });

    // console.log(`🎯 Total search results: ${results.length}`);
    displaySearchResults(results, query);
}

// Display search results
function displaySearchResults(results, query) {
    // console.log(`🖼️ Displaying ${results.length} search results for query: "${query}"`);
    const resultsContainer = document.getElementById('searchResults');
    
    if (!resultsContainer) {
        console.error(`❌ Search results container not found`);
        return;
    }
    
    if (results.length === 0) {
        // console.log(`ℹ️ No results found, showing empty state`);
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search no-results-icon"></i>
                <div class="no-results-text">No units found</div>
                <div class="no-results-subtext">Try searching with a different unit name</div>
            </div>
        `;
        return;
    }

    // console.log(`🏗️ Building search results HTML for ${results.length} results...`);
    let resultsHTML = '';
    results.forEach((unit, index) => {
        const statusClass = unit.sheetName.toLowerCase().replace(' ', '-');
        const statusDisplay = unit.sheetName === 'Actives' ? 'Active' : unit.sheetName;
        
        if (index < 3) { // Log first 3 results being processed
            console.log(`🔨 Processing search result ${index}: "${unit["Unit"]}" (${statusDisplay})`);
        }
        
        resultsHTML += `
            <div class="search-result-card">
                <div class="result-header">
                    <h3 class="result-unit-name">${unit["Unit"] || 'N/A'}</h3>
                    <span class="result-status-badge status-${statusClass}">${statusDisplay}</span>
                </div>
                <div class="result-details">
                    <!-- Basic Information Group -->
                    <div class="result-detail-group">
                        <h4 class="result-group-title">Basic Information</h4>
                        <div class="result-detail-row">
                            <div class="result-detail-item">
                                <span class="result-detail-label">Lease ID</span>
                                <span class="result-detail-value">${unit["Lease ID"] || 'N/A'}</span>
                            </div>
                            <div class="result-detail-item">
                                <span class="result-detail-label">COL ID</span>
                                <span class="result-detail-value">${unit["COL ID"] || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="result-detail-row">
                            <div class="result-detail-item">
                                <span class="result-detail-label">Building</span>
                                <span class="result-detail-value">${unit["AP"] || unit["Building"] || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Dates Group -->
                    <div class="result-detail-group">
                        <h4 class="result-group-title">Lease Dates</h4>
                        <div class="result-detail-row">
                            <div class="result-detail-item">
                                <span class="result-detail-label">Move-In Date</span>
                                <span class="result-detail-value">${formatDate(unit["Move-In"])}</span>
                            </div>
                            <div class="result-detail-item">
                                <span class="result-detail-label">Move-Out Date</span>
                                <span class="result-detail-value">${formatDate(unit["Move-Out"])}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Unit Details Group -->
                    <div class="result-detail-group">
                        <h4 class="result-group-title">Unit Details</h4>
                        <div class="result-detail-row">
                            <div class="result-detail-item">
                                <span class="result-detail-label">Duration</span>
                                <span class="result-detail-value">${unit["Duration"] || 'N/A'}</span>
                            </div>
                            <div class="result-detail-item">
                                <span class="result-label">Class</span>
                                <span class="result-detail-value">${unit["Class"] || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="result-detail-row">
                            <div class="result-detail-item">
                                <span class="result-detail-label">Unit Status</span>
                                <span class="result-detail-value">${unit["Unit Slot"] || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tenant Email Information Group -->
                    <div class="result-detail-group">
                        <h4 class="result-group-title">Tenant Emails</h4>
                        <div class="result-detail-row">
                            <div class="result-detail-item">
                                <span class="result-detail-label">Tenant 1 Email</span>
                                <span class="result-detail-value">${unit["Tenant 1: Email"] || 'N/A'}</span>
                                <span class="result-detail-value search-name-detail">${unit["Tenant 1: Name"] || 'N/A'}</span>
                            </div>
                            <div class="result-detail-item">
                                <span class="result-detail-label">Tenant 2 Email</span>
                                <span class="result-detail-value">${unit["Tenant 2: Email"] || 'N/A'}</span>
                                <span class="result-detail-value search-name-detail">${unit["Tenant 2: Name"] || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="result-detail-row">
                            <div class="result-detail-item">
                                <span class="result-detail-label">Tenant 3 Email</span>
                                <span class="result-detail-value">${unit["Tenant 3: Email"] || 'N/A'}</span>
                                <span class="result-detail-value search-name-detail">${unit["Tenant 3: Name"] || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tenant Contact Information Group -->
                    <div class="result-detail-group">
                        <h4 class="result-group-title">Tenant Contacts</h4>
                        <div class="result-detail-row">
                            <div class="result-detail-item">
                                <span class="result-detail-label">Tenant 1 Contact</span>
                                <span class="result-detail-value">${unit["Tenant 1: Contact"] || 'N/A'}</span>
                            </div>
                            <div class="result-detail-item">
                                <span class="result-detail-label">Tenant 2 Contact</span>
                                <span class="result-detail-value">${unit["Tenant 2: Contact"] || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="result-detail-row">
                            <div class="result-detail-item">
                                <span class="result-detail-label">Tenant 3 Contact</span>
                                <span class="result-detail-value">${unit["Tenant 3: Contact"] || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Lease Promo Information Group -->
                    <div class="result-detail-group">
                        <h4 class="result-group-title">Promo Applied</h4>
                        <div class="result-detail-row">
                            <div class="result-detail-item">
                                <span class="result-detail-label">Unit Promo</span>
                                <span class="result-detail-value">${unit["Promo Name: Rental"] || 'N/A'}</span>
                            </div>
                            <div class="result-detail-item">
                                <span class="result-detail-label">Add-on Promo</span>
                                <span class="result-detail-value">${unit["Promo Name: Addons"] || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    resultsContainer.innerHTML = resultsHTML;
    console.log(`✅ Successfully displayed ${results.length} search results`);
}

// Debounced search
let searchTimeout;
function handleSearch() {
    const query = document.getElementById('searchInput').value;
    const loadingEl = document.getElementById('searchLoading');
    
    // console.log(`🔍 Handling search input: "${query}"`);
    clearTimeout(searchTimeout);
    
    if (!query.trim()) {
        // console.log(`⚠️ Empty query, clearing results and hiding loading`);
        document.getElementById('searchResults').innerHTML = '';
        loadingEl.style.display = 'none';
        return;
    }

    console.log(`⏳ Showing loading indicator and setting 300ms delay`);
    loadingEl.style.display = 'block';
    
    searchTimeout = setTimeout(() => {
        // console.log(`🚀 Executing search after delay`);
        searchUnits(query);
        loadingEl.style.display = 'none';
        // console.log(`✅ Search completed, hiding loading indicator`);
    }, 300);
}

// Modern render function with building counts
async function renderEOLs(sheetName, containerClass, counterId, sectionCountId) {
    // console.log(`🎨 Rendering data for sheet "${sheetName}" in container ".${containerClass}"`);
    const containerTag = document.querySelector(`.${containerClass}`);
    
    if (!containerTag) {
        console.error(`❌ Container ".${containerClass}" not found`);
        return;
    }
    
    const data = await getJSON(sheetName);
    if (!data) {
        console.error(`❌ No data returned from sheet "${sheetName}"`);
        containerTag.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle empty-icon"></i>
                <p>Failed to load data for ${sheetName}</p>
            </div>
        `;
        return;
    }

    let found = data.filter(row => row["Unit"]);
    // console.log(`📊 Filtered data: ${found.length} units with valid Unit field from ${data.length} total rows`);
    
    // Count buildings
    const buildingCounts = countBuildings(found);
    
    // Update counters
    // console.log(`📈 Updating counters for "${sheetName}": ${found.length} units`);
    const counterEl = document.getElementById(counterId);
    if (counterEl) {
        counterEl.innerText = `${found.length}`;
        // console.log(`✅ Updated counter "${counterId}" to ${found.length}`);
    } else {
        console.error(`❌ Counter element "${counterId}" not found`);
    }
    
    if (sectionCountId) {
        const sectionCounterEl = document.getElementById(sectionCountId);
        if (sectionCounterEl) {
            sectionCounterEl.innerText = `${found.length}`;
            // console.log(`✅ Updated section counter "${sectionCountId}" to ${found.length}`);
        } else {
            console.error(`❌ Section counter element "${sectionCountId}" not found`);
        }
    }

    // Update stat card with building breakdown
    const statCard = counterEl?.closest('.stat-card');
    if (statCard) {
        // console.log(`🏢 Updating stat card with building breakdown`);
        // Remove existing building breakdown if any
        const existingBreakdown = statCard.querySelector('.stat-buildings');
        if (existingBreakdown) {
            // console.log(`🗑️ Removing existing building breakdown`);
            existingBreakdown.remove();
        }

        // Add building breakdown
        if (Object.keys(buildingCounts).length > 0) {
            const buildingHTML = `
                <div class="stat-buildings">
                    <div class="stat-buildings-title">Buildings</div>
                    <div class="buildings-grid">
                        ${createBuildingCountsHTML(buildingCounts)}
                    </div>
                </div>
            `;
            statCard.innerHTML += buildingHTML;
            // console.log(`✅ Added building breakdown to stat card`);
        }
    } else {
        console.log(`⚠️ Stat card not found for counter "${counterId}"`);
    }

    if (found.length === 0) {
        // console.log(`ℹ️ No units found, showing empty state`);
        containerTag.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox empty-icon"></i>
                <p>No units found in ${sheetName}</p>
            </div>
        `;
        return;
    }

    // console.log(`🏗️ Building unit cards for ${found.length} units`);
    containerTag.innerHTML = ''; // Clear container

    found.forEach((unit, index) => {
        if (index < 3) { // Log first 3 units being processed
            console.log(`🔨 Creating unit card ${index}: "${unit["Unit"]}"`);
        }
        
        const unitCard = document.createElement('div');
        unitCard.className = 'unit-card';
        unitCard.innerHTML = `
            <div class="unit-header" onclick="toggleUnit(this)">
                <h3 class="unit-name">${unit["Unit"] || 'N/A'}</h3>
                <i class="fas fa-chevron-down expand-icon"></i>
            </div>
            <div class="unit-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Lease ID</span>
                        <span class="detail-value">${unit["Lease ID"] || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">COL ID</span>
                        <span class="detail-value">${unit["COL ID"] || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Building</span>
                        <span class="detail-value">${unit["AP"] || unit["Building"] || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Move-In Date</span>
                        <span class="detail-value">${formatDate(unit["Move-In"])}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Move-Out Date</span>
                        <span class="detail-value">${formatDate(unit["Move-Out"])}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duration</span>
                        <span class="detail-value">${unit["Duration"] || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Class</span>
                        <span class="detail-value">${unit["Class"] || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Unit Status</span>
                        <span class="detail-value">${unit["Unit Slot"] || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
        
        containerTag.appendChild(unitCard);
    });
    
    // console.log(`✅ Successfully rendered ${found.length} unit cards for "${sheetName}"`);
}

function toggleUnit(header) {
    const card = header.parentElement;
    const unitName = card.querySelector('.unit-name').textContent;
    const isExpanding = !card.classList.contains('expanded');
    
    // console.log(`🔄 Toggling unit card for "${unitName}" - ${isExpanding ? 'expanding' : 'collapsing'}`);
    card.classList.toggle('expanded');
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // console.log(`🚀 Dashboard initialization started`);
    
    if (!checkAuthentication()) {
        console.log(`❌ Authentication failed, stopping initialization`);
        return;
    }
    
    // Set user info
    const username = sessionStorage.getItem('username');
    console.log(`👤 Setting user info for: "${username}"`);
    if (username) {
        const welcomeEl = document.getElementById('welcomeUser');
        const avatarEl = document.getElementById('userAvatar');
        
        if (welcomeEl) {
            welcomeEl.textContent = `Welcome, ${username}!`;
            // console.log(`✅ Updated welcome message`);
        }
        
        if (avatarEl) {
            avatarEl.textContent = username.charAt(0).toUpperCase();
            // console.log(`✅ Updated user avatar with initial: "${username.charAt(0).toUpperCase()}"`);
        }
    }

    // Load all data for searching first
    // console.log(`📊 Loading all data for search functionality...`);
    await loadAllData();
    // console.log(`✅ All data loaded for searching`);

    // Set up search functionality
    // console.log(`🔍 Setting up search functionality...`);
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                console.log(`⌨️ Enter key pressed in search input`);
                handleSearch();
            }
        });
        // console.log(`✅ Search event listeners attached`);
    } else {
        console.error(`❌ Search input element not found`);
    }

    // Set up move-out tab switching
    // console.log(`📋 Setting up move-out tab functionality...`);
    const moveoutTabs = document.querySelectorAll('.moveout-tab');
    if (moveoutTabs.length > 0) {
        moveoutTabs.forEach((tab, index) => {
            tab.addEventListener('click', function() {
                const period = this.getAttribute('data-period');
                console.log(`📋 Move-out tab clicked: "${period}"`);
                switchMoveOutTab(period);
            });
        });
        // console.log(`✅ Set up ${moveoutTabs.length} move-out tab listeners`);
    } else {
        console.error(`❌ No move-out tabs found`);
    }

    // Load move-out alerts
    // console.log(`🚨 Loading move-out alerts...`);
    await loadMoveOutAlerts();
    // console.log(`✅ Move-out alerts loaded`);

    // Load all data for display with building counts
    // console.log(`🎨 Loading and rendering all sheet data...`);
    const renderPromises = [
        renderEOLs("Terminated", "container-eolsTerminated", "totalTerminated", "terminatedCount"),
        renderEOLs("Contract Signed", "container-eolsContractSigned", "totalContractSigned", "contractSignedCount"),
        renderEOLs("Verified", "container-eolsVerified", "totalVerified", "verifiedCount"),
        renderEOLs("Approved", "container-eolsApproved", "totalApproved", "approvedCount"),
        renderEOLs("Actives", "container-eolsActive", "totalActive", "activeCount")
    ];
    
    await Promise.all(renderPromises);
    console.log(`✅ All sheets rendered successfully`);
    // console.log(`🎉 Dashboard initialization completed successfully`);
});
