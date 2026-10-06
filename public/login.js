// Static workspace login.
document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const feedback = document.querySelector('#feedback');
  const button = document.querySelector('#submit');
  button.disabled = true;
  try {
    if (!window.portalAccess) throw new Error('Login is unavailable. Please refresh.');
    const valid = await window.portalAccess.login(
      document.querySelector('#email').value,
      document.querySelector('#password').value,
    );
    if (!valid) {
      document.querySelector('#password').value = '';
      throw new Error('Incorrect email or password.');
    }
    location.replace('/');
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
