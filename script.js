const CONFIG = {
    DEPLOYMENT_URL: "https://script.google.com/macros/s/AKfycbyooi8owqIXu0205Ikg21m1_ETWwYMUtPow0V1asNXr0aXK_2_s3aBs6vVL-j9Ekf5M/exec",
    SHEETS: ['Terminated', 'Contract Signed', 'Verified', 'Approved', 'Actives', 'Pending', 'Sorted Actives'],
    SEARCH_DEBOUNCE: 300,
    LOG_SAMPLE_SIZE: 3
};

const SHEET_CONFIG = [
    { name: "Terminated", container: "container-eolsTerminated", counter: "totalTerminated", sectionCounter: "terminatedCount" },
    { name: "Contract Signed", container: "container-eolsContractSigned", counter: "totalContractSigned", sectionCounter: "contractSignedCount" },
    { name: "Verified", container: "container-eolsVerified", counter: "totalVerified", sectionCounter: "verifiedCount" },
    { name: "Approved", container: "container-eolsApproved", counter: "totalApproved", sectionCounter: "approvedCount" },
    { name: "Actives", container: "container-eolsActive", counter: "totalActive", sectionCounter: "activeCount" },
    { name: "Pending", container: "container-eolsPending", counter: "totalPending", sectionCounter: "pendingCount" }
];

var thisMonth2025EOLs = '2025-09';

// Convert to a Date (day is needed, so default to first of month)
let date_thismonthEOLFormatted = new Date(thisMonth2025EOLs + '-01');
let thismonthEOLFormatted = date_thismonthEOLFormatted.toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long'
});
document.getElementById('monthEOLFormatted').innerHTML = `${thismonthEOLFormatted}`

class DataManager {
    constructor() {
        this.allUnitsData = {};
        this.searchTimeout = null;
    }

    async fetchJSON(sheetName = "") {
        // console.log(`🔄 Fetching data from sheet: "${sheetName}"`);
        try {
            const url = `${CONFIG.DEPLOYMENT_URL}?sheet=${encodeURIComponent(sheetName)}`;
            const response = await fetch(url, { method: "GET", mode: "cors" });

            // console.log(`📥 Response status: ${response.status} ${response.statusText}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const jsonData = await response.json();
            // console.log(`✅ Successfully fetched ${jsonData.length} rows from "${sheetName}"`);
            // console.log(`📊 Sample data from "${sheetName}":`, jsonData.slice(0, 2));
            // Test logging for Sorted Actives sheet
            if (sheetName === "Sorted Actives") {
                console.log(`🔍 TESTING - Sorted Actives sheet data:`, {
                    totalRows: jsonData.length,
                    sampleData: jsonData.slice(0, 5),
                    columns: jsonData.length > 0 ? Object.keys(jsonData[0]) : [],
                    unitsWithData: jsonData.filter(row => row["Unit"]).length
                });
            }

            return jsonData;
        } catch (err) {
            console.error(`❌ Fetch error for sheet "${sheetName}":`, err);
            return null;
        }
    }

    async loadAllData() {
        // console.log(`🚀 Loading all data for searching...`);
        
        const loadPromises = CONFIG.SHEETS.map(async (sheet) => {
            // console.log(`📋 Processing sheet: "${sheet}"`);
            const data = await this.fetchJSON(sheet);
            if (data) {
                const unitsWithData = data.filter(row => row["Unit"]);
                this.allUnitsData[sheet] = unitsWithData;
                console.log(`✅ Stored ${unitsWithData.length} units from "${sheet}"`);
            } else {
                console.log(`❌ Failed to load data from "${sheet}"`);
            }
        });

        await Promise.all(loadPromises);
        console.log(`📊 All data loaded. Total sheets: ${Object.keys(this.allUnitsData).length}`);
        console.log(`📈 Units per sheet:`, Object.fromEntries(
            Object.entries(this.allUnitsData).map(([sheet, data]) => [sheet, data.length])
        ));
    }

    searchUnits(query) {
        console.log(`🔍 Searching for units with query: "${query}"`);
        
        if (!query.trim()) {
            // console.log(`⚠️ Empty search query, clearing results`);
            UIManager.clearSearchResults();
            return;
        }

        const results = [];
        const searchTerm = query.toLowerCase().trim();
        console.log(`🎯 Processed search term: "${searchTerm}"`);

        Object.keys(this.allUnitsData).forEach(sheetName => {
            console.log(`🔍 Searching in sheet "${sheetName}" (${this.allUnitsData[sheetName].length} units)`);
            let sheetMatches = 0;
            
            this.allUnitsData[sheetName].forEach(unit => {
                if (unit["Unit"] && unit["Unit"].toLowerCase().includes(searchTerm)) {
                    results.push({ ...unit, sheetName });
                    sheetMatches++;
                }
            });
            
            console.log(`📊 Found ${sheetMatches} matches in "${sheetName}"`);
        });

        // console.log(`🎯 Total search results: ${results.length}`);
        UIManager.displaySearchResults(results, query);
    }

