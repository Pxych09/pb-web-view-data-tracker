        // Deployment Web App URL (not Script ID!)
        const DEPLOYMENT_URL = "https://script.google.com/macros/s/AKfycbyooi8owqIXu0205Ikg21m1_ETWwYMUtPow0V1asNXr0aXK_2_s3aBs6vVL-j9Ekf5M/exec";

        // Store all data for searching
        let allUnitsData = {};

        /**
         * Helper to fetch JSON from Apps Script Web App
         * @param {string} sheetName - The sheet name to query
         */
        async function getJSON(sheetName = "") {
            try {
                const res = await fetch(`${DEPLOYMENT_URL}?sheet=${encodeURIComponent(sheetName)}`, {
                    method: "GET",
                    mode: "cors"
                });

                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const jsonData = await res.json();
                return jsonData;
            } catch (err) {
                console.error("❌ Fetch error:", err);
                return null;
            }
        }

        // Format Date Utility
        const formatDate = (isoString) => {
            if (!isoString) return "N/A";
            const date = new Date(isoString);
            return date.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });
        };

        // Session Protection
        function checkAuthentication() {
            const isLoggedIn = sessionStorage.getItem('isLoggedIn');
            if (isLoggedIn !== 'true') {
                window.location.href = 'login.html';
                return false;
            }
            return true;
        }

        function logout() {
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('username');
            window.location.href = 'login.html';
        }

        // Load and store all data for searching
        async function loadAllData() {
            const sheets = ['Terminated', 'Contract Signed', 'Verified', 'Approved', 'Actives'];
            
            for (const sheet of sheets) {
                const data = await getJSON(sheet);
                if (data) {
                    allUnitsData[sheet] = data.filter(row => row["Unit"]);
                }
            }
        }

        // Search function
        function searchUnits(query) {
            if (!query.trim()) {
                document.getElementById('searchResults').innerHTML = '';
                return;
            }

            const results = [];
            const searchTerm = query.toLowerCase().trim();

            // Search across all sheets
            Object.keys(allUnitsData).forEach(sheetName => {
                allUnitsData[sheetName].forEach(unit => {
                    if (unit["Unit"] && unit["Unit"].toLowerCase().includes(searchTerm)) {
                        results.push({
                            ...unit,
                            sheetName: sheetName
                        });
                    }
                });
            });

            displaySearchResults(results, query);
        }

        // Display search results
        function displaySearchResults(results, query) {
            const resultsContainer = document.getElementById('searchResults');
            
            if (results.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search no-results-icon"></i>
                        <div class="no-results-text">No units found</div>
                        <div class="no-results-subtext">Try searching with a different unit name</div>
                    </div>
                `;
                return;
            }

            let resultsHTML = '';
            results.forEach(unit => {
                const statusClass = unit.sheetName.toLowerCase().replace(' ', '-');
                const statusDisplay = unit.sheetName === 'Actives' ? 'Active' : unit.sheetName;
                
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
                                        <span class="result-detail-label">Class</span>
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
        }

        // Debounced search
        let searchTimeout;
        function handleSearch() {
            const query = document.getElementById('searchInput').value;
            const loadingEl = document.getElementById('searchLoading');
            
            clearTimeout(searchTimeout);
            
            if (!query.trim()) {
                document.getElementById('searchResults').innerHTML = '';
                loadingEl.style.display = 'none';
                return;
            }

            loadingEl.style.display = 'block';
            
            searchTimeout = setTimeout(() => {
                searchUnits(query);
                loadingEl.style.display = 'none';
            }, 300);
        }

        // Modern render function
        async function renderEOLs(sheetName, containerClass, counterId, sectionCountId) {
            const containerTag = document.querySelector(`.${containerClass}`);
            
            const data = await getJSON(sheetName);
            if (!data) {
                console.error(`No data returned from sheet "${sheetName}"`);
                containerTag.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle empty-icon"></i>
                        <p>Failed to load data for ${sheetName}</p>
                    </div>
                `;
                return;
            }

            let found = data.filter(row => row["Unit"]);
            
            // Update counters
            document.getElementById(counterId).innerText = `${found.length}`;
            if (sectionCountId) {
                document.getElementById(sectionCountId).innerText = `${found.length}`;
            }

            if (found.length === 0) {
                containerTag.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox empty-icon"></i>
                        <p>No units found in ${sheetName}</p>
                    </div>
                `;
                return;
            }

            containerTag.innerHTML = ''; // Clear container

            found.forEach((unit, index) => {
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
        }

        function toggleUnit(header) {
            const card = header.parentElement;
            card.classList.toggle('expanded');
        }

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', async function() {
            if (!checkAuthentication()) {
                return;
            }
            
            // Set user info
            const username = sessionStorage.getItem('username');
            if (username) {
                document.getElementById('welcomeUser').textContent = `Welcome, ${username}!`;
                document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
            }

            // Load all data for searching first
            await loadAllData();

            // Set up search functionality
            const searchInput = document.getElementById('searchInput');
            searchInput.addEventListener('input', handleSearch);
            searchInput.addEventListener('keyup', function(e) {
                if (e.key === 'Enter') {
                    handleSearch();
                }
            });

            // Load all data for display
            renderEOLs("Terminated", "container-eolsTerminated", "totalTerminated", "terminatedCount");
            renderEOLs("Contract Signed", "container-eolsContractSigned", "totalContractSigned", "contractSignedCount");
            renderEOLs("Verified", "container-eolsVerified", "totalVerified", "verifiedCount");
            renderEOLs("Approved", "container-eolsApproved", "totalApproved", "approvedCount");
            renderEOLs("Actives", "container-eolsActive", "totalActive", "activeCount");
        });
