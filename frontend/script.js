const form = document.querySelector('#applicationForm');
const message = document.querySelector('#formMessage');

const API_BASE_URL = window.API_BASE_URL || (
  window.location.protocol === 'file:'
    ? 'http://localhost:5000'
    : `${window.location.protocol}//${window.location.hostname}:5000`
);
const API_URL = `${API_BASE_URL}/api/applications`;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = 'Saving application...';
  message.classList.remove('error', 'success');

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.documentsReady = Boolean(payload.documentsReady);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Unable to save application.');
    }

    message.textContent = `Application saved. Reference: ${result.referenceNumber}`;
    message.classList.add('success');
    form.reset();
  } catch (error) {
    message.textContent = error.message === 'Failed to fetch'
      ? `Cannot reach the API at ${API_BASE_URL}. Please confirm the Flask backend is running.`
      : error.message;
    message.classList.add('error');
  }
});
