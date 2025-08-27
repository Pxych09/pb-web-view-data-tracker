        // Deployment Web App URL (not Script ID!)
        const DEPLOYMENT_URL = "https://script.google.com/macros/s/AKfycbyooi8owqIXu0205Ikg21m1_ETWwYMUtPow0V1asNXr0aXK_2_s3aBs6vVL-j9Ekf5M/exec";

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
        document.addEventListener('DOMContentLoaded', function() {
            if (!checkAuthentication()) {
                return;
            }
            
            // Set user info
            const username = sessionStorage.getItem('username');
            if (username) {
                document.getElementById('welcomeUser').textContent = `Welcome, ${username}!`;
                document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
            }

            // Load all data
            renderEOLs("Terminated", "container-eolsTerminated", "totalTerminated", "terminatedCount");
            renderEOLs("Contract Signed", "container-eolsContractSigned", "totalContractSigned", "contractSignedCount");
            renderEOLs("Verified", "container-eolsVerified", "totalVerified", "verifiedCount");
            renderEOLs("Approved", "container-eolsApproved", "totalApproved", "approvedCount");
            renderEOLs("Actives", "container-eolsActive", "totalActive", "activeCount");
        });