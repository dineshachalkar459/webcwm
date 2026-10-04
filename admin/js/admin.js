document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adminLoginForm');

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const userId = document.getElementById('userId').value.trim();
      const password = document.getElementById('password').value.trim();

      if (userId === '12345' && password === '4599') {
        sessionStorage.setItem('adminLoggedIn', 'true');
        alert('Admin login successful.');
      } else {
        alert('Invalid User ID or Password.');
      }
    });
  }
});