    handleSearch() {
        const query = document.getElementById('searchInput')?.value || '';
        const loadingEl = document.getElementById('searchLoading');
        
        // console.log(`🔍 Handling search input: "${query}"`);
        clearTimeout(this.searchTimeout);
        
        if (!query.trim()) {
            // console.log(`⚠️ Empty query, clearing results`);
            UIManager.clearSearchResults();
            if (loadingEl) loadingEl.style.display = 'none';
            return;
        }

        // console.log(`⏳ Showing loading indicator and setting ${CONFIG.SEARCH_DEBOUNCE}ms delay`);
        if (loadingEl) loadingEl.style.display = 'block';
        
        this.searchTimeout = setTimeout(() => {
            // console.log(`🚀 Executing search after delay`);
            this.searchUnits(query);
            if (loadingEl) loadingEl.style.display = 'none';
            // console.log(`✅ Search completed`);
        }, CONFIG.SEARCH_DEBOUNCE);
    }

    filterUnitsByMoveOut(period) {
        // console.log(`🔍 Filtering units by move-out period: "${period}"`);
        const targetDate = DateUtils.getTargetDateString(period);
        
        // console.log(`🎯 Target date for filtering: "${targetDate}"`);
        const filteredUnits = [];
        
        Object.keys(this.allUnitsData).forEach(sheetName => {
            // console.log(`🔍 Searching in sheet "${sheetName}" (${this.allUnitsData[sheetName].length} units)`);
            let sheetMatches = 0;
            
            this.allUnitsData[sheetName].forEach((unit) => {
                const moveOutDate = DateUtils.normalizeDateString(unit["Move-Out"]);
                if (moveOutDate === targetDate) {
                    filteredUnits.push({ ...unit, sheetName });
                    sheetMatches++;
                    if (sheetMatches <= CONFIG.LOG_SAMPLE_SIZE) {
                        console.log(`✅ Match found in "${sheetName}": Unit "${unit["Unit"]}" moving out on "${moveOutDate}"`);
                    }
                }
            });
            
            console.log(`📊 Found ${sheetMatches} matches in "${sheetName}"`);
        });
        
        console.log(`🎯 Total filtered units for "${period}": ${filteredUnits.length}`);
        return filteredUnits;
    }

    filterUnitsByThisMonth2025() {
        // console.log(`🔍 Filtering active units with move-out in September 2025`);
        const filteredUnits = [];
        const sheetName = 'Actives';
        
        if (!this.allUnitsData[sheetName]) {
            console.log(`❌ No data available for "${sheetName}" sheet`);
            return filteredUnits;
        }

        console.log(`🔍 Searching in sheet "${sheetName}" (${this.allUnitsData[sheetName].length} units)`);
        let sheetMatches = 0;

        this.allUnitsData[sheetName].forEach((unit) => {
            const moveOutDate = DateUtils.normalizeDateString(unit["Move-Out"]);
            if (moveOutDate && moveOutDate.startsWith(thisMonth2025EOLs)) {
                filteredUnits.push({ ...unit, sheetName });
                sheetMatches++;
                if (sheetMatches <= CONFIG.LOG_SAMPLE_SIZE) {
                    console.log(`✅ Match found in "${sheetName}": Unit "${unit["Unit"]}" moving out on "${moveOutDate}"`);
                }
            }
        });

        console.log(`📊 Found ${sheetMatches} matches in "${sheetName}"`);
        console.log(`🎯 Total filtered units for this month ${thisMonth2025EOLs} 2025: ${filteredUnits.length}`);
        return filteredUnits;
    }
}

class DateUtils {
    static formatDate(isoString) {
        if (!isoString) {
            console.log(`⚠️ No date provided, returning "N/A"`);
            return "N/A";
        }
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            console.log(`❌ Invalid date format: "${isoString}"`);
            return "Invalid Date";
        }
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    static getDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    static getTodayString() {
        return this.getDateString(new Date());
    }

    static getYesterdayString() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return this.getDateString(yesterday);
    }

    static getTomorrowString() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.getDateString(tomorrow);
    }

    static getTargetDateString(period) {
        switch (period) {
            case 'today': return this.getTodayString();
            case 'yesterday': return this.getYesterdayString();
            case 'tomorrow': return this.getTomorrowString();
            default: return this.getTodayString();
        }
    }

    static normalizeDateString(dateStr) {
        if (!dateStr) {
            console.log(`⚠️ Empty date string provided`);
            return null;
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            console.log(`❌ Invalid date: "${dateStr}"`);
            return null;
        }
        return this.getDateString(date);
    }
}

class UIManager {
    static countBuildings(data) {
        console.log(`🏢 Counting buildings from ${data.length} units`);
        const buildingCounts = {};
        
        data.forEach((row, index) => {
            if (row["Unit"]) {
                const building = row["AP"] || row["Building"] || "Unknown";
                buildingCounts[building] = (buildingCounts[building] || 0) + 1;
                if (index < CONFIG.LOG_SAMPLE_SIZE) {
                    console.log(`🏢 Unit ${index}: "${row["Unit"]}" -> Building: "${building}"`);
                }
            }
        });
        
        console.log(`📊 Building counts result:`, buildingCounts);
        return buildingCounts;
    }

    static createBuildingCountsHTML(buildingCounts) {
        console.log(`🏗️ Creating building counts HTML from:`, buildingCounts);
        if (!buildingCounts || Object.keys(buildingCounts).length === 0) {
            return '<div class="building-count">No buildings</div>';
        }
        
        return Object.entries(buildingCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([building, count]) => 
                `<div class="building-count">${building} - ${count}</div>`
            ).join('');
    }

