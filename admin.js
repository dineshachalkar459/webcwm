document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginView = document.getElementById('loginView');
    const dashboardView = document.getElementById('dashboardView');
    const loginForm = document.getElementById('loginForm');
    const userIdInput = document.getElementById('userId');
    const passwordInput = document.getElementById('password');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    const leadsTableBody = document.getElementById('leadsTableBody');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const refreshLeadsBtn = document.getElementById('refreshLeadsBtn');
    const leadSearchInput = document.getElementById('leadSearchInput');
    
    const cmsForm = document.getElementById('cmsForm');
    const cmsTitleInput = document.getElementById('cmsTitleInput');
    const cmsSubtitleInput = document.getElementById('cmsSubtitleInput');
    const cmsResetBtn = document.getElementById('cmsResetBtn');

    // --- Client Campaign Dashboard Elements ---
    const clientSelector = document.getElementById('clientSelector');
    const pcLeads = document.getElementById('pcLeads');
    const pcSpend = document.getElementById('pcSpend');
    const pcCPL = document.getElementById('pcCPL');
    const pcROAS = document.getElementById('pcROAS');
    
    const flImpressions = document.getElementById('flImpressions');
    const flQualified = document.getElementById('flQualified');
    const flBooked = document.getElementById('flBooked');
    const flSigned = document.getElementById('flSigned');

    const btnApprove1 = document.getElementById('btnApprove1');

    // --- File Protocol Notice ---
    if (window.location.protocol === 'file:') {
        const warningDiv = document.createElement('div');
        warningDiv.style.background = 'rgba(239, 68, 68, 0.15)';
        warningDiv.style.color = '#FCA5A5';
        warningDiv.style.border = '1px solid #EF4444';
        warningDiv.style.padding = '0.75rem';
        warningDiv.style.borderRadius = '8px';
        warningDiv.style.fontSize = '0.82rem';
        warningDiv.style.marginBottom = '1rem';
        warningDiv.style.textAlign = 'left';
        warningDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--clr-logo-yellow); margin-right: 0.3rem;"></i> <strong>Security Notice:</strong> Browser security blocks Excel sync when loaded via <code>file://</code>. Please use the server URL:<br><a href="http://127.0.0.1:3000/admin.html" style="text-decoration: underline; color: #fff; font-weight: 600;">http://127.0.0.1:3000/admin.html</a>`;
        
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.insertBefore(warningDiv, loginCard.firstChild);
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = userIdInput.value;
            const pwd = passwordInput.value;

            if (id === '12345' && pwd === '4599') {
                sessionStorage.setItem('adminLoggedIn', 'true');
                showDashboard();
            } else {
                alert('Invalid User ID or Password.');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('adminLoggedIn');
            userIdInput.value = '';
            passwordInput.value = '';
            dashboardView.style.display = 'none';
            loginView.style.display = 'flex';
        });
    }

    function showDashboard() {
        if (loginView) loginView.style.display = 'none';
        if (dashboardView) dashboardView.style.display = 'flex';
        checkStoredConnection();
        loadCMSContent();
        updateCampaignDashboard();
    }

    // --- Tab Navigation ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetPane = document.getElementById(btn.dataset.target);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // --- Leads Manager & Excel Sync Dashboard ---
    let currentWorkbook = null;
    let currentSheetName = '';
    let currentFile = 'FinalEVscrapsheet.xlsx';
    let currentLeads = [];
    let currentHeaders = [];
    let fileHandle = null;
    const defaultHeaders = ['Business Name', 'Owner / Page Name', 'Phone Number', 'Email', 'Instagram', 'Facebook', 'Website Link', 'Source', 'Priority', 'OUTREACH', 'Followup'];

    let donutChartInstance = null;
    let lineChartInstance = null;
    
    function getAvatarUrl(name, index) {
        const gender = (index % 2 === 0) ? 'men' : 'women';
        const num = (index % 45) + 1;
        return `https://randomuser.me/api/portraits/thumb/${gender}/${num}.jpg`;
    }

    // DOM Elements for Excel Control Panel
    const fileSelector = document.getElementById('fileSelector');
    const excelStatusBadge = document.getElementById('excelStatusBadge');
    const excelStatusMsg = document.getElementById('excelStatusMsg');
    const sheetSelector = document.getElementById('sheetSelector');
    const addSheetBtn = document.getElementById('addSheetBtn');
    const linkExcelBtn = document.getElementById('linkExcelBtn');
    const saveExcelBtn = document.getElementById('saveExcelBtn');
    const downloadExcelBtn = document.getElementById('downloadExcelBtn');
    const disconnectExcelBtn = document.getElementById('disconnectExcelBtn');
    const openAddLeadModalBtn = document.getElementById('openAddLeadModalBtn');
    const leadsTableHead = document.getElementById('leadsTableHead');

    // Set Status Panel Display (Simplified for Server Database Mode)
    function setSyncStatus(state, message) {
        if (!excelStatusBadge || !excelStatusMsg) return;
        
        excelStatusBadge.className = 'excel-status-pill';
        excelStatusMsg.textContent = message;
        
        if (state === 'loading') {
            excelStatusBadge.classList.add('badge-warning');
            excelStatusBadge.textContent = 'Loading...';
        } else if (state === 'success') {
            excelStatusBadge.classList.add('badge-success');
            excelStatusBadge.textContent = 'Synced';
        } else if (state === 'syncing') {
            excelStatusBadge.classList.add('badge-warning');
            excelStatusBadge.textContent = 'Syncing...';
        } else if (state === 'danger') {
            excelStatusBadge.classList.add('badge-danger');
            excelStatusBadge.textContent = 'Error';
        }
    }

    // Auto-Fetch file list from server
    async function fetchFileList() {
        if (!fileSelector) return;
        try {
            const res = await fetch('/api/files');
            if (res.ok) {
                const data = await res.json();
                fileSelector.innerHTML = '';
                data.files.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f;
                    opt.textContent = f;
                    fileSelector.appendChild(opt);
                });
                // Ensure currentFile is in the list
                if (data.files.includes(currentFile)) {
                    fileSelector.value = currentFile;
                } else if (data.files.length > 0) {
                    currentFile = data.files[0];
                    fileSelector.value = currentFile;
                }
            }
        } catch(e) { console.error('Failed to load file list', e); }
    }

    if (fileSelector) {
        fileSelector.addEventListener('change', (e) => {
            currentFile = e.target.value;
            autoFetchExcel();
        });
    }

    // Auto-Fetch Excel from server database
    async function autoFetchExcel() {
        setSyncStatus('loading', 'Auto-fetching ' + currentFile + '...');
        try {
            const res = await fetch('/api/file/' + encodeURIComponent(currentFile) + '?v=' + Date.now());
            if (!res.ok) throw new Error('Excel file not found on workspace server');
            const buffer = await res.arrayBuffer();
            currentWorkbook = XLSX.read(buffer, { type: 'array' });
            
            populateSheetSelector();
            
            // Default to Sheet1, or first sheet
            const targetSheet = currentWorkbook.SheetNames.includes('Sheet1') ? 'Sheet1' : currentWorkbook.SheetNames[0];
            selectSheet(targetSheet);
            
            setSyncStatus('success', 'Connected to server database. All changes synchronize automatically.');
        } catch (err) {
            console.error("Auto-fetch failed, falling back to mock database:", err);
            loadFallbackLocalStorage();
        }
    }

    // Fallback: LocalStorage Mock Database
    function loadFallbackLocalStorage() {
        currentFile = "cwm_local_leads_fallback";
        setSyncStatus('read-only', 'Running on LocalStorage fallback database.');
        
        const stored = localStorage.getItem('cwm_leads');
        if (stored) {
            try {
                currentLeads = JSON.parse(stored);
            } catch(e) {
                currentLeads = [];
            }
        } else {
            currentLeads = [
                {
                    "Business Name": "Yatindra Singh",
                    "Owner / Page Name": "Growth Electricals",
                    "Phone Number": "9022934777",
                    "Email": "Yatindra.singh@growthelectricals.com",
                    "Website Link": "https://growthelectricals.com",
                    "Source": "Discovery Call Booking",
                    "Priority": "P1",
                    "OUTREACH": "Yes",
                    "Followup": "N/A"
                }
            ];
            localStorage.setItem('cwm_leads', JSON.stringify(currentLeads));
        }
        currentHeaders = defaultHeaders;
        currentWorkbook = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(currentLeads);
        XLSX.utils.book_append_sheet(currentWorkbook, ws, 'Sheet1');
        
        populateSheetSelector();
        renderLeads();
    }

    // Populates sheetSelector dropdown
    function populateSheetSelector() {
        if (!sheetSelector || !currentWorkbook) return;
        sheetSelector.innerHTML = '';
        currentWorkbook.SheetNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            sheetSelector.appendChild(option);
        });
    }

    // Select Sheet and Render
    function selectSheet(name) {
        if (!currentWorkbook) return;
        currentSheetName = name;
        sheetSelector.value = name;
        
        // Save current active sheet in Hot Cache
        localStorage.setItem('cwm_active_sheet', name);
        
        const worksheet = currentWorkbook.Sheets[name];
        currentHeaders = getSheetHeaders(worksheet);
        
        // Parse rows, defaulting empty cells to empty string
        currentLeads = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        renderLeads();
    }

    // Extracts header list from Worksheet
    function getSheetHeaders(worksheet) {
        if (!worksheet || !worksheet['!ref']) return defaultHeaders;
        const headers = [];
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const R = range.s.r; // header row is always 0
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(address);
            const cell = worksheet[cell_ref];
            let val = '';
            if (cell && cell.t) {
                val = XLSX.utils.format_cell(cell);
            }
            if (val) {
                headers.push(val.trim());
            }
        }
        return headers.length > 0 ? headers : defaultHeaders;
    }

    // Render Table Grid Dynamically
    function renderLeads() {
        if (!leadsTableBody || !leadsTableHead) return;
        
        // Active sheet text
        const activeSheetNameEl = document.getElementById('activeSheetName');
        if (activeSheetNameEl) activeSheetNameEl.textContent = currentSheetName;
        
        // Ensure Virtual ID column is prepended if not present
        const hasVirtualId = !currentHeaders.includes('ID') && !currentHeaders.includes('id');
        const displayHeaders = hasVirtualId ? ['ID', ...currentHeaders] : currentHeaders;
        
        // Render dynamic table head
        leadsTableHead.innerHTML = '';
        const headerTr = document.createElement('tr');
        displayHeaders.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headerTr.appendChild(th);
        });
        
        const actionsTh = document.createElement('th');
        actionsTh.style.width = '100px';
        actionsTh.textContent = 'Actions';
        headerTr.appendChild(actionsTh);
        leadsTableHead.appendChild(headerTr);
        
        // Render rows
        leadsTableBody.innerHTML = '';
        const filterVal = leadSearchInput ? leadSearchInput.value.toLowerCase().trim() : '';
        const sourceFilterVal = document.getElementById('sourceFilterSelect') ? document.getElementById('sourceFilterSelect').value : '';
        
        // Map currentLeads to include their original indexes first, so search/sort doesn't break edit/delete target rows
        const leadsWithIndex = currentLeads.map((lead, index) => ({ lead, index }));

        const filteredLeadsWithIndex = leadsWithIndex.filter(({ lead }) => {
            // Search text filter
            let matchText = true;
            if (filterVal) {
                matchText = Object.values(lead).some(v => 
                    String(v).toLowerCase().includes(filterVal)
                );
            }
            
            // Source selector filter
            let matchSource = true;
            if (sourceFilterVal) {
                const leadSource = String(lead['Source'] || '').toLowerCase();
                matchSource = leadSource.includes(sourceFilterVal.toLowerCase());
            }
            
            return matchText && matchSource;
        });
        
        if (filteredLeadsWithIndex.length === 0) {
            leadsTableBody.innerHTML = `<tr><td colspan="${displayHeaders.length + 1}" class="empty-state" style="text-align: center; padding: 2.5rem; color: var(--clr-text-dim);">No matching leads found.</td></tr>`;
            return;
        }

        // Natural order preview representation (oldest at top)
        const sortedLeadsWithIndex = [...filteredLeadsWithIndex];

        let displayCounter = 1;
        sortedLeadsWithIndex.forEach(({ lead, index }) => {
            const tr = document.createElement('tr');
            
            displayHeaders.forEach(header => {
                const td = document.createElement('td');
                
                if (header === 'ID') {
                    // Lead ID cell: sequential serial number
                    td.textContent = String(displayCounter++).padStart(2, '0');
                    td.style.fontWeight = '700';
                    td.style.color = '#94A3B8';
                } else {
                    const val = lead[header] !== undefined ? lead[header] : '';
                    
                    if ((header === 'Business Name' || header === 'Owner / Page Name' || header === 'Lead Name') && val) {
                        td.innerHTML = `<span style="font-weight: 600; color: #fff;">${val}</span>`;
                    } else if (header.toLowerCase().includes('email') && val) {
                        td.innerHTML = `<a href="mailto:${val}" style="color: var(--clr-primary); font-weight: 500;">${val}</a>`;
                    } else if (header.toLowerCase().includes('website') && val) {
                        td.innerHTML = `<a href="${val.startsWith('http') ? val : 'https://' + val}" target="_blank" style="color: var(--clr-accent); font-weight: 500;"><i class="fa-solid fa-square-arrow-up-right"></i> Link</a>`;
                    } else if (header === 'OUTREACH' || header === 'Status') {
                        // Colored pill styles matching screenshot
                        let pillClass = 'status-pill-purple'; // Default: New
                        let labelText = 'New';
                        
                        const statusVal = String(val).toLowerCase();
                        if (statusVal === 'yes' || statusVal === 'contacted') {
                            pillClass = 'status-pill-blue';
                            labelText = 'Contacted';
                        } else if (statusVal === 'qualified') {
                            pillClass = 'status-pill-yellow';
                            labelText = 'Qualified';
                        } else if (statusVal === 'disqualified' || statusVal === 'failed') {
                            pillClass = 'status-pill-red';
                            labelText = 'Disqualified';
                        } else {
                            // Map simple spreadsheet values to pills
                            if (val === 'Yes') {
                                pillClass = 'status-pill-blue';
                                labelText = 'Contacted';
                            } else if (val === 'No' || val === '') {
                                pillClass = 'status-pill-purple';
                                labelText = 'New';
                            } else {
                                labelText = val;
                            }
                        }
                        
                        td.innerHTML = `<span class="${pillClass}">${labelText}</span>`;
                    } else if (header === 'Followup' || header === 'Date Created') {
                        // Format dynamic fallback created date
                        td.textContent = val || '2024-05-15 10:30:00';
                        td.style.color = '#94A3B8';
                        td.style.fontSize = '0.85rem';
                    } else {
                        td.textContent = val;
                    }
                }
                tr.appendChild(td);
            });
            
            // Actions
            const actionsTd = document.createElement('td');
            actionsTd.style.whiteSpace = 'nowrap';
            actionsTd.innerHTML = `
                <button class="table-action-btn edit-btn" data-index="${index}" title="Edit Details">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="table-action-btn delete-btn" data-index="${index}" title="Delete Row">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            tr.appendChild(actionsTd);
            leadsTableBody.appendChild(tr);
        });

        // Attach listeners
        leadsTableBody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditLeadModal(parseInt(btn.dataset.index)));
        });
        
        leadsTableBody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteLead(parseInt(btn.dataset.index)));
        });

        // Update charts and KPI tiles
        updateKPIs();
        updateCharts();
    }

    // Update dashboard KPI summary tiles dynamically
    function updateKPIs() {
        const totalLeadsEl = document.getElementById('kpiTotalLeads');
        const newTodayEl = document.getElementById('kpiNewToday');
        const convRateEl = document.getElementById('kpiConversionRate');
        const breakdownEl = document.getElementById('kpiSourceBreakdown');
        
        const count = currentLeads.length;
        if (totalLeadsEl) totalLeadsEl.textContent = `(${count})`;
        
        // Count New/No outreach leads
        const newCount = currentLeads.filter(l => {
            const val = String(l['OUTREACH'] || '').toLowerCase();
            return val === 'new' || val === 'no' || val === '';
        }).length;
        if (newTodayEl) newTodayEl.textContent = `(${newCount})`;
        
        // Count Qualified outreach leads
        const qualCount = currentLeads.filter(l => {
            const val = String(l['OUTREACH'] || '').toLowerCase();
            return val === 'qualified' || val === 'yes' || String(l['Priority'] || '').toLowerCase() === 'p1';
        }).length;
        const rate = count > 0 ? Math.round((qualCount / count) * 100) : 19;
        if (convRateEl) convRateEl.textContent = `(${rate}%)`;
        
        // Count Meta Ads percentage
        const metaCount = currentLeads.filter(l => {
            const val = String(l['Source'] || '').toLowerCase();
            return val.includes('meta') || val.includes('source') || val === '';
        }).length;
        const pct = count > 0 ? Math.round((metaCount / count) * 100) : 42;
        if (breakdownEl) breakdownEl.textContent = `${pct}%`;
    }

    // Render custom Chart.js charts
    function updateCharts() {
        // Source aggregation
        const sourceCounts = {};
        const dateCounts = {};
        
        currentLeads.forEach(lead => {
            const src = lead['Source'] || 'Organic';
            sourceCounts[src] = (sourceCounts[src] || 0) + 1;
            
            // Map dates (Followup or current fallback)
            const dateVal = lead['Followup'] || '2024-05-15';
            const dateStr = String(dateVal).split(' ')[0]; // YYYY-MM-DD
            dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
        });
        
        // Donut Chart
        const donutCtx = document.getElementById('sourceDonutChart');
        if (donutCtx) {
            const labels = Object.keys(sourceCounts);
            const data = Object.values(sourceCounts);
            
            if (donutChartInstance) {
                donutChartInstance.destroy();
            }
            
            donutChartInstance = new Chart(donutCtx, {
                type: 'doughnut',
                data: {
                    labels: labels.length ? labels : ['Meta Ads', 'Referral', 'Organic', 'Google Ads'],
                    datasets: [{
                        data: data.length ? data : [40, 30, 20, 10],
                        backgroundColor: ['#0A96FF', '#54D52B', '#FFD200', '#c084fc', '#fca5a5'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right',
                            labels: {
                                color: '#94A3B8',
                                font: { size: 10 }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
        
        // Line Chart
        const lineCtx = document.getElementById('leadsLineChart');
        if (lineCtx) {
            let sortedDates = Object.keys(dateCounts).sort();
            let dataPoints = sortedDates.map(d => dateCounts[d]);
            
            if (!sortedDates.length) {
                sortedDates = ['05/10', '05/11', '05/12', '05/13', '05/14', '05/15'];
                dataPoints = [5, 8, 4, 10, 7, 12];
            } else {
                sortedDates = sortedDates.map(d => {
                    const p = d.split('-');
                    if (p.length === 3) return p[1] + '/' + p[2];
                    return d;
                });
            }
            
            if (lineChartInstance) {
                lineChartInstance.destroy();
            }
            
            const gradient = lineCtx.getContext('2d').createLinearGradient(0, 0, 0, 150);
            gradient.addColorStop(0, 'rgba(10, 150, 255, 0.35)');
            gradient.addColorStop(1, 'rgba(10, 150, 255, 0)');
            
            lineChartInstance = new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        data: dataPoints,
                        borderColor: '#0A96FF',
                        borderWidth: 2,
                        fill: true,
                        backgroundColor: gradient,
                        tension: 0.4,
                        pointRadius: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94A3B8', font: { size: 9 } }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            ticks: { color: '#94A3B8', font: { size: 9 } }
                        }
                    }
                }
            });
        }
    }

    // Update Workbook sheet in memory and write to Hot Cache
    function updateWorkbookSheet() {
        if (!currentWorkbook || !currentSheetName) return;
        const ws = XLSX.utils.json_to_sheet(currentLeads, { header: currentHeaders });
        currentWorkbook.Sheets[currentSheetName] = ws;
        
        // Update local storage hot cache
        try {
            localStorage.setItem('cwm_sheet_data_' + currentSheetName, JSON.stringify(currentLeads));
            localStorage.setItem('cwm_sheet_headers_' + currentSheetName, JSON.stringify(currentHeaders));
            localStorage.setItem('cwm_sheet_names', JSON.stringify(currentWorkbook.SheetNames));
            localStorage.setItem('cwm_active_sheet', currentSheetName);
        } catch (e) {
            console.warn("Hot cache write failed:", e);
        }
        
        // Also save fallback in localStorage if in fallback mode
        if (currentFile === "cwm_local_leads_fallback") {
            localStorage.setItem('cwm_leads', JSON.stringify(currentLeads));
        }
    }

    // Write Workbook modifications back to the server Excel file
    async function saveWorkbookToDisk() {
        if (!currentWorkbook) return;
        setSyncStatus('syncing', 'Synchronizing changes to server database...');
        try {
            const wbout = XLSX.write(currentWorkbook, { bookType: 'xlsx', type: 'array' });
            const res = await fetch('/api/save?file=' + encodeURIComponent(currentFile), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream'
                },
                body: new Uint8Array(wbout)
            });
            
            if (!res.ok) throw new Error("Server rejected spreadsheet save");
            const data = await res.json();
            
            setSyncStatus('success', 'Excel synced! All modifications saved on server.');
            fetchUploadHistory(); // Refresh history log panel
        } catch (err) {
            console.error("Save workbook error:", err);
            setSyncStatus('danger', 'Server sync failed.');
            alert('Error: Could not save changes to server. Your additions/edits are currently held in memory. Download a copy to preserve.');
        }
    }

    // Handle spreadsheet upload via file input element
    async function uploadExcelFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.xlsx')) {
            alert("Error: Please select a valid Excel file (.xlsx) to upload.");
            return;
        }
        
        setSyncStatus('loading', 'Uploading spreadsheet to server...');
        const formData = new FormData();
        formData.append('excelFile', file);
        
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!res.ok) throw new Error("Upload failed on server");
            const data = await res.json();
            
            alert(data.message || "Excel spreadsheet uploaded successfully!");
            if (data.filename) {
                currentFile = data.filename;
            }
            await fetchFileList();
            await autoFetchExcel();
            fetchUploadHistory(); // Refresh history panel
        } catch (err) {
            console.error("Upload error:", err);
            setSyncStatus('danger', 'Upload failed.');
            alert("Error: Failed to upload spreadsheet to server.");
        } finally {
            e.target.value = ''; // Reset file input
        }
    }

    // Fetch and render Excel database modification logs (Styled with check/exclamation indicators)
    async function fetchUploadHistory() {
        const historyList = document.getElementById('uploadHistoryList');
        if (!historyList) return;
        
        try {
            const res = await fetch('/api/history');
            if (!res.ok) throw new Error("History fetch failed");
            const history = await res.json();
            
            if (history.length === 0) {
                historyList.innerHTML = '<div style="padding: 0.5rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.03);">No upload history logged yet.</div>';
                return;
            }
            
            historyList.innerHTML = [...history].reverse().map((h, i) => {
                const dateStr = new Date(h.timestamp).toLocaleString();
                // Demo mock formatting check: make second upload show alert just like screenshot
                const isError = h.action.toLowerCase().includes('error') || (i === 1 && h.action.toLowerCase().includes('upload'));
                const icon = isError 
                    ? `<i class="fa-solid fa-circle-exclamation history-icon-error"></i>` 
                    : `<i class="fa-solid fa-circle-check history-icon-check"></i>`;
                
                const actionLabel = isError 
                    ? `Manual data upload - Error on row 112 (invalid email)` 
                    : `${h.filename} ${currentSheetName || 'Sheet 1'} sync - Success (${currentLeads.length} rows)`;
                
                return `
                    <div class="history-entry">
                        <div class="history-entry-left">
                            ${icon}
                            <span>${actionLabel}</span>
                        </div>
                        <span style="font-size: 0.72rem; color: #64748B;">${dateStr}</span>
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.warn("Could not load history log:", e);
        }
    }

    // Fetch and render client booking scheduler records
    let currentBookings = [];
    async function fetchClientBookings() {
        const bookingsBody = document.getElementById('bookingsTableBody');
        if (!bookingsBody) return;
        
        try {
            const res = await fetch('/api/appointments');
            if (!res.ok) throw new Error("Appointments fetch failed");
            const bookings = await res.json();
            currentBookings = bookings;
            
            if (bookings.length === 0) {
                bookingsBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--clr-text-dim);">No client appointments booked yet.</td></tr>`;
                return;
            }
            
            bookingsBody.innerHTML = [...bookings].reverse().map(b => {
                const actionBtn = b.status !== 'Approved' 
                    ? `<button class="btn btn-outline btn-sm approve-client-btn" data-id="${b.id}" style="border-color: var(--clr-accent); color: var(--clr-accent);">Approve</button>`
                    : `<span style="color: var(--clr-accent);"><i class="fa-solid fa-check"></i> Approved</span>`;
                    
                return `
                    <tr>
                        <td><input type="checkbox" class="booking-checkbox" data-id="${b.id}"></td>
                        <td style="font-weight: 600; color: var(--clr-primary); font-size: 0.8rem;">${b.id}</td>
                        <td style="font-weight: 700;">${b.name}</td>
                        <td><a href="mailto:${b.email}" style="color: var(--clr-primary); text-decoration: underline;">${b.email}</a></td>
                        <td>${b.phone}</td>
                        <td style="font-weight: 500;">${b.company}</td>
                        <td style="font-weight: 600; color: var(--clr-accent);">${b.date}</td>
                        <td style="font-weight: 600; color: var(--clr-accent);">${b.time}</td>
                        <td><span class="excel-status-pill ${b.status === 'Approved' ? 'badge-success' : 'badge-warning'}" style="padding: 0.15rem 0.45rem; font-size: 0.7rem;">${b.status}</span></td>
                        <td>${actionBtn}</td>
                    </tr>
                `;
            }).join('');
            
            // Bind approve buttons
            document.querySelectorAll('.approve-client-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    try {
                        const originalHtml = e.target.innerHTML;
                        e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Approving...';
                        e.target.disabled = true;
                        
                        const appRes = await fetch('/api/appointments/approve/' + id, { method: 'POST' });
                        if (!appRes.ok) throw new Error("Approval failed");
                        
                        await fetchClientBookings();
                        alert('Client approved and notified successfully!');
                    } catch (err) {
                        alert('Failed to approve client.');
                        e.target.innerHTML = 'Approve';
                        e.target.disabled = false;
                    }
                });
            });
        } catch (e) {
            console.warn("Could not load client bookings:", e);
            bookingsBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: #EF4444;">Error: Could not retrieve appointments from server.</td></tr>`;
        }
    }
    
    // Export bookings to excel
    const exportBookingsBtn = document.getElementById('exportBookingsBtn');
    if (exportBookingsBtn) {
        exportBookingsBtn.addEventListener('click', () => {
            if (currentBookings.length === 0) {
                alert('No bookings to export.');
                return;
            }
            const ws = XLSX.utils.json_to_sheet(currentBookings);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Bookings");
            XLSX.writeFile(wb, "Client_Bookings_" + new Date().toISOString().slice(0,10) + ".xlsx");
        });
    }

    // --- Bookings Checkbox Selection & Deletion ---
    const selectAllBookings = document.getElementById('selectAllBookings');
    const bookingsTableBody = document.getElementById('bookingsTableBody');
    const deleteSelectedBookingsBtn = document.getElementById('deleteSelectedBookingsBtn');

    function updateDeleteBtnVisibility() {
        if (!deleteSelectedBookingsBtn) return;
        const checkedCount = document.querySelectorAll('.booking-checkbox:checked').length;
        if (checkedCount > 0) {
            deleteSelectedBookingsBtn.style.display = 'inline-block';
        } else {
            deleteSelectedBookingsBtn.style.display = 'none';
        }
    }

    if (selectAllBookings) {
        selectAllBookings.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.booking-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateDeleteBtnVisibility();
        });
    }

    if (bookingsTableBody) {
        bookingsTableBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('booking-checkbox')) {
                updateDeleteBtnVisibility();
                const total = document.querySelectorAll('.booking-checkbox').length;
                const checked = document.querySelectorAll('.booking-checkbox:checked').length;
                if (selectAllBookings) {
                    selectAllBookings.checked = (total > 0 && total === checked);
                }
            }
        });
    }

    if (deleteSelectedBookingsBtn) {
        deleteSelectedBookingsBtn.addEventListener('click', async () => {
            const checkedBoxes = document.querySelectorAll('.booking-checkbox:checked');
            if (checkedBoxes.length === 0) return;
            
            if (!confirm(`Are you sure you want to delete ${checkedBoxes.length} selected booking(s)?`)) return;

            const idsToDelete = Array.from(checkedBoxes).map(cb => cb.dataset.id);
            
            try {
                const res = await fetch('/api/appointments', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: idsToDelete })
                });
                
                const data = await res.json();
                if (res.ok && data.success) {
                    if (selectAllBookings) selectAllBookings.checked = false;
                    deleteSelectedBookingsBtn.style.display = 'none';
                    fetchClientBookings();
                } else {
                    alert(data.error || 'Failed to delete bookings');
                }
            } catch (err) {
                console.error(err);
                alert('Error deleting bookings');
            }
        });
    }

    // Initialize Dashboard data on page load
    async function checkStoredConnection() {
        loadCMSContent();       // Fetch headline content
        await fetchFileList();  // Fetch dropdown list
        await autoFetchExcel(); // Fetch spreadsheet leads
        fetchUploadHistory();   // Fetch database history log
        fetchClientBookings();  // Fetch appointment bookings
    }

    // Download copy fallback
    function downloadCopy() {
        if (!currentWorkbook) return;
        XLSX.writeFile(currentWorkbook, "FinalEVscrapsheet_Updated.xlsx");
    }

    // Add Sheet
    async function addSheet() {
        const sheetName = prompt("Enter name for the new sheet:");
        if (!sheetName) return;
        const name = sheetName.trim();
        if (!name) return;
        
        if (currentWorkbook.SheetNames.includes(name)) {
            alert("A sheet with this name already exists in this workbook!");
            return;
        }
        
        // Create new sheet copying current headers
        const ws = XLSX.utils.json_to_sheet([], { header: currentHeaders });
        XLSX.utils.book_append_sheet(currentWorkbook, ws, name);
        
        populateSheetSelector();
        selectSheet(name);
        
        await saveWorkbookToDisk();
        alert(`Sheet "${name}" created successfully and synced on server!`);
    }

    // Add Lead Modal Generator
    function generateAddLeadForm() {
        const body = document.getElementById('addLeadModalBody');
        if (!body) return;
        body.innerHTML = '';
        
        currentHeaders.forEach(h => {
            const group = document.createElement('div');
            group.className = 'form-group';
            if (h === 'Business Name' || h.toLowerCase().includes('link') || h.toLowerCase().includes('facebook') || h.toLowerCase().includes('instagram')) {
                group.className = 'form-group full-width';
            }
            
            const label = document.createElement('label');
            label.textContent = h;
            group.appendChild(label);
            
            if (h === 'Priority') {
                const select = document.createElement('select');
                select.className = 'form-control';
                select.name = h;
                select.innerHTML = `
                    <option value="P1">P1</option>
                    <option value="P2" selected>P2</option>
                    <option value="P3">P3</option>
                `;
                group.appendChild(select);
            } else if (h === 'OUTREACH') {
                const select = document.createElement('select');
                select.className = 'form-control';
                select.name = h;
                select.innerHTML = `
                    <option value="Yes">Yes</option>
                    <option value="No" selected>No</option>
                `;
                group.appendChild(select);
            } else if (h.toLowerCase().includes('email')) {
                const input = document.createElement('input');
                input.type = 'email';
                input.className = 'form-control';
                input.name = h;
                input.placeholder = 'Enter email';
                group.appendChild(input);
            } else if (h.toLowerCase().includes('phone')) {
                const input = document.createElement('input');
                input.type = 'tel';
                input.className = 'form-control';
                input.name = h;
                input.placeholder = 'Enter phone';
                group.appendChild(input);
            } else if (h.toLowerCase().includes('link') || h.toLowerCase().includes('website')) {
                const input = document.createElement('input');
                input.type = 'url';
                input.className = 'form-control';
                input.name = h;
                input.placeholder = 'https://...';
                group.appendChild(input);
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control';
                input.name = h;
                input.placeholder = `Enter ${h.toLowerCase()}`;
                group.appendChild(input);
            }
            
            body.appendChild(group);
        });
        
        document.getElementById('addLeadModal').classList.add('active');
    }

    // Edit Lead Modal Generator
    function openEditLeadModal(index) {
        const lead = currentLeads[index];
        if (!lead) return;
        
        document.getElementById('editLeadIndex').value = index;
        const body = document.getElementById('editLeadModalBody');
        if (!body) return;
        body.innerHTML = '';
        
        currentHeaders.forEach(h => {
            const group = document.createElement('div');
            group.className = 'form-group';
            if (h === 'Business Name' || h.toLowerCase().includes('link') || h.toLowerCase().includes('facebook') || h.toLowerCase().includes('instagram')) {
                group.className = 'form-group full-width';
            }
            
            const label = document.createElement('label');
            label.textContent = h;
            group.appendChild(label);
            
            const val = lead[h] !== undefined ? lead[h] : '';
            
            if (h === 'Priority') {
                const select = document.createElement('select');
                select.className = 'form-control';
                select.name = h;
                select.innerHTML = `
                    <option value="P1" ${val === 'P1' ? 'selected' : ''}>P1</option>
                    <option value="P2" ${val === 'P2' ? 'selected' : ''}>P2</option>
                    <option value="P3" ${val === 'P3' ? 'selected' : ''}>P3</option>
                `;
                group.appendChild(select);
            } else if (h === 'OUTREACH') {
                const select = document.createElement('select');
                select.className = 'form-control';
                select.name = h;
                select.innerHTML = `
                    <option value="Yes" ${val === 'Yes' ? 'selected' : ''}>Yes</option>
                    <option value="No" ${val === 'No' ? 'selected' : ''}>No</option>
                `;
                group.appendChild(select);
            } else if (h.toLowerCase().includes('email')) {
                const input = document.createElement('input');
                input.type = 'email';
                input.className = 'form-control';
                input.name = h;
                input.value = val;
                group.appendChild(input);
            } else if (h.toLowerCase().includes('phone')) {
                const input = document.createElement('input');
                input.type = 'tel';
                input.className = 'form-control';
                input.name = h;
                input.value = val;
                group.appendChild(input);
            } else if (h.toLowerCase().includes('link') || h.toLowerCase().includes('website')) {
                const input = document.createElement('input');
                input.type = 'url';
                input.className = 'form-control';
                input.name = h;
                input.value = val;
                group.appendChild(input);
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control';
                input.name = h;
                input.value = val;
                group.appendChild(input);
            }
            body.appendChild(group);
        });
        
        document.getElementById('editLeadModal').classList.add('active');
    }

    // Delete Row
    async function deleteLead(index) {
        const leadName = currentLeads[index]['Business Name'] || `Row ${index + 1}`;
        if (confirm(`Are you sure you want to delete the lead "${leadName}" from ${currentSheetName}?`)) {
            currentLeads.splice(index, 1);
            updateWorkbookSheet();
            renderLeads();
            
            await saveWorkbookToDisk();
        }
    }

    // Modal Close triggers
    function closeModals() {
        document.getElementById('addLeadModal').classList.remove('active');
        document.getElementById('editLeadModal').classList.remove('active');
    }

    // Setup Event Listeners for Dashboard controls
    if (sheetSelector) {
        sheetSelector.addEventListener('change', (e) => selectSheet(e.target.value));
    }
    
    if (addSheetBtn) {
        addSheetBtn.addEventListener('click', addSheet);
    }
    
    // Register Excel Upload listener
    const excelUploadInput = document.getElementById('excelUploadInput');
    if (excelUploadInput) {
        excelUploadInput.addEventListener('change', uploadExcelFile);
    }

    // Register Bookings Refresh listener
    const refreshBookingsBtn = document.getElementById('refreshBookingsBtn');
    if (refreshBookingsBtn) {
        refreshBookingsBtn.addEventListener('click', fetchClientBookings);
    }
    
    if (downloadExcelBtn) {
        downloadExcelBtn.addEventListener('click', downloadCopy);
    }
    
    if (openAddLeadModalBtn) {
        openAddLeadModalBtn.addEventListener('click', generateAddLeadForm);
    }
    
    // Search filter
    if (leadSearchInput) {
        leadSearchInput.addEventListener('input', renderLeads);
    }
    
    // Source filter selector
    const sourceFilterSelect = document.getElementById('sourceFilterSelect');
    if (sourceFilterSelect) {
        sourceFilterSelect.addEventListener('change', renderLeads);
    }
    
    // Global header quick search sync
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', (e) => {
            if (leadSearchInput) {
                leadSearchInput.value = e.target.value;
                renderLeads();
            }
        });
    }
    
    // Refresh button
    if (refreshLeadsBtn) {
        refreshLeadsBtn.addEventListener('click', async () => {
            const icon = refreshLeadsBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            
            await autoFetchExcel();
            fetchUploadHistory();
            
            setTimeout(() => {
                if (icon) icon.classList.remove('fa-spin');
            }, 600);
        });
    }

    // Modal Cancel Buttons & Backdrop Closes
    document.getElementById('closeAddLeadModal').addEventListener('click', closeModals);
    document.getElementById('cancelAddLead').addEventListener('click', closeModals);
    document.getElementById('closeEditLeadModal').addEventListener('click', closeModals);
    document.getElementById('cancelEditLead').addEventListener('click', closeModals);
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModals();
        }
    });

    // Add Lead Form Submit
    const addLeadForm = document.getElementById('addLeadForm');
    if (addLeadForm) {
        addLeadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addLeadForm);
            const newLead = {};
            currentHeaders.forEach(h => {
                newLead[h] = formData.get(h) || '';
            });
            
            currentLeads.push(newLead);
            updateWorkbookSheet();
            renderLeads();
            closeModals();
            addLeadForm.reset();
            
            await saveWorkbookToDisk();
        });
    }

    // Edit Lead Form Submit
    const editLeadForm = document.getElementById('editLeadForm');
    if (editLeadForm) {
        editLeadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const index = parseInt(document.getElementById('editLeadIndex').value);
            const formData = new FormData(editLeadForm);
            
            if (currentLeads[index]) {
                currentHeaders.forEach(h => {
                    currentLeads[index][h] = formData.get(h) || '';
                });
                
                updateWorkbookSheet();
                renderLeads();
                closeModals();
                
                await saveWorkbookToDisk();
            }
        });
    }

    // checkStoredConnection is initialized when showDashboard runs

    // --- Client Campaign Dashboard Elements ---

    // --- Client Campaign Portal (Demo Tab Selector) ---
    const clientProfiles = {
        ampere: {
            leads: "42 Leads",
            spend: "₹62,000",
            cpl: "₹1,476",
            roas: "18.4x",
            impressions: "124,500",
            qualified: "118 Sourced",
            booked: "42 Calls",
            signed: "3 Clients"
        },
        greencurrent: {
            leads: "38 Leads",
            spend: "₹48,000",
            cpl: "₹1,263",
            roas: "12.2x",
            impressions: "98,400",
            qualified: "92 Sourced",
            booked: "38 Calls",
            signed: "2 Clients"
        },
        voltline: {
            leads: "56 Leads",
            spend: "₹82,000",
            cpl: "₹1,464",
            roas: "15.6x",
            impressions: "164,200",
            qualified: "148 Sourced",
            booked: "56 Calls",
            signed: "4 Clients"
        }
    };

    function updateCampaignDashboard() {
        if (!clientSelector || !pcLeads) return;
        const profile = clientProfiles[clientSelector.value];
        
        if (profile) {
            pcLeads.textContent = profile.leads;
            pcSpend.textContent = profile.spend;
            pcCPL.textContent = profile.cpl;
            pcROAS.textContent = profile.roas;

            flImpressions.textContent = profile.impressions;
            flQualified.textContent = profile.qualified;
            flBooked.textContent = profile.booked;
            flSigned.textContent = profile.signed;
        }
    }

    if (clientSelector) {
        clientSelector.addEventListener('change', updateCampaignDashboard);
    }

    // Creative approval button trigger
    if (btnApprove1) {
        btnApprove1.addEventListener('click', () => {
            btnApprove1.innerHTML = `<i class="fa-solid fa-circle-check"></i> Approved ⚡`;
            btnApprove1.style.background = 'rgba(84, 213, 43, 0.2)';
            btnApprove1.style.borderColor = 'var(--clr-accent)';
            btnApprove1.style.color = 'var(--clr-accent)';
            btnApprove1.disabled = true;
        });
    }

    // --- CMS Editor (Homepage Headline Updates via server API) ---
    async function loadCMSContent() {
        if (!cmsTitleInput || !cmsSubtitleInput) return;
        try {
            const res = await fetch('/api/cms?v=' + Date.now());
            if (!res.ok) throw new Error("CMS fetch failed");
            const data = await res.json();
            cmsTitleInput.value = data.title || '';
            cmsSubtitleInput.value = data.subtitle || '';
        } catch (e) {
            console.warn("Could not retrieve server CMS headlines:", e);
        }
    }

    if (cmsForm) {
        cmsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newTitle = cmsTitleInput.value.trim();
            const newSubtitle = cmsSubtitleInput.value.trim();
            
            try {
                const res = await fetch('/api/cms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: newTitle,
                        subtitle: newSubtitle
                    })
                });
                
                if (!res.ok) throw new Error("CMS save failed");
                alert('Website content updated successfully on server! Open the main website to see the changes.');
            } catch (err) {
                console.error("CMS save error:", err);
                alert("Error: Failed to save CMS content on server.");
            }
        });
    }

    if (cmsResetBtn) {
        cmsResetBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset the website content back to its original default text?')) {
                try {
                    const res = await fetch('/api/cms', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ title: '', subtitle: '' })
                    });
                    if (!res.ok) throw new Error("CMS reset failed");
                    if (cmsTitleInput) cmsTitleInput.value = '';
                    if (cmsSubtitleInput) cmsSubtitleInput.value = '';
                    alert('Content reset on server. The main website will now show the default text.');
                } catch (e) {
                    alert("Error resetting CMS headlines on server.");
                }
            }
        });
    }

    // --- Authentication (Moved to end to prevent Temporal Dead Zone reference errors) ---
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
    }
});
