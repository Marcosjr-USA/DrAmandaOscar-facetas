const video=document.querySelector('video');
document.addEventListener('visibilitychange',()=>{if(!video)return;document.hidden?video.pause():video.play().catch(()=>{});});

// URL /exec da implantação do Apps Script vinculado à planilha. Nunca use a URL /dev.
// É pública no navegador; não coloque senhas ou tokens aqui.
const LEAD_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzdRCC89VHHfkNgQXwEEP_5b_XhxBhBvf2qDg2BdTEN8NdW9JKBD7JjSSSfavlytjv5IA/exec';
const modal = document.querySelector('#exit-modal');
const panel = modal?.querySelector('.exit-panel');
const form = document.querySelector('#lead-form');
const status = document.querySelector('#form-status');

// Meta Pixel: não carrega nem envia PageView antes do aceite explícito.
// Não enviar nome, telefone, bairro ou expectativa financeira ao Pixel.
const META_PIXEL_ID = '846286085159032';
const consentBanner = document.querySelector('#consent-banner');
const consentKey = 'amanda-marketing-consent-v2';
let metaLoaded = false;
let googleLoaded = false;
function loadMetaPixel() {
  if (metaLoaded) return;
  metaLoaded = true;
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
  (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', META_PIXEL_ID);
  fbq('track', 'PageView');
}
function loadGoogleAnalytics() {
  if (googleLoaded) return;
  googleLoaded = true;
  const googleTagId = 'G-TT9HKR2DH5';
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', googleTagId);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleTagId)}`;
  document.head.appendChild(script);
}
function setTrackingConsent(accepted) {
  try { localStorage.setItem(consentKey, accepted ? 'accepted' : 'rejected'); } catch (_) { /* storage indisponível */ }
  consentBanner.hidden = true;
  document.body.classList.remove('consent-visible');
  if (accepted) { loadMetaPixel(); loadGoogleAnalytics(); }
  else if (metaLoaded || googleLoaded) location.reload();
}
let savedConsent;
try { savedConsent = localStorage.getItem(consentKey); } catch (_) { /* storage indisponível */ }
if (savedConsent === 'accepted') { loadMetaPixel(); loadGoogleAnalytics(); }
else if (consentBanner && savedConsent !== 'rejected') {
  // Mostra após a primeira leitura da página; permanece sem bloquear o conteúdo.
  window.setTimeout(() => {
    let currentChoice;
    try { currentChoice = localStorage.getItem(consentKey); } catch (_) { /* storage indisponível */ }
    if (!currentChoice) { consentBanner.hidden = false; document.body.classList.add('consent-visible'); }
  }, 2500);
}
document.querySelector('#accept-tracking')?.addEventListener('click', () => setTrackingConsent(true));
document.querySelector('#reject-tracking')?.addEventListener('click', () => setTrackingConsent(false));
document.querySelector('#privacy-settings')?.addEventListener('click', () => { consentBanner.hidden = false; document.body.classList.add('consent-visible'); });
let modalShown = false;
let previousFocus;

function openExitModal() {
  if (!modal || modalShown) return;
  modalShown = true;
  previousFocus = document.activeElement;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  panel.focus();
}
function closeExitModal() {
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  previousFocus?.focus?.();
}
modal?.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeExitModal));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeExitModal();
  if (event.key !== 'Tab' || modal?.hidden) return;
  const items = [...panel.querySelectorAll('button, input, select, a[href]')].filter(el => !el.disabled);
  if (!items.length) return;
  if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
  else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
});

// Desktop: sair pela borda superior. Mobile: uma única tentativa de voltar;
// na próxima tentativa, a navegação segue normalmente, sem prender o visitante.
document.addEventListener('mouseout', event => {
  if (matchMedia('(pointer:fine)').matches && event.clientY <= 0 && !event.relatedTarget) openExitModal();
});
if (matchMedia('(pointer:coarse)').matches && history.pushState) {
  history.pushState({ exitOffer: true }, '', location.href);
  window.addEventListener('popstate', () => openExitModal(), { once: true });
}

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (form.elements.website.value) {
    status.textContent = 'Recebemos seu contato.';
    return;
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(LEAD_WEBHOOK_URL)) {
    status.textContent = 'Cadastro indisponível no momento. Use o botão de WhatsApp ou agendamento da página.';
    return;
  }
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  status.textContent = 'Enviando...';
  form.elements.origem.value = location.href;
  const allowMeasurement = form.elements.medicao.checked;
  try { localStorage.setItem(consentKey, allowMeasurement ? 'accepted' : 'rejected'); } catch (_) { /* storage indisponível */ }
  if (allowMeasurement) { loadMetaPixel(); loadGoogleAnalytics(); }
  try {
    // Resposta opaca: este envio não permite confirmar a gravação na planilha.
    await fetch(LEAD_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: new FormData(form)
    });
    status.textContent = 'Seu cadastro foi enviado. Nossa equipe falará com você em breve.';
    form.reset();
    window.setTimeout(closeExitModal, 5000);
  } catch (error) {
    status.textContent = 'Não foi possível enviar. Tente novamente ou fale pelo WhatsApp.';
    console.error('Falha no envio do formulário:', error);
  } finally {
    button.disabled = false;
  }
});
