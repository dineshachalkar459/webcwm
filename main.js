document.addEventListener('DOMContentLoaded', () => {
    // Fetch CMS Content from server on startup
    fetch('/api/cms?v=' + Date.now())
        .then(res => res.json())
        .then(data => {
            const cmsTitle = document.getElementById('cms-hero-title');
            const cmsSubtitle = document.getElementById('cms-hero-subtitle');
            if (cmsTitle && data.title) {
                cmsTitle.innerHTML = data.title;
            }
            if (cmsSubtitle && data.subtitle) {
                cmsSubtitle.textContent = data.subtitle;
            }
        })
        .catch(err => console.warn('Could not fetch CMS data:', err));

    // Sticky Navbar
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    // Intersection Observer for Scroll Animations
    const animElements = document.querySelectorAll('.section-header, .glass-card, .timeline-step, .case-card, .hero-content, .hero-visual');
    
    animElements.forEach(el => el.classList.add('fade-in'));

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, ob) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                ob.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animElements.forEach(sec => {
        observer.observe(sec);
    });

    // --- ROI Niche Calculator Logic ---
    const budgetSlider = document.getElementById('budgetSlider');
    const ticketSlider = document.getElementById('ticketSlider');
    const closeSlider = document.getElementById('closeSlider');
    
    const budgetLabel = document.getElementById('budgetLabel');
    const ticketLabel = document.getElementById('ticketLabel');
    const closeLabel = document.getElementById('closeLabel');
    
    const resLeads = document.getElementById('resLeads');
    const resRevenue = document.getElementById('resRevenue');

    function formatINR(val) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    }

    function calculateROI() {
        if (!budgetSlider || !ticketSlider || !closeSlider) return;

        const budget = parseInt(budgetSlider.value);
        const ticket = parseInt(ticketSlider.value);
        const closeRate = parseInt(closeSlider.value) / 100;

        // Display updates
        budgetLabel.textContent = formatINR(budget);
        ticketLabel.textContent = formatINR(ticket);
        closeLabel.textContent = `${closeSlider.value}%`;

        // Sourced Lead Calculation: CPL is estimated around Rs 1,200 for qualified contractor leads
        const estimatedCPL = 1200;
        const leadsCount = Math.round(budget / estimatedCPL);
        
        // Sourced Client Sells
        const clientsCount = leadsCount * closeRate;
        
        // Missed Revenue potential
        const lostRevenueVal = Math.round(clientsCount * ticket);

        resLeads.textContent = `${leadsCount} Qualified Leads`;
        resRevenue.textContent = formatINR(lostRevenueVal);
    }

    if (budgetSlider && ticketSlider && closeSlider) {
        budgetSlider.addEventListener('input', calculateROI);
        ticketSlider.addEventListener('input', calculateROI);
        closeSlider.addEventListener('input', calculateROI);
        // Run once initially
        calculateROI();
    }

    // --- Interactive Schedular Calendar (August 2026) ---
    const calendarGrid = document.getElementById('calendarGrid');
    const timeSlotPane = document.getElementById('timeSlotPane');
    const selectedDateLabel = document.getElementById('selectedDateLabel');
    const slotsGrid = document.getElementById('slotsGrid');
    
    let selectedDate = '';
    let selectedSlot = '';

    // August 2026: Aug 1 starts on a Saturday
    // Week starts Sunday. Monday=2nd, Tuesday=3rd etc.
    // In metadata, today is August 9, 2026 (Sunday)
    const todayDay = 9;
    const totalDaysInMonth = 31;
    const leadingEmptyCells = 6; // Sunday-Friday leading empty cells

    function renderCalendar() {
        if (!calendarGrid) return;
        
        // Remove old days
        const days = calendarGrid.querySelectorAll('.cal-day');
        days.forEach(d => d.remove());

        // Render empty cells
        for (let i = 0; i < leadingEmptyCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('cal-day', 'disabled');
            calendarGrid.appendChild(emptyCell);
        }

        // Render August days
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('cal-day');
            dayCell.textContent = day;

            // Date validation: past dates (before Aug 9, 2026) are disabled
            if (day < todayDay) {
                dayCell.classList.add('disabled');
            } else {
                dayCell.classList.add('available');
                dayCell.addEventListener('click', () => {
                    // Remove selected state from other days
                    calendarGrid.querySelectorAll('.cal-day.selected').forEach(cell => {
                        cell.classList.remove('selected');
                    });
                    
                    dayCell.classList.add('selected');
                    selectedDate = `August ${day}, 2026`;
                    selectedDateLabel.textContent = selectedDate;
                    
                    // Show slot selection pane
                    timeSlotPane.style.display = 'block';
                    selectedSlot = ''; // Reset slot selection
                    slotsGrid.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));
                });
            }
            calendarGrid.appendChild(dayCell);
        }
    }

    // Handle Time Slot Click
    if (slotsGrid) {
        const slots = slotsGrid.querySelectorAll('.time-slot');
        slots.forEach(slot => {
            slot.addEventListener('click', () => {
                slots.forEach(s => s.classList.remove('selected'));
                slot.classList.add('selected');
                selectedSlot = slot.dataset.time;
            });
        });
    }

    renderCalendar();

    // --- Simulated Confirmation Overlay Flow ---
    const successOverlay = document.getElementById('successOverlay');
    const mailToAddress = document.getElementById('mailToAddress');
    const mailDate = document.getElementById('mailDate');
    const mailClientName = document.getElementById('mailClientName');
    const mailMeetingDate = document.getElementById('mailMeetingDate');
    const mailMeetingTime = document.getElementById('mailMeetingTime');
    const successHeadline = document.getElementById('successHeadline');
    
    const bookingForm = document.getElementById('bookingForm');
    const magnetForm = document.getElementById('magnetForm');
    
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');

    function showSimulatedEmail(name, email, subject, bodyHtml, dateStr, timeStr) {
        if (!successOverlay) return;
        
        // Update header details
        mailClientName.textContent = name;
        mailToAddress.textContent = email;
        mailDate.textContent = new Date().toLocaleString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        // Set subject/body
        const emailMockup = successOverlay.querySelector('.email-mockup');
        const ehSubject = emailMockup.querySelector('.eh-row:last-child');
        ehSubject.innerHTML = `<span>Subject:</span> ${subject}`;

        const emailBody = emailMockup.querySelector('.email-body');
        emailBody.innerHTML = bodyHtml;

        // Show overlay
        successOverlay.style.display = 'flex';
    }

    // Booking Form Submit Handler
    if (bookingForm) {
        const submitBtn = bookingForm.closest('.booking-grid').querySelector('button[type="submit"]');
        
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                // Trigger form check
                if (!bookingForm.checkValidity()) {
                    bookingForm.reportValidity();
                    return;
                }
                
                e.preventDefault();

                if (!selectedDate || !selectedSlot) {
                    alert('Please select an appointment Date and Time slot from the calendar.');
                    return;
                }

                const nameVal = document.getElementById('bookName').value;
                const emailVal = document.getElementById('bookEmail').value;
                const companyVal = document.getElementById('bookCompany').value;
                const phoneVal = document.getElementById('bookPhone').value;
                const verticalVal = document.getElementById('bookVertical').value;
                const budgetVal = document.getElementById('bookBudget').value;

                // Create lead
                const newLead = {
                    id: Date.now(),
                    Name: nameVal,
                    Company: companyVal,
                    Email: emailVal,
                    Phone: phoneVal,
                    Vertical: verticalVal,
                    Budget: budgetVal,
                    AppointmentDate: selectedDate,
                    AppointmentTime: selectedSlot,
                    Status: 'New',
                    Source: 'Discovery Call Booking',
                    Date: new Date().toLocaleString()
                };

                // Send to backend server database (triggers nodemailer confirmation)
                fetch('/api/appointments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: nameVal,
                        email: emailVal,
                        phone: phoneVal,
                        company: companyVal,
                        date: selectedDate,
                        time: selectedSlot
                    })
                })
                .then(res => res.json())
                .then(data => console.log('Appointment synchronized on server:', data))
                .catch(err => console.error('Failed to sync appointment with server:', err));

                // Retrieve and push in local fallback
                let leads = [];
                const storedLeads = localStorage.getItem('cwm_leads');
                if (storedLeads) {
                    try {
                        leads = JSON.parse(storedLeads);
                    } catch (err) { leads = []; }
                }
                leads.push(newLead);
                localStorage.setItem('cwm_leads', JSON.stringify(leads));

                // Success Headline
                successHeadline.textContent = "Appointment Call Confirmed! ⚡";

                const emailBodyHtml = `
                    <p>Hi <strong>${nameVal}</strong>,</p>
                    <br>
                    <p>Your 15-Minute EV Strategy Audit call is confirmed. I've reserved time in my schedule for us to review your market space.</p>
                    <br>
                    <p>📅 <strong>Scheduled Date:</strong> <span class="text-yellow">${selectedDate}</span></p>
                    <p>⏰ <strong>Time Slot:</strong> <span class="text-yellow">${selectedSlot}</span> (IST/Local)</p>
                    <p>🏢 <strong>Company:</strong> ${companyVal}</p>
                    <br>
                    <p><strong>Next Steps:</strong></p>
                    <p>Our intern is initializing a pre-call database check for EV charger installers in your service territory. Akash Patale will walk through this analysis on our call to show where you are losing referral revenues.</p>
                    <br>
                    <p>Talk soon,</p>
                    <p><strong>Akash Patale</strong><br>Founder, ChargeWave Media</p>
                `;

                // Display Email
                showSimulatedEmail(
                    nameVal, 
                    emailVal, 
                    "⚡ Confirmed: 15-Min EV Installer Scaling Strategy Audit", 
                    emailBodyHtml, 
                    selectedDate, 
                    selectedSlot
                );

                // Reset
                bookingForm.reset();
                selectedDate = '';
                selectedSlot = '';
                timeSlotPane.style.display = 'none';
                calendarGrid.querySelectorAll('.cal-day.selected').forEach(c => c.classList.remove('selected'));
            });
        }
    }

    // Lead Magnet Form Submit Handler
    if (magnetForm) {
        magnetForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nameVal = document.getElementById('magName').value;
            const companyVal = document.getElementById('magCompany').value;
            const emailVal = document.getElementById('magEmail').value;
            const sizeVal = document.getElementById('magSize').value;

            // Create lead
            const newLead = {
                id: Date.now(),
                Name: nameVal,
                Company: companyVal,
                Email: emailVal,
                Phone: 'N/A (Lead Magnet)',
                Vertical: `Size: ${sizeVal}`,
                Budget: 'Downloaded Report',
                AppointmentDate: 'N/A',
                AppointmentTime: 'N/A',
                Status: 'Lead Magnet Download',
                Source: 'Benchmarks 2025 PDF',
                Date: new Date().toLocaleString()
            };

            // Retrieve and push
            let leads = [];
            const storedLeads = localStorage.getItem('cwm_leads');
            if (storedLeads) {
                try {
                    leads = JSON.parse(storedLeads);
                } catch (err) { leads = []; }
            }
            leads.push(newLead);
            localStorage.setItem('cwm_leads', JSON.stringify(leads));

            // Success Headline
            successHeadline.textContent = "Report Download Sent! 📥";

            const emailBodyHtml = `
                <p>Hi <strong>${nameVal}</strong>,</p>
                <br>
                <p>Thank you for requesting the <strong>EV Installer Lead Gen Benchmarks 2025 Report</strong>.</p>
                <br>
                <p>Here is your direct access download link:</p>
                <a href="#" class="email-btn-mock"><i class="fa-solid fa-file-pdf"></i> Download Benchmarks PDF (6.4 MB)</a>
                <br>
                <br>
                <p><strong>What is inside:</strong></p>
                <ul>
                    <li>Standard Meta ad CPL and CTR benchmarks for contractors</li>
                    <li>SOP guides for lead screening (how to check site ownership and budgets)</li>
                    <li>Case studies analyzing 18.4x ROAS campaign parameters</li>
                </ul>
                <br>
                <p>Best regards,</p>
                <p><strong>Akash Patale</strong><br>Founder, ChargeWave Media</p>
            `;

            // Display Email
            showSimulatedEmail(
                nameVal, 
                emailVal, 
                "📥 Sourced: Your EV Lead Gen Benchmarks 2025 Report PDF", 
                emailBodyHtml, 
                'N/A', 
                'N/A'
            );

            magnetForm.reset();
        });
    }

    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', () => {
            successOverlay.style.display = 'none';
        });
    }

    // --- Homepage Staff Modal entrance ---
    const openLoginModal = document.getElementById('openLoginModal');
    const loginModal = document.getElementById('loginModal');
    const closeLoginModal = document.getElementById('closeLoginModal');
    const indexLoginForm = document.getElementById('indexLoginForm');
    
    if (openLoginModal && loginModal) {
        openLoginModal.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'flex';
        });
    }
    
    if (closeLoginModal && loginModal) {
        closeLoginModal.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }

    if (indexLoginForm) {
        indexLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const idVal = document.getElementById('modalUserId').value;
            const pwdVal = document.getElementById('modalPassword').value;

            if (idVal === '12345' && pwdVal === '4599') {
                sessionStorage.setItem('adminLoggedIn', 'true');
                if (window.location.protocol === 'file:') {
                    window.location.href = 'http://127.0.0.1:3000/admin.html';
                } else {
                    window.location.href = 'admin.html';
                }
            } else {
                alert('Invalid Credentials. Access Denied.');
            }
        });
    }
});