    static updateCounters(sheetName, count, counterId, sectionCountId) {
        console.log(`📈 Updating counters for "${sheetName}": ${count} units`);
        
        const counterEl = document.getElementById(counterId);
        if (counterEl) {
            counterEl.innerText = `${count}`;
            console.log(`✅ Updated counter "${counterId}" to ${count}`);
        } else {
            console.error(`❌ Counter element "${counterId}" not found`);
        }
        
        if (sectionCountId) {
            const sectionCounterEl = document.getElementById(sectionCountId);
            if (sectionCounterEl) {
                sectionCounterEl.innerText = `${count}`;
                console.log(`✅ Updated section counter "${sectionCountId}" to ${count}`);
            } else {
                console.error(`❌ Section counter element "${sectionCountId}" not found`);
            }
        }
    }

    static updateStatCard(counterId, buildingCounts) {
        const counterEl = document.getElementById(counterId);
        const statCard = counterEl?.closest('.stat-card');
        
        if (statCard) {
            console.log(`🏢 Updating stat card with building breakdown`);
            
            const existingBreakdown = statCard.querySelector('.stat-buildings');
            if (existingBreakdown) {
                console.log(`🗑️ Removing existing building breakdown`);
                existingBreakdown.remove();
            }

            if (Object.keys(buildingCounts).length > 0) {
                const buildingHTML = `
                    <div class="stat-buildings">
                        <div class="stat-buildings-title">Buildings</div>
                        <div class="buildings-grid">
                            ${this.createBuildingCountsHTML(buildingCounts)}
                        </div>
                    </div>
                `;
                statCard.innerHTML += buildingHTML;
                console.log(`✅ Added building breakdown to stat card`);
            }
        }
    }

