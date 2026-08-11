const form = document.querySelector('#applicationForm');
const message = document.querySelector('#formMessage');
const API_URL = 'http://localhost:5000/api/applications';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = 'Saving application...';

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
    form.reset();
  } catch (error) {
    message.textContent = error.message;
  }
});
