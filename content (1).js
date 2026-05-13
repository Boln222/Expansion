let originalTextStore = new Map();
let loadingOverlay = null;
let styleElement = null;
let focusMask = null;
let isMaskActive = false;
let currentSimplifiedContainer = null;

// Настройки специального шрифта
const FONT_SETTINGS = {
  fontFamily: '"OpenDyslexic", "Lexie Readable", "Comic Sans MS", "Comic Neue", sans-serif',
  letterSpacing: '0.8px',
  lineHeight: '1.6',
  color: '#1a3a5c',
  backgroundColor: '#fef9e8',
  fontWeight: '500'
};

// Создание маски ВОКРУГ адаптированного текста
function createFocusMaskAroundElement(element) {
  removeFocusMask();
  
  if (!element) return;
  
  // Сохраняем элемент, вокруг которого создана маска
  window.focusedElement = element;
  
  const padding = 16;
  
  const maskContainer = document.createElement('div');
  maskContainer.id = 'ai-focus-mask';
  maskContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9998;
    pointer-events: none;
  `;
  
  // Создаем 4 маски (верх, низ, лево, право)
  const topMask = document.createElement('div');
  topMask.className = 'mask-part top-mask';
  topMask.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    background: rgba(0, 0, 0, 0.85);
    pointer-events: none;
  `;
  
  const bottomMask = document.createElement('div');
  bottomMask.className = 'mask-part bottom-mask';
  bottomMask.style.cssText = `
    position: absolute;
    left: 0;
    width: 100%;
    background: rgba(0, 0, 0, 0.85);
    pointer-events: none;
  `;
  
  const leftMask = document.createElement('div');
  leftMask.className = 'mask-part left-mask';
  leftMask.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.85);
    pointer-events: none;
  `;
  
  const rightMask = document.createElement('div');
  rightMask.className = 'mask-part right-mask';
  rightMask.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.85);
    pointer-events: none;
  `;
  
  maskContainer.appendChild(topMask);
  maskContainer.appendChild(bottomMask);
  maskContainer.appendChild(leftMask);
  maskContainer.appendChild(rightMask);
  
  // Рамка вокруг текста
  const glowBorder = document.createElement('div');
  glowBorder.className = 'glow-border';
  glowBorder.style.cssText = `
    position: fixed;
    border: 3px solid #4CAF50;
    border-radius: 16px;
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.5), inset 0 0 10px rgba(76, 175, 80, 0.2);
    pointer-events: none;
    z-index: 10000;
    animation: focusPulse 1.5s ease-in-out infinite;
  `;
  
  // Кнопка закрытия
  const closeButton = document.createElement('div');
  closeButton.innerHTML = '✕';
  closeButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 44px;
    height: 44px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    z-index: 10001;
    font-family: system-ui, sans-serif;
    transition: all 0.2s ease;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.2);
    pointer-events: auto;
  `;
  closeButton.onmouseenter = () => {
    closeButton.style.background = 'rgba(220, 53, 69, 0.9)';
    closeButton.style.transform = 'scale(1.1)';
  };
  closeButton.onmouseleave = () => {
    closeButton.style.background = 'rgba(0, 0, 0, 0.8)';
    closeButton.style.transform = 'scale(1)';
  };
  closeButton.onclick = () => {
    removeFocusMask();
  };
  
  // Подсказка
  const hint = document.createElement('div');
  hint.innerHTML = '🔍 Фокус на упрощённом тексте • Нажмите ✕ для выхода';
  hint.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 40px;
    font-size: 13px;
    font-family: system-ui, sans-serif;
    z-index: 10001;
    backdrop-filter: blur(8px);
    pointer-events: none;
    white-space: nowrap;
    border: 1px solid rgba(255,255,255,0.2);
  `;
  
  maskContainer.appendChild(glowBorder);
  maskContainer.appendChild(closeButton);
  maskContainer.appendChild(hint);
  
  document.body.appendChild(maskContainer);
  focusMask = maskContainer;
  isMaskActive = true;
  
  // Функция обновления позиции маски
  function updateMaskPosition() {
    if (!isMaskActive || !window.focusedElement || !focusMask) return;
    
    const rect = window.focusedElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const elementTop = rect.top;
    const elementLeft = rect.left;
    const elementBottom = rect.bottom;
    const elementRight = rect.right;
    
    // Получаем части маски
    const masks = focusMask.querySelectorAll('.mask-part');
    const topMaskDiv = masks[0];
    const bottomMaskDiv = masks[1];
    const leftMaskDiv = masks[2];
    const rightMaskDiv = masks[3];
    const borderDiv = focusMask.querySelector('.glow-border');
    
    // Обновляем позиции
    if (topMaskDiv) {
      topMaskDiv.style.height = `${Math.max(0, elementTop - padding)}px`;
    }
    
    if (bottomMaskDiv) {
      bottomMaskDiv.style.top = `${elementBottom + padding}px`;
      bottomMaskDiv.style.height = `${Math.max(0, viewportHeight - (elementBottom + padding))}px`;
    }
    
    if (leftMaskDiv) {
      leftMaskDiv.style.top = `${Math.max(0, elementTop - padding)}px`;
      leftMaskDiv.style.left = '0';
      leftMaskDiv.style.width = `${Math.max(0, elementLeft - padding)}px`;
      leftMaskDiv.style.height = `${elementBottom - elementTop + (padding * 2)}px`;
    }
    
    if (rightMaskDiv) {
      rightMaskDiv.style.top = `${Math.max(0, elementTop - padding)}px`;
      rightMaskDiv.style.left = `${elementRight + padding}px`;
      rightMaskDiv.style.width = `${Math.max(0, viewportWidth - (elementRight + padding))}px`;
      rightMaskDiv.style.height = `${elementBottom - elementTop + (padding * 2)}px`;
    }
    
    if (borderDiv) {
      borderDiv.style.top = `${elementTop - padding - 2}px`;
      borderDiv.style.left = `${elementLeft - padding - 2}px`;
      borderDiv.style.width = `${elementRight - elementLeft + (padding * 2) + 4}px`;
      borderDiv.style.height = `${elementBottom - elementTop + (padding * 2) + 4}px`;
    }
  }
  
  // Сохраняем функцию обновления для использования в событиях
  window.updateMaskPosition = updateMaskPosition;
  
  // Вызываем обновление сразу
  updateMaskPosition();
  
  // Добавляем анимацию
  if (!document.getElementById('ai-focus-animation')) {
    const animStyle = document.createElement('style');
    animStyle.id = 'ai-focus-animation';
    animStyle.textContent = `
      @keyframes focusPulse {
        0% {
          border-color: #4CAF50;
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.5), inset 0 0 10px rgba(76, 175, 80, 0.2);
        }
        50% {
          border-color: #81C784;
          box-shadow: 0 0 0 10px rgba(76, 175, 80, 0), inset 0 0 15px rgba(76, 175, 80, 0.3);
        }
        100% {
          border-color: #4CAF50;
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0), inset 0 0 10px rgba(76, 175, 80, 0.2);
        }
      }
    `;
    document.head.appendChild(animStyle);
  }
}

