// Mobile menu
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen);
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Smooth scrolling
const smoothLinks = document.querySelectorAll('a[href^="#"]');

smoothLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const targetId = link.getAttribute('href');
    const target = document.querySelector(targetId);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Contact form validation
const form = document.querySelector('.contact__form');
const messageBox = document.querySelector('.form__message');
const privacyError = document.querySelector('[data-error="privacidade"]');

function showError(input, text) {
  const errorEl = input.closest('.form__field')?.querySelector('.error');
  if (errorEl) {
    errorEl.textContent = text;
  }
}

function clearErrors() {
  document.querySelectorAll('.form__field .error').forEach((el) => {
    el.textContent = '';
  });
  if (privacyError) {
    privacyError.textContent = '';
  }
  if (messageBox) {
    messageBox.textContent = '';
    messageBox.classList.remove('success', 'error');
  }
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors();

    const nome = form.querySelector('#nome');
    const email = form.querySelector('#email');
    const mensagem = form.querySelector('#mensagem');
    const privacidade = form.querySelector('#privacidade');

    let valid = true;

    if (!nome.value.trim()) {
      showError(nome, 'Indique o seu nome.');
      valid = false;
    }

    if (!email.value.trim()) {
      showError(email, 'Indique o seu email.');
      valid = false;
    }

    if (!mensagem.value.trim()) {
      showError(mensagem, 'Escreva a sua mensagem.');
      valid = false;
    }

    if (!privacidade.checked) {
      if (privacyError) {
        privacyError.textContent = 'Aceite a política de privacidade.';
      }
      valid = false;
    }

    if (valid) {
      form.reset();
      if (messageBox) {
        messageBox.textContent = 'Mensagem enviada com sucesso. Entraremos em contacto em breve.';
        messageBox.classList.add('success');
      }
    } else if (messageBox) {
      messageBox.textContent = 'Revise os campos em falta.';
      messageBox.classList.add('error');
    }
  });
}

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}