    static createUnitCard(unit, index) {
        if (index < CONFIG.LOG_SAMPLE_SIZE) {
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
                    ${this.createDetailItems([
                        { label: 'Lease ID', value: unit["Lease ID"] },
                        { label: 'COL ID', value: unit["COL ID"] },
                        { label: 'Building', value: unit["AP"] || unit["Building"]},
                        { label: 'Move-In Date', value: DateUtils.formatDate(unit["Move-In"]) },
                        { label: 'Move-Out Date', value: DateUtils.formatDate(unit["Move-Out"]) },
                        { label: 'Duration', value: unit["Duration"] },
                        { label: 'Class', value: unit["Class"] },
                        { label: 'Unit Status', value: unit["Unit Slot"] },
                        { label: 'Unit Rate (2025)', value: unit["Rental Rate: 2025"] },
                        { label: 'Add-Ons', value: unit["Add-On Agreements: Add-ons Name"] }
                    ])}
                </div>
            </div>
        `;
        
        return unitCard;
    }

    static createDetailItems(items) {
        return items.map(item => `
            <div class="detail-item">
                <span class="detail-label">${item.label}</span>
                <span class="detail-value">${item.value || 'N/A'}</span>
            </div>
        `).join('');
    }

    static displayMoveOutUnits(units, containerId) {
        console.log(`🖼️ Displaying ${units.length} move-out units in container "${containerId}"`);
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.error(`❌ Container with ID "${containerId}" not found`);
            return;
        }
        
        if (units.length === 0) {
            console.log(`ℹ️ No units to display, showing empty state`);
            container.innerHTML = `
                <div class="no-moveout-units">
                    <i class="fas fa-check-circle no-moveout-icon"></i>
                    <div class="no-moveout-text">No move-outs for this period</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = units.map((unit, index) => {
            const statusClass = unit.sheetName.toLowerCase().replace(' ', '-');
            const statusDisplay = unit.sheetName === 'Actives' ? 'Active' : unit.sheetName;
            
            return this.createMoveOutUnitCard(unit, statusClass, statusDisplay, index);
        }).join('');
        
        console.log(`✅ Successfully populated container "${containerId}" with ${units.length} units`);
    }

    static displayMoveOutUnitsForThisMonth(units, containerId) {
        console.log(units, " units found");
        const container = document.getElementById(containerId);

        const conDetails = document.querySelector('.side-details');
        
        if (!container) {
            console.error(`❌ Container with ID "${containerId}" not found`);
            return;
        }
        
        if (units.length === 0) {
            console.log(`ℹ️ No units to display, showing empty state`);
            container.innerHTML = `
                <div class="no-moveout-units">
                    <i class="fas fa-check-circle no-moveout-icon"></i>
                    <div class="no-moveout-text">No move-outs for this period</div>
                </div>
            `;
            return;
        }
        // console.log(units[0]["Lease Status"], "--------------------------UNITS")
        document.getElementById('monthEOLFormatted').insertAdjacentHTML("afterend", `<span id="thisMonth2025UnitsClass"> ${units.length} ${units[0]["Lease Status"]} results.</span>`);
        container.insertAdjacentHTML("beforebegin", `<div class="det-icon"><i class="fa-regular fa-building"></i> Lists:</div>`);
        container.innerHTML = units.map((unit, index) => {
            const statusClass = unit.sheetName.toLowerCase().replace(' ', '-');
            const statusDisplay = unit.sheetName === 'Actives' ? 'Active' : unit.sheetName;
            return this.createThisMoveoutMonthCard(unit, statusClass, statusDisplay, index);
        }).join('');
        
        console.log(`✅ Successfully populated container "${containerId}" with ${units.length} units`);
    }
            
    // <div class="thisMonthEOL-${index}" onclick="checkDetails(this)"> 
    static createThisMoveoutMonthCard(unit, statusClass, statusDisplay, index) {
        return `
            <div class="thisMonthEOL-${statusClass} thisMonthEOL-${index}" data-index="${index}"> 
            <span> ${unit["Unit"] || 'N/A'}</span>
            <span> (${unit["Lease ID"]})</span>
            </div>
        `;
    }

    static createMoveOutUnitCard(unit, statusClass, statusDisplay, index) {
        if (index < CONFIG.LOG_SAMPLE_SIZE) {
            console.log(`🔨 Processing unit ${index}: "${unit["Unit"]}" (${statusDisplay})`);
        }
        
        return `
            <div class="moveout-unit-card">
                <div class="moveout-unit-header">
                    <div class="moveout-unit-info">
                        <h3 class="moveout-unit-name">${unit["Unit"] || 'N/A'}</h3>
                        <span class="moveout-unit-badge status-${statusClass}">${statusDisplay}</span>
                    </div>
                    <div class="moveout-date-info">
                        <span class="moveout-date">${DateUtils.formatDate(unit["Move-Out"])}</span>
                    </div>
                </div>
                <div class="moveout-unit-details hidden">
                    ${this.createMoveOutDetailItems([
                        { label: 'Lease ID', value: unit["Lease ID"] },
                        { label: 'COL ID', value: unit["COL ID"] },
                        { label: 'Move-In Date', value: DateUtils.formatDate(unit["Move-In"]) },
                        { label: 'Move-Out Date', value: DateUtils.formatDate(unit["Move-Out"]) },
                        { label: 'Duration', value: unit["Duration"] },
                        { label: 'Class', value: unit["Class"] },
                        { label: 'Building', value: unit["Building"] },
                        { label: 'Unit Rate (2025)', value: unit["Rental Rate: 2025"] },
                        { label: 'Add-Ons', value: unit["Add-On Agreements: Add-ons Name"] },
                        { label: 'Add-Ons Code', value: unit["Add-On Agreements: Add-ons Code"] },
                        { label: 'Rental Unit Promo', value: unit["Promo Name: Rental"] },
                        { label: 'Add-on Promo', value: unit["Promo Name: Addons"] }
                    ])}
                    ${this.createTenantDetails(unit)}
                </div>
            </div>
        `;
    }

    static createMoveOutDetailItems(items) {
        return items.map(item => `
            <div class="moveout-detail-item">
                <span class="moveout-detail-label">${item.label}</span>
                <span class="moveout-detail-value">${item.value || 'N/A'}</span>
            </div>
        `).join('');
    }

    static createTenantDetails(unit) {
        return [1, 2, 3].map(num => {
            const email = unit[`Tenant ${num}: Email`];
            const hasData = email && email !== 'N/A';
            
            return `
                <div class="moveout-detail-item moveout-detail-item-tenants ${!hasData ? 'no-tenant' : ''}">
                    <span class="moveout-detail-label">Tenant ${num}</span>
                    <span class="moveout-detail-value">${email || 'N/A'}</span>
                    <span class="moveout-detail-value">${unit[`Tenant ${num}: Name`] || 'N/A'}</span>
                    <span class="moveout-detail-value">${unit[`Tenant ${num}: Contact`] || 'N/A'}</span>
                </div>
            `;
        }).join('');
    }

    static clearSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    static displaySearchResults(results, query) {
        console.log(`🖼️ Displaying ${results.length} search results for query: "${query}"`);
        const resultsContainer = document.getElementById('searchResults');
        
        if (!resultsContainer) {
            console.error(`❌ Search results container not found`);
            return;
        }
        
        if (results.length === 0) {
            console.log(`ℹ️ No results found, showing empty state`);
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search no-results-icon"></i>
                    <div class="no-results-text">No units found</div>
                    <div class="no-results-subtext">Try searching with a different unit name</div>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = results.map((unit, index) => {
            return this.createSearchResultCard(unit, index);
        }).join('');
        
        console.log(`✅ Successfully displayed ${results.length} search results`);
    }

    static createSearchResultCard(unit, index) {
        const statusClass = unit.sheetName.toLowerCase().replace(' ', '-');
        const statusDisplay = unit.sheetName === 'Actives' ? 'Active' : unit.sheetName;
        
        if (index < CONFIG.LOG_SAMPLE_SIZE) {
            console.log(`🔨 Processing search result ${index}: "${unit["Unit"]}" (${statusDisplay})`);
        }
        
        return `
            <div class="search-result-card">
                <div class="result-header">
                    <h3 class="result-unit-name">${unit["Unit"] || 'N/A'}</h3>
                    <span class="result-status-badge status-${statusClass}">${statusDisplay}</span>
                </div>
                <div class="result-details">
                    ${this.createSearchResultGroups(unit)}
                </div>
            </div>
        `;
    }

    static createSearchResultGroups(unit) {
        const groups = [
            {
                title: 'Basic Information',
                items: [
                    { label: 'Lease ID', value: unit["Lease ID"] },
                    { label: 'COL ID', value: unit["COL ID"] },
                    { label: 'Building', value: `${unit["Building"]} (${unit["Building ID"]})` }
                ]
            },
            {
                title: 'Lease Dates',
                items: [
                    { label: 'Move-In Date', value: DateUtils.formatDate(unit["Move-In"]) },
                    { label: 'Move-Out Date', value: DateUtils.formatDate(unit["Move-Out"]) },
                    { label: 'Duration', value: unit["Duration"] }
                ]
            },
            {
                title: 'Unit Details',
                items: [
                    { label: 'Class', value: unit["Class"] },
                    { label: 'Unit Status', value: unit["Unit Slot"] },
                    { label: 'Unit Rate (2025)', value: unit["Rental Rate: 2025"] },
                    { label: 'Admin Fee', value: unit["Monthly Admin Fee"] }
                ]
            },
            {
                title: 'Tenant Emails',
                items: [
                    { label: 'Tenant 1 Email', value: unit["Tenant 1: Email"], extra: unit["Tenant 1: Name"] },
                    { label: 'Tenant 2 Email', value: unit["Tenant 2: Email"], extra: unit["Tenant 2: Name"] },
                    { label: 'Tenant 3 Email', value: unit["Tenant 3: Email"], extra: unit["Tenant 3: Name"] }
                ]
            },
            {
                title: 'Tenant Contacts',
                items: [
                    { label: 'Tenant 1 Contact', value: unit["Tenant 1: Contact"] },
                    { label: 'Tenant 2 Contact', value: unit["Tenant 2: Contact"] },
                    { label: 'Tenant 3 Contact', value: unit["Tenant 3: Contact"] }
                ]
            },
            {
                title: 'Auxiliaries',
                items: [
                    { label: 'Add-Ons', value: unit["Add-On Agreements: Add-ons Name"] },
                    { label: 'Add-Ons Code', value: unit["Add-On Agreements: Add-ons Code"] }
                ]
            },
            {
                title: 'Monthly Rates',
                items: [
                    { label: 'Unit Rate', value: unit["Monthly Unit Rate"] },
                    { label: 'Discount', value: unit["Monthy Unit Discount"] },
                    { label: 'Net Monthly Rate', value: unit["Net Monthly Rate"] },
                    { label: 'Addon(s) Monthly Rate', value: unit["Monthly Addon Rate"] },
                    { label: 'Addon(s) Discount', value: unit["Monthly Addon Discount Rate"] },
                    { label: 'Addon(s) Net Monthly Rate', value: unit["Net Monthly Addon Rate"] }
                ]
            },
            {
                title: 'Promo Applied',
                items: [
                    { label: 'Unit Promo', value: unit["Promo Name: Rental"] },
                    { label: 'Add-on Promo', value: unit["Promo Name: Addons"] }
                ]
            },{
                title: 'B2B Details',
                items: [
                    { label: 'B2B Representative Email', value: unit["B2B Profile Representative: Email"] },
                    { label: 'B2B Profile Name', value: unit["B2B Profile Name"] }
                ]
            }
        ];

        if (unit.sheetName === 'Pending') {
            groups.push({
                title: 'Link Forms',
                items: [
                    { label: 'Lease Application Approval Form Link', value: `<a href="https://script.google.com/a/macros/pointblue.ph/s/AKfycbz_OFe9HtW15HCkNmgpr1XLAcSx_y5XErFZBO-YupZfd64MW-P8JopRaowGQXRD4idezg/exec?leaseid=${unit['Lease ID']}" target="_blank">Open ${unit['Unit']}</a>` },
                ]
            });
        }
        if (unit.sheetName === 'Actives') {
            groups.push({
                title: 'Link Forms',
                items: [
                    { label: 'Lease Editor Form Link', value: `<a href="https://script.google.com/a/macros/pointblue.ph/s/AKfycbzbzsS53LFj8BZKXfe_ZScY3yWBE1fkGeUCAyO0BVfls53TNtAqeWtPvZJ0WHCF7zZR/exec?leaseid=${unit['Lease ID']}" target="_blank">Open ${unit['Unit']}</a>` },
                ]
            });
        }
        if (unit.sheetName === 'Contract Signed') {
            groups.push({
                title: 'Link Forms',
                items: [
                    { label: 'Verify Contract Form Link', value: `<a href="https://script.google.com/a/macros/pointblue.ph/s/AKfycbwhAxj9Qkk6uYxqb-bdEwxH1wNRNEBiqaiC8oxnvXagz_JNORngsnbSIMP8HaPR3w8pDA/exec?leaseid=${unit['Lease ID']}" target="_blank">Open ${unit['Unit']}</a>` },
                ]
            });
        }

        return groups.map(group => `
            <div class="result-detail-group">
                <h4 class="result-group-title">${group.title}</h4>
                <div class="result-detail-row">
                    ${group.items.map(item => `
                        <div class="result-detail-item">
                            <span class="result-detail-label">${item.label}</span>
                            <span class="result-detail-value">${item.value || 'N/A'}</span>
                            ${item.extra ? `<span class="result-detail-value search-name-detail">${item.extra || 'N/A'}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    static switchMoveOutTab(period) {
        console.log(`📋 Switching to move-out tab: "${period}"`);
        
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
        
        document.querySelectorAll('.moveout-units').forEach(units => {
            units.style.display = 'none';
        });
        
        const targetContainer = document.getElementById(`${period}Units`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
            console.log(`✅ Showing units container for: "${period}"`);
        } else {
            console.error(`❌ Units container not found for period: "${period}"`);
        }
    }

    static showEmptyState(container, message, sheetName) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox empty-icon"></i>
                <p>${message || `No units found in ${sheetName}`}</p>
            </div>
        `;
    }

    static showErrorState(container, message) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle empty-icon"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

class AuthManager {
    static checkAuthentication() {
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

    static logout() {
        console.log(`👋 User logging out`);
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('username');
        window.location.href = 'login.html';
    }

    static setupUserInfo() {
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
                console.log(`✅ Updated user avatar with initial: "${username.charAt(0).toUpperCase()}"`);
            }
        }
    }
}

class DashboardApp {
    constructor() {
        this.dataManager = new DataManager();
    }

    async displaySortedActivesCustomUI() {
        console.log(`🔄 Fetching and displaying "Sorted Actives" data in custom UI...`);

        // Fetch the "Sorted Actives" data
        const sortedActivesData = await this.dataManager.fetchJSON("Sorted Actives");

        if (!sortedActivesData || sortedActivesData.length === 0) {
            console.error(`❌ No data found for "Sorted Actives" sheet`);
            const container = document.getElementById('sortedActivesCustomContainer');
            if (container) {
                container.innerHTML = `
                    <div class="no-data">
                        <i class="fas fa-inbox"></i>
                        <p>No units found in Sorted Actives</p>
                    </div>
                `;
            }
            return;
        }

        // Log the data and properties for debugging
        console.log(`📊 "Sorted Actives" Data (Total: ${sortedActivesData.length} units):`, sortedActivesData);
        sortedActivesData.forEach((unit, index) => {
            if (unit["Unit"]) {
                console.log(`🔍 Unit ${index + 1} - ${unit["Unit"]}:`);
                console.log(`  Properties:`);
                Object.entries(unit).forEach(([key, value]) => {
                    console.log(`    ${key}: ${value || 'N/A'}`);
                });
            }
        });

        // Filter valid units (with a Unit field)
        const validUnits = sortedActivesData.filter(row => row["Unit"]);
        console.log(`📊 Filtered ${validUnits.length} valid units from ${sortedActivesData.length} total rows`);

        console.log("validUnits =>>>>>>>");
        console.log(validUnits);

        // Get the container
        const container = document.getElementById('sortedActivesCustomContainer');
        if (!container) {
            console.error(`❌ Container "sortedActivesCustomContainer" not found`);
            return;
        }

    const sortMonthText = validUnits[0]["Month/Year Filtered"];
    const sortMonthCountText = validUnits[2]["Month/Year Filtered"];
        // Clear the container and add a header
        container.innerHTML = `
            <div class="stat-card stat-sorted-actives">
                <h2 class="stat-card-title">Sorted Actives Units for</h2>
                <h2 class="stat-card-title">${sortMonthText} (${sortMonthCountText})</h2>
            </div>
        `;
            // <div class="sorted-active-list"></div>

        const listContainer = container.querySelector('.stat-sorted-actives');

        // Display units
        if (validUnits.length === 0) {
            console.log(`ℹ️ No valid units to display, showing empty state`);
            listContainer.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>No units found in Sorted Actives</p>
                </div>
            `;
            return;
        }

        // Create and append list items
        validUnits.forEach((unit, index) => {
            const listItem = this.createSortedActivesListItem(unit, index);
            listContainer.appendChild(listItem);
        });

        console.log(`✅ Successfully displayed ${validUnits.length} units in sortedActivesCustomContainer`);
    }

    // Custom list item creation for Sorted Actives
    createSortedActivesListItem(unit, index) {
        if (index < CONFIG.LOG_SAMPLE_SIZE) {
            console.log(`🔨 Creating Sorted Actives list item ${index}: "${unit["Unit"]}"`);
        }

        const listItem = document.createElement('div');
        listItem.className = 'stat-card';
        let formatDateMI = new Date(DateUtils.formatDate(unit["Move-In"])).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
        });
        let formatDateMO = new Date(DateUtils.formatDate(unit["Move-Out"])).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
        });
        listItem.innerHTML = `
            <details>
                <summary><h4>${unit["Unit"] || 'N/A'}</h4><h4>${formatDateMO}</h4></summary>
                <div class="summary-info">
                    <div><h5>Move-In</h5><h5>${DateUtils.formatDate(unit["Move-In"])}</h5></div>
                    <div><h5>Move-Out</h5><h5>${DateUtils.formatDate(unit["Move-Out"])}</h5></div>
                    <div><h5>Lease ID</h5><h5>${unit["Lease ID"]}</h5></div>
                    <div><h5>Col ID</h5><h5>${unit["Col ID"]}</h5></div>
                    <div><h5>Term</h5><h5>${unit["Duration"]}</h5></div>
                    <div><h5>Class</h5><h5>${unit["Class"]}</h5></div>
                    <div><h5>Unit Status</h5><h5>${unit["Unit Status"]}</h5></div>
                    <div><h5>Monthly Rent</h5><h5>${unit["Monthly Rent"]}</h5></div>
                    <div><h5>Promo(s)</h5><h5>${unit["Rental Promo"] || "None"}</h5></div>
                    <div><h5>Add-Ons</h5><h5>${unit["Addons"] || "None"}</h5></div>
                    <div><h5>Tenants</h5><h5>${unit["User: Names"]}</h5></div>
                    <div><h5>Emails</h5><h5>${unit["User: Emails"]}</h5></div>
                </div>
            </details>
        `;

        return listItem;
    }

    async renderSheet({ name, container, counter, sectionCounter }) {
        console.log(`🎨 Rendering data for sheet "${name}" in container ".${container}"`);
        const containerElement = document.querySelector(`.${container}`);
        
        if (!containerElement) {
            console.error(`❌ Container ".${container}" not found`);
            return;
        }
        
        const data = await this.dataManager.fetchJSON(name);
        if (!data) {
            console.error(`❌ No data returned from sheet "${name}"`);
            UIManager.showErrorState(containerElement, `Failed to load data for ${name}`);
            return;
        }

        const validUnits = data.filter(row => row["Unit"]);
        console.log(`📊 Filtered data: ${validUnits.length} units with valid Unit field from ${data.length} total rows`);
        
        const buildingCounts = UIManager.countBuildings(validUnits);
        UIManager.updateCounters(name, validUnits.length, counter, sectionCounter);
        UIManager.updateStatCard(counter, buildingCounts);

        if (validUnits.length === 0) {
            console.log(`ℹ️ No units found, showing empty state`);
            UIManager.showEmptyState(containerElement, null, name);
            return;
        }

        console.log(`🏗️ Building unit cards for ${validUnits.length} units`);
        containerElement.innerHTML = '';
        
        validUnits.forEach((unit, index) => {
            const unitCard = UIManager.createUnitCard(unit, index);
            containerElement.appendChild(unitCard);
        });
        
        console.log(`✅ Successfully rendered ${validUnits.length} unit cards for "${name}"`);
    }

    async loadMoveOutAlerts() {
        console.log(`🚨 Loading move-out alerts...`);
        const loadingEl = document.getElementById('moveoutLoading');
        if (loadingEl) loadingEl.style.display = 'block';
        
        if (Object.keys(this.dataManager.allUnitsData).length === 0) {
            console.log(`📊 No data loaded yet, loading all data first...`);
            await this.dataManager.loadAllData();
        } else {
            console.log(`✅ Data already loaded, proceeding with filtering`);
        }
        
        const periods = [
            { name: 'yesterday', units: this.dataManager.filterUnitsByMoveOut('yesterday') },
            { name: 'today', units: this.dataManager.filterUnitsByMoveOut('today') },
            { name: 'tomorrow', units: this.dataManager.filterUnitsByMoveOut('tomorrow') }
        ];
        
        periods.forEach(({ name, units }) => {
            const countEl = document.getElementById(`${name}Count`);
            if (countEl) {
                countEl.textContent = units.length;
                console.log(`📈 Updated ${name} count: ${units.length}`);
            }
            UIManager.displayMoveOutUnits(units, `${name}Units`);
        });
        
        if (loadingEl) loadingEl.style.display = 'none';
        // console.log(`✅ Move-out alerts loaded successfully`);
    }

    async loadThisMonth2025MoveOuts() {

        // console.log(`🚨 Loading September 2025 move-out alerts...`);
        const loadingEl = document.getElementById('thisMonthmoveoutLoading');
        if (loadingEl) loadingEl.style.display = 'block';
        
        if (Object.keys(this.dataManager.allUnitsData).length === 0) {
            console.log(`📊 No data loaded yet, loading all data first...`);
            await this.dataManager.loadAllData();
        } else {
            console.log(`✅ Data already loaded, proceeding with filtering`);
        }
        
        const units = this.dataManager.filterUnitsByThisMonth2025();
        //UIManager.displayMoveOutUnits(units, 'september2025Units');
        UIManager.displayMoveOutUnitsForThisMonth(units, 'thisMonth2025Units');
        
        if (loadingEl) loadingEl.style.display = 'none';
        console.log(`✅ September 2025 move-out alerts loaded successfully`);
    }

    setupEventListeners() {
        console.log(`🔧 Setting up event listeners...`);
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.dataManager.handleSearch());
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    console.log(`⌨️ Enter key pressed in search input`);
                    this.dataManager.handleSearch();
                }
            });
            console.log(`✅ Search event listeners attached`);
        } else {
            console.error(`❌ Search input element not found`);
        }

        const moveoutTabs = document.querySelectorAll('.moveout-tab');
        if (moveoutTabs.length > 0) {
            moveoutTabs.forEach((tab) => {
                tab.addEventListener('click', function() {
                    const period = this.getAttribute('data-period');
                    console.log(`📋 Move-out tab clicked: "${period}"`);
                    UIManager.switchMoveOutTab(period);
                });
            });
            console.log(`✅ Set up ${moveoutTabs.length} move-out tab listeners`);
        } else {
            console.error(`❌ No move-out tabs found`);
        }

        // Add listener for thisMonthEOL cards
        const thisMonthContainer = document.getElementById('thisMonth2025Units');
        if (thisMonthContainer) {
            thisMonthContainer.addEventListener('click', (e) => {
                const target = e.target.closest('[class*="thisMonthEOL-"]');
                if (target) {
                    console.log(`🔍 Clicked on move-out unit card`);
                    checkDetails(target);
                }
            });
            console.log(`✅ Attached event listener for thisMonthEOL cards`);
        } else {
            console.error(`❌ thisMonth2025Units container not found`);
        }
    }

    async init() {
        console.log(`🚀 Dashboard initialization started`);

        if (!AuthManager.checkAuthentication()) {
            console.log(`❌ Authentication failed, stopping initialization`);
            return;
        }
        
        AuthManager.setupUserInfo();
        // console.log(`📊 Loading all data for search functionality...`);
        await this.dataManager.loadAllData();
        console.log(`✅ All data loaded for searching`);
        this.setupEventListeners();
        // console.log(`🚨 Loading move-out alerts...`);
        await this.loadMoveOutAlerts();
        // console.log(`✅ Move-out alerts loaded`);
        // console.log(`🚨 Loading September 2025 move-out alerts...`);
        await this.loadThisMonth2025MoveOuts();
        await this.displaySortedActivesCustomUI();
        // console.log(`✅ September 2025 move-out alerts loaded`);
        console.log(`🎨 Loading and rendering all sheet data...`);
        const renderPromises = SHEET_CONFIG.map(config => this.renderSheet(config));
        await Promise.all(renderPromises);
        console.log(`✅ All sheets rendered successfully`);
        console.log(`🎉 Dashboard initialization completed successfully`);
    }

}

function toggleUnit(header) {
    const card = header.parentElement;
    const unitName = card.querySelector('.unit-name').textContent;
    const isExpanding = !card.classList.contains('expanded');
    
    // console.log(`🔄 Toggling unit card for "${unitName}" - ${isExpanding ? 'expanding' : 'collapsing'}`);
    card.classList.toggle('expanded');
}

function logout() {
    AuthManager.logout();
}

function switchMoveOutTab(period) {
    UIManager.switchMoveOutTab(period);
}

const dashboardApp = new DashboardApp();

document.addEventListener('DOMContentLoaded', function() {
    dashboardApp.init().catch(error => {
        console.error('🚨 Dashboard initialization failed:', error);
    });
});

const goTopBtn = document.getElementById("goTopBtn");

window.onscroll = function () {
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    goTopBtn.style.display = "block";
  } else {
    goTopBtn.style.display = "none";
  }
};

goTopBtn.onclick = function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Add this function near the bottom of script.js, after the DashboardApp class definition
function checkDetails(el) {
    console.log(`🔍 Checking details for element:`, el);
    // Extract the index from the element's class (e.g., thisMonthEOL-0)
    const classList = el.className.split('-');
    const index = parseInt(classList[classList.length - 1], 10);
    console.log(`🔢 Extracted index: ${index}`);

    // Access the unit data from the DashboardApp's DataManager
    const units = dashboardApp.dataManager.filterUnitsByThisMonth2025();
    const unit = units[index];


    if (!unit) {
        console.error(`❌ No unit found at index ${index}`);
        return;
    }

    // Remove 'active' class from all thisMonthEOL elements
    document.querySelectorAll('[class*="thisMonthEOL-"]').forEach(item => {
        item.classList.remove('active');
    });

    // Add 'active' class to the clicked element
    el.classList.add('active');

    console.log(`✅ Found unit: "${unit["Unit"]}"`);

    // Update the .side-details container with unit details
    const detailsContainer = document.querySelector('.side-details');
    if (!detailsContainer) {
        console.error(`❌ Side details container not found`);
        return;
    }
    // Create HTML for unit details
    detailsContainer.innerHTML = `
        <div>Selected Unit: <span>${unit["Unit"]}</span></div>
        <div>Move-In: <span>${DateUtils.formatDate(unit["Move-In"])}</span></div>
        <div>Move-Out: <span>${DateUtils.formatDate(unit["Move-Out"])}</span></div>
        <div>Duration: <span>${unit["Duration"]}</span></div>
        <div>Class: <span>${unit["Class"]}</span></div>
        <div>Unit Status: <span>${unit["Unit Slot"]}</span></div>
        <div>Add-Ons: <span>${unit["Add-On Agreements: Add-ons Name"] || "None"}</span></div>
        <div>Promo: <span>${unit["Promo Name: Rental"] || "None"}</span></div>
        <div>Lease Editor Link: <a title="Click to open its lease editor." target="_blank" href='https://script.google.com/a/macros/pointblue.ph/s/AKfycbzbzsS53LFj8BZKXfe_ZScY3yWBE1fkGeUCAyO0BVfls53TNtAqeWtPvZJ0WHCF7zZR/exec?leaseid=${unit['Lease ID']}'>Open Lease Editor for Unit ${unit["Unit"]}</a></div>
        
    `
    
    console.log(`✅ Updated side-details with unit "${unit["Unit"]}"`);
}