// Удаление маски
function removeFocusMask() {
  if (focusMask) {
    focusMask.remove();
    focusMask = null;
  }
  isMaskActive = false;
  window.focusedElement = null;
  
  // Удаляем обработчики событий
  if (window.updateMaskPosition) {
    window.updateMaskPosition = null;
  }
}

// Стили для адаптированного текста
function addAccessibilityStyles() {
  if (styleElement) styleElement.remove();
  
  styleElement = document.createElement('style');
  styleElement.textContent = `
    .ai-simplified-text {
      font-family: ${FONT_SETTINGS.fontFamily} !important;
      letter-spacing: ${FONT_SETTINGS.letterSpacing} !important;
      line-height: ${FONT_SETTINGS.lineHeight} !important;
      color: ${FONT_SETTINGS.color} !important;
      background-color: ${FONT_SETTINGS.backgroundColor} !important;
      font-weight: ${FONT_SETTINGS.fontWeight} !important;
      padding: 12px 16px !important;
      border-radius: 12px !important;
      display: block !important;
    }
    
    .simplified-text-container {
      display: inline-block !important;
      background: ${FONT_SETTINGS.backgroundColor};
      border-radius: 12px;
      margin: 8px 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      position: relative;
      z-index: 10000;
    }
    
    .simplify-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px 12px 12px;
      background: ${FONT_SETTINGS.backgroundColor};
      border-radius: 0 0 12px 12px;
    }
    
    .simplify-level-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #e8f0fe;
      border-radius: 20px;
      padding: 5px 12px;
      font-size: 12px;
      color: #1a73e8;
      font-family: system-ui, sans-serif;
      font-weight: 500;
    }
    
    .simplify-undo-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f0f0f0;
      color: #333;
      border: 1px solid #ddd;
      padding: 5px 14px;
      border-radius: 20px;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
    }
    
    .simplify-undo-button:hover {
      background: #ffebee;
      border-color: #f44336;
      color: #d32f2f;
    }
  `;
  document.head.appendChild(styleElement);
}

