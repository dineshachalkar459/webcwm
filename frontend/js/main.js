document.addEventListener('DOMContentLoaded', () => {
  const budgetSlider = document.getElementById('budgetSlider');
  const ticketSlider = document.getElementById('ticketSlider');
  const closeSlider = document.getElementById('closeSlider');

  const budgetLabel = document.getElementById('budgetLabel');
  const ticketLabel = document.getElementById('ticketLabel');
  const closeLabel = document.getElementById('closeLabel');
  const resLeads = document.getElementById('resLeads');
  const resRevenue = document.getElementById('resRevenue');

  const formatINR = (value) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);

  const calculateROI = () => {
    if (!budgetSlider || !ticketSlider || !closeSlider) return;

    const budget = Number(budgetSlider.value);
    const ticket = Number(ticketSlider.value);
    const closeRate = Number(closeSlider.value) / 100;

    budgetLabel.textContent = formatINR(budget);
    ticketLabel.textContent = formatINR(ticket);
    closeLabel.textContent = `${closeSlider.value}%`;

    const estimatedCPL = 1200;
    const leadsCount = Math.round(budget / estimatedCPL);
    const lostRevenue = Math.round(leadsCount * closeRate * ticket);

    resLeads.textContent = `${leadsCount} Leads`;
    resRevenue.textContent = formatINR(lostRevenue);
  };

  if (budgetSlider && ticketSlider && closeSlider) {
    [budgetSlider, ticketSlider, closeSlider].forEach((input) => input.addEventListener('input', calculateROI));
    calculateROI();
  }

  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (event) => {
      event.preventDefault();
      alert('Appointment request received. We will contact you shortly.');
      bookingForm.reset();
    });
  }
});
