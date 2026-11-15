const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
const product = document.querySelector('#product');
const modelName = document.querySelector('#model-name');
const modelPhoto = document.querySelector('#model-photo');
const galleryStatus = document.querySelector('#gallery-status');
const manufacturerModel = document.querySelector('#manufacturer-model');
const manufacturerArticle = document.querySelector('#manufacturer-article');
const finishButtons = Array.from(document.querySelectorAll('[data-finish]'));
const viewButtons = Array.from(document.querySelectorAll('[data-view]'));
const finishInfo = document.querySelector('#finish-info');
const catalogVariants = new Map();
const catalogReferences = {
  jac: {
    url: 'https://www.ukk-tuning.ru/brands/jact6/t9-2021',
    front: 'JAC.T9.21.02',
    rear: 'JAC.T9.21.18',
  },
  haval: {
    url: 'https://uko-tuning.ru/brands/haval/h3-2024',
    front: 'HVH3.24.01',
    rear: 'HVH3.24.11',
  },
};

let selectedModel = tabs[0];
let selectedFinish = finishButtons[0];
let selectedView = viewButtons[0];

function updateGallery() {
  const model = selectedModel.dataset;
  const finish = selectedFinish.dataset.finish;
  const view = selectedView.dataset.view;
  const variant = catalogVariants.get([model.model, finish, view].join(':'));
  const source = variant?.image ?? ('assets/catalog-' + model.model + '-' + finish + '-' + view + '.webp');
  const position = view === 'front' ? 'переднего' : 'заднего';
  const material = finish === 'steel' ? 'зеркальная сталь' : 'чёрное покрытие';

  manufacturerArticle.textContent = catalogReferences[model.model][view];
  modelPhoto.alt = 'Трубчатая защита ' + position + ' бампера ' + model.label + ' — ' + material;
  if (modelPhoto.getAttribute('src') !== source) {
    modelPhoto.setAttribute('data-pending', '');
    galleryStatus.textContent = 'Загружаем изображение…';
    galleryStatus.hidden = false;
    modelPhoto.src = source;
  }
}

modelPhoto.addEventListener('load', () => {
  modelPhoto.removeAttribute('data-pending');
  galleryStatus.hidden = true;
});

function showGalleryError() {
  modelPhoto.setAttribute('data-pending', '');
  galleryStatus.textContent = 'Изображение недоступно. Фото изделия есть в каталоге ЮКО.';
  galleryStatus.hidden = false;
}

modelPhoto.addEventListener('error', showGalleryError);
if (modelPhoto.complete && modelPhoto.naturalWidth === 0) {
  showGalleryError();
}

function selectModel(tab) {
  selectedModel = tab;

  for (const item of tabs) {
    item.setAttribute('aria-selected', String(item === tab));
    item.tabIndex = item === tab ? 0 : -1;
  }

  product.setAttribute('aria-labelledby', tab.id);
  modelName.textContent = tab.dataset.label;
  manufacturerModel.href = catalogReferences[tab.dataset.model].url;
  updateGallery();
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectModel(tab));
  tab.addEventListener('keydown', (event) => {
    let nextIndex;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectModel(tabs[nextIndex]);
    tabs[nextIndex].focus();
  });
}

function setPressed(buttons, selection) {
  for (const button of buttons) {
    button.setAttribute('aria-pressed', String(button === selection));
  }
}

for (const button of finishButtons) {
  button.addEventListener('click', () => {
    selectedFinish = button;
    setPressed(finishButtons, button);
    finishInfo.textContent = button.dataset.detail;
    updateGallery();
  });
}

for (const button of viewButtons) {
  button.addEventListener('click', () => {
    selectedView = button;
    setPressed(viewButtons, button);
    updateGallery();
  });
}