// Замена текста
function replaceSelectedText(originalText, newText, level, levelName) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  
  let parentNode = range.commonAncestorContainer;
  if (parentNode.nodeType === Node.TEXT_NODE) {
    parentNode = parentNode.parentNode;
  }
  
  const originalHTML = parentNode.innerHTML;
  const key = Symbol('original');
  
  originalTextStore.set(key, {
    parentNode: parentNode,
    originalHTML: originalHTML,
    selectedText: originalText,
    level: level,
    levelName: levelName
  });
  
  range.deleteContents();
  
  const container = document.createElement('div');
  container.className = 'simplified-text-container';
  
  const textDiv = document.createElement('div');
  textDiv.className = 'ai-simplified-text';
  textDiv.textContent = newText;
  
  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'simplify-controls';
  
  const emoji = level === 1 ? '🔍' : (level === 2 ? '📖' : '⚡');
  const levelBadge = document.createElement('span');
  levelBadge.className = 'simplify-level-badge';
  levelBadge.innerHTML = `${emoji} ${levelName}`;
  
  const undoButton = document.createElement('button');
  undoButton.className = 'simplify-undo-button';
  undoButton.innerHTML = '↩️ Вернуть исходный текст';
  undoButton.onclick = (e) => {
    e.stopPropagation();
    if (originalTextStore.has(key)) {
      const originalData = originalTextStore.get(key);
      originalData.parentNode.innerHTML = originalData.originalHTML;
      originalTextStore.delete(key);
      removeFocusMask();
      showTemporaryMessage('↩️ Исходный текст восстановлен', '#28a745');
    }
  };
  
  controlsDiv.appendChild(levelBadge);
  controlsDiv.appendChild(undoButton);
  
  container.appendChild(textDiv);
  container.appendChild(controlsDiv);
  
  range.insertNode(container);
  container._originalKey = key;
  
  currentSimplifiedContainer = container;
  
  setTimeout(() => {
    createFocusMaskAroundElement(container);
  }, 50);
}

// НОВОЕ УВЕЛИЧЕННОЕ ОКНО ЗАГРУЗКИ В СТИЛЕ РАСШИРЕНИЯ
function createLoadingOverlay(message) {
  removeLoadingOverlay();
  
  // Создаем затемненный фон
  const backdrop = document.createElement('div');
  backdrop.id = 'ai-loading-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    z-index: 10002;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  `;
  
  // Создаем основное окно
  const modalWindow = document.createElement('div');
  modalWindow.style.cssText = `
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 24px;
    padding: 32px 40px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(125, 211, 252, 0.3);
    text-align: center;
    min-width: 320px;
    max-width: 420px;
    animation: slideUp 0.3s ease;
  `;
  
  // Анимированный логотип
  const logoContainer = document.createElement('div');
  logoContainer.style.cssText = `
    margin-bottom: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
  `;
  
  const logoPulse = document.createElement('div');
  logoPulse.style.cssText = `
    width: 16px;
    height: 16px;
    background: #7dd3fc;
    border-radius: 50%;
    box-shadow: 0 0 20px #7dd3fc;
    animation: pulse 1s ease-in-out infinite;
  `;
  
  const logoText = document.createElement('div');
  logoText.style.cssText = `
    font-family: 'OpenDyslexic', sans-serif;
    font-size: 20px;
    font-weight: bold;
    text-transform: uppercase;
    color: #7dd3fc;
    letter-spacing: 1px;
  `;
  logoText.textContent = 'AI адаптация';
  
  logoContainer.appendChild(logoPulse);
  logoContainer.appendChild(logoText);
  
  // Анимированный спиннер
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 60px;
    height: 60px;
    margin: 24px auto;
    border: 4px solid rgba(125, 211, 252, 0.2);
    border-top: 4px solid #7dd3fc;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;
  
  // Текст сообщения
  const messageText = document.createElement('div');
  messageText.style.cssText = `
    font-family: 'OpenDyslexic', sans-serif;
    color: #f1f5f9;
    font-size: 16px;
    margin: 20px 0 12px 0;
    letter-spacing: 0.8px;
    line-height: 1.5;
  `;
  messageText.textContent = message;
  
  // Подсказка
  const hint = document.createElement('div');
  hint.style.cssText = `
    font-family: 'OpenDyslexic', sans-serif;
    color: #94a3b8;
    font-size: 12px;
    margin-top: 16px;
    letter-spacing: 0.8px;
  `;
  hint.textContent = '⏳ Обработка занимает несколько секунд';
  
  modalWindow.appendChild(logoContainer);
  modalWindow.appendChild(spinner);
  modalWindow.appendChild(messageText);
  modalWindow.appendChild(hint);
  backdrop.appendChild(modalWindow);
  
  // Добавляем анимации
  const styleId = 'ai-loading-animations';
  if (!document.getElementById(styleId)) {
    const animStyle = document.createElement('style');
    animStyle.id = styleId;
    animStyle.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(animStyle);
  }
  
  document.body.appendChild(backdrop);
  loadingOverlay = backdrop;
}

