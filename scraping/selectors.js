export const LOGIN_URL = 'https://www.max.co.il/login';

export const SELECTORS = {
  loginFormReady: 'span[_ngcontent-my-app-id-c171=""]',
  passwordTab: 'span[_ngcontent-my-app-id-c171=""]',
  usernameField: '[formcontrolname="username"]',
  passwordField: '[formcontrolname="password"]',
  loginButton: 'button[_ngcontent-my-app-id-c166=""]',
  dashboard: '.only-card-wrapper > :first-child',
  closePopup: '#close-popup',
  downloadExcel: 'span.download-excel',
};

const CARD_BASE = 'div.card.card-box.card-box-url.ng-star-inserted[_ngcontent-my-app-id-c129][appgtm]';

export const getCardSelector = (isAdiCard) =>
  isAdiCard ? `${CARD_BASE}:nth-child(3)` : `${CARD_BASE}:nth-child(1)`;