const requestDialog = document.querySelector('#contact');
const requestForm = document.querySelector('#request');
const car = document.querySelector('#car');
const otherModel = document.querySelector('#other-model');
const otherModelLabel = document.querySelector('.form-other');
const year = document.querySelector('#car-year');
const formFinish = document.querySelector('#form-finish');
const message = document.querySelector('#message');
const result = document.querySelector('#result');
const requestText = document.querySelector('#request-text');
const formReference = document.querySelector('#form-reference');
const feedback = document.querySelector('#request-feedback');
const draftNote = document.querySelector('#draft-note');
const emailRequest = document.querySelector('#email-request');
const shareRequest = document.querySelector('#share-request');
const saveButton = document.querySelector('#save-request');
const saveFeedback = document.querySelector('#save-feedback');
const manufacturerEmail = 'info@ukk-tuning.ru';
let referenceText = '';
const yearsByModel = new Map();
let previousCar = car.value;
let requestOpener = null;
let referenceView = null;
let pendingRequest = null;

async function loadCatalog() {
  try {
    const response = await fetch('api/catalog');
    if (!response.ok) return;
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) return;

    const models = new Map(Array.from(car.options, (option) => [option.value, option]));
    const finishes = new Map(Array.from(formFinish.options, (option) => [option.value, option]));
    for (const row of rows) {
      const tab = tabs.find((item) => item.dataset.model === row.model);
      if (!tab || !catalogReferences[row.model]) continue;
      catalogVariants.set([row.model, row.finish, row.view].join(':'), row);
      catalogReferences[row.model][row.view] = row.article;
      catalogReferences[row.model].url = row.url;
      tab.dataset.label = row.name;
      tab.querySelector('strong').textContent = row.name;
      models.get(row.model).textContent = row.name;
      if (finishes.has(row.finish)) finishes.get(row.finish).textContent = row.finishName;
    }
    selectModel(selectedModel);
    saveButton.hidden = typeof crypto.randomUUID !== 'function';
  } catch {
    // The static version still supports browsing and preparing an email draft.
  }
}

function openRequest(opener) {
  requestOpener = opener;
  requestDialog.showModal();
  requestDialog.scrollTop = 0;
}

for (const button of document.querySelectorAll('[data-open-request]')) {
  button.addEventListener('click', () => openRequest(button));
}

document.querySelector('#close-request').addEventListener('click', () => requestDialog.close());
requestDialog.addEventListener('close', () => {
  requestOpener?.focus({ preventScroll: true });
  requestOpener = null;
});

function isOutsideRequest(event) {
  const bounds = requestDialog.getBoundingClientRect();
  return event.target === requestDialog
    && (event.clientX < bounds.left || event.clientX >= bounds.right
      || event.clientY < bounds.top || event.clientY >= bounds.bottom);
}

let startedOnBackdrop = false;
requestDialog.addEventListener('pointerdown', (event) => {
  startedOnBackdrop = isOutsideRequest(event);
});
requestDialog.addEventListener('click', (event) => {
  if (startedOnBackdrop && isOutsideRequest(event)) {
    requestDialog.close();
  }
  startedOnBackdrop = false;
});

function resetResult() {
  result.hidden = true;
  feedback.textContent = '';
  emailRequest.removeAttribute('href');
  pendingRequest = null;
  saveFeedback.textContent = '';
  saveButton.disabled = false;
}

function syncVehicle() {
  if (car.value !== previousCar) {
    yearsByModel.set(previousCar, year.value);
    year.value = yearsByModel.get(car.value) ?? '';
    previousCar = car.value;
  }

  const isOther = car.value === 'other';
  otherModelLabel.hidden = !isOther;
  otherModel.disabled = !isOther;
  otherModel.required = isOther;
  otherModel.setCustomValidity('');
}

function setReference(text, view = null) {
  referenceText = text;
  referenceView = view;
  formReference.textContent = text;
  formReference.hidden = !text;
}

syncVehicle();
window.addEventListener('pageshow', syncVehicle);
car.addEventListener('change', () => {
  syncVehicle();
  setReference('');
});
otherModel.addEventListener('input', () => otherModel.setCustomValidity(''));
requestForm.addEventListener('input', resetResult);