function removeLoadingOverlay() {
  if (loadingOverlay) {
    loadingOverlay.remove();
    loadingOverlay = null;
  }
}

function showTemporaryMessage(message, bgColor) {
  const msgDiv = document.createElement('div');
  msgDiv.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    z-index: 10002;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  msgDiv.textContent = message;
  document.body.appendChild(msgDiv);
  setTimeout(() => {
    msgDiv.style.opacity = '0';
    setTimeout(() => msgDiv.remove(), 300);
  }, 3000);
}

function showSuccessMessage(message, level, levelName) {
  const emoji = level === 1 ? '🔍' : (level === 2 ? '📖' : '⚡');
  showTemporaryMessage(`${emoji} ${message} (${levelName})`, '#28a745');
}

function showErrorMessage(message) {
  showTemporaryMessage(message, '#dc3545');
}

// Анимация для сообщений
const animStyle = document.createElement('style');
animStyle.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(animStyle);

// Инициализация
addAccessibilityStyles();

// Отслеживание скролла и ресайза с обновлением позиции маски
window.addEventListener('scroll', () => {
  if (isMaskActive && window.updateMaskPosition) {
    window.updateMaskPosition();
  }
}, true); // Используем capture фазу для более точного отслеживания

window.addEventListener('resize', () => {
  if (isMaskActive && window.updateMaskPosition) {
    window.updateMaskPosition();
  }
});

// Также отслеживаем любые изменения, которые могут сдвинуть элемент
if (window.MutationObserver) {
  const observer = new MutationObserver(() => {
    if (isMaskActive && window.updateMaskPosition) {
      window.updateMaskPosition();
    }
  });
  observer.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: true,
    attributeFilter: ['style', 'class']
  });
}

// Закрытие маски по Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isMaskActive) {
    removeFocusMask();
  }
});

// Обработчик сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'showLoading':
      createLoadingOverlay(request.message);
      break;
    case 'showError':
      removeLoadingOverlay();
      showErrorMessage(request.message);
      break;
    case 'replaceText':
      removeLoadingOverlay();
      replaceSelectedText(request.originalText, request.simplifiedText, request.level, request.levelName);
      showSuccessMessage('✓ Текст упрощён', request.level, request.levelName);
      break;
  }
  return true;
});

console.log('AI Text Simplifier - Content script loaded');

// --- ЛОГИКА ФОКУС-ЛИНЕЙКИ ---
let readingRuler = null;
let isRulerActive = false;

function toggleReadingRuler() {
  if (isRulerActive) {
    if (readingRuler) readingRuler.remove();
    document.removeEventListener('mousemove', moveRuler);
    isRulerActive = false;
    showTemporaryMessage('📏 Фокус-линейка выключена', '#6c757d');
  } else {
    readingRuler = document.createElement('div');
    readingRuler.id = 'ai-reading-ruler';
    
    // Стили линейки (без blur)
    readingRuler.style.cssText = `
      position: fixed;
      left: 0;
      width: 100%;
      height: 30px; 
      background: linear-gradient(135deg, rgba(125, 211, 252, 0.3) 0%, rgba(125, 211, 252, 0.15) 100%);
      border-top: 2px solid #7dd3fc;
      border-bottom: 2px solid #7dd3fc;
      pointer-events: none;
      z-index: 100000;
      transition: top 0.05s ease-out;
      box-shadow: 0 0 15px rgba(125, 211, 252, 0.3);
    `;
    
    document.body.appendChild(readingRuler);
    document.addEventListener('mousemove', moveRuler);
    isRulerActive = true;
    showTemporaryMessage('📏 Фокус-линейка включена. Водите мышкой!', '#28a745');
  }
}

function moveRuler(e) {
  if (readingRuler) {
    // Центрируем линейку по курсору
    readingRuler.style.top = (e.clientY - 15) + 'px';
  }
}

// Слушатель сообщений для активации линейки
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleRuler') {
    toggleReadingRuler();
  }
});