document.querySelector('#pick').addEventListener('click', (event) => {
  car.value = selectedModel.dataset.model;
  formFinish.value = selectedFinish.dataset.finish;
  const view = selectedView.dataset.view;
  const position = view === 'front' ? 'передняя защита' : 'задняя защита';
  const article = catalogReferences[car.value][view];
  setReference('Пример из каталога ЮКО — ' + position + ', ' + article + ' (полировка).', view);
  syncVehicle();
  resetResult();
  openRequest(event.currentTarget);
});

document.querySelector('#custom-pick').addEventListener('click', (event) => {
  if (car.value !== 'other') {
    formFinish.value = 'unsure';
  }
  car.value = 'other';
  setReference('');
  syncVehicle();
  resetResult();
  openRequest(event.currentTarget);
});

requestForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!result.hidden) return;

  const isOther = car.value === 'other';
  const model = isOther ? otherModel.value.trim() : car.selectedOptions[0].text;
  if (!model) {
    otherModel.setCustomValidity('Укажите марку и модель автомобиля.');
    otherModel.reportValidity();
    return;
  }

  const vehicle = year.value ? model + ', ' + year.value + ' г.' : model;
  const selectedFinishLabel = formFinish.selectedOptions[0].text;
  const note = message.value.trim();
  const introduction = isOther
    ? 'Здравствуйте! Хочу уточнить возможность изготовления защиты бамперов.'
    : 'Здравствуйте! Хочу уточнить цену и совместимость комплекта защиты бамперов.';
  const text = [
    introduction,
    'Автомобиль: ' + vehicle,
    'Исполнение: ' + selectedFinishLabel,
    referenceText,
    note ? 'Комментарий: ' + note : '',
    'Подскажите, пожалуйста, доступность, состав комплекта, стоимость и сроки.',
  ].filter(Boolean).join('\n');

  const subject = 'Запрос по защите бамперов для ' + model;
  const mailAddress = 'mailto:' + manufacturerEmail;
  const draft = mailAddress + '?subject=' + encodeURIComponent(subject)
    + '&body=' + encodeURIComponent(text.replace(/\n/g, '\r\n'));
  const fitsDraft = draft.length <= 1900;
  emailRequest.href = fitsDraft ? draft : mailAddress + '?subject=' + encodeURIComponent(subject);
  draftNote.hidden = fitsDraft;
  requestText.value = text;
  if (typeof crypto.randomUUID === 'function') {
    pendingRequest = {
      key: crypto.randomUUID(),
      model: car.value,
      customModel: isOther ? model : '',
      finish: formFinish.value,
      view: referenceView,
      year: year.value ? Number(year.value) : null,
      comment: note,
    };
  }
  result.hidden = false;
  requestText.focus();
});

saveButton.addEventListener('click', async () => {
  const payload = pendingRequest;
  if (!payload) return;
  saveButton.disabled = true;
  saveFeedback.textContent = 'Сохраняем запрос…';
  try {
    const response = await fetch('api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Не удалось сохранить запрос');
    const { id } = await response.json();
    if (pendingRequest === payload) saveFeedback.textContent = 'Запрос №' + id + ' сохранён в базе.';
  } catch {
    if (pendingRequest !== payload) return;
    saveButton.disabled = false;
    saveFeedback.textContent = 'Не удалось сохранить запрос. Попробуйте ещё раз.';
  }
});

function selectRequestText() {
  requestText.focus();
  requestText.select();
}

document.querySelector('#copy-request').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(requestText.value);
    feedback.textContent = 'Текст скопирован.';
  } catch {
    selectRequestText();
    feedback.textContent = 'Текст выделен. Скопируйте его через меню устройства.';
  }
});

shareRequest.hidden = typeof navigator.share !== 'function';
shareRequest.addEventListener('click', async () => {
  try {
    await navigator.share({ title: 'Запрос по защите бамперов', text: requestText.value });
  } catch (error) {
    if (error.name !== 'AbortError') {
      selectRequestText();
      feedback.textContent = 'Можно скопировать выделенный текст и отправить его вручную.';
    }
  }
});

document.querySelector('#prepare-request').disabled = false;
