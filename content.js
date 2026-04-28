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
  
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  
  const padding = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const elementTop = rect.top;
  const elementLeft = rect.left;
  const elementBottom = rect.bottom;
  const elementRight = rect.right;
  
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
  
  // Верхняя маска
  const topMask = document.createElement('div');
  topMask.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: ${Math.max(0, elementTop - padding)}px;
    background: rgba(0, 0, 0, 0.85);
    pointer-events: none;
  `;
  
  // Нижняя маска
  const bottomMask = document.createElement('div');
  bottomMask.style.cssText = `
    position: absolute;
    top: ${elementBottom + padding}px;
    left: 0;
    width: 100%;
    height: ${Math.max(0, viewportHeight - (elementBottom + padding))}px;
    background: rgba(0, 0, 0, 0.85);
    pointer-events: none;
  `;
  
  // Левая маска
  const leftMask = document.createElement('div');
  leftMask.style.cssText = `
    position: absolute;
    top: ${Math.max(0, elementTop - padding)}px;
    left: 0;
    width: ${Math.max(0, elementLeft - padding)}px;
    height: ${elementBottom - elementTop + (padding * 2)}px;
    background: rgba(0, 0, 0, 0.85);
    pointer-events: none;
  `;
  
  // Правая маска
  const rightMask = document.createElement('div');
  rightMask.style.cssText = `
    position: absolute;
    top: ${Math.max(0, elementTop - padding)}px;
    left: ${elementRight + padding}px;
    width: ${Math.max(0, viewportWidth - (elementRight + padding))}px;
    height: ${elementBottom - elementTop + (padding * 2)}px;
    background: rgba(0, 0, 0, 0.85);
    pointer-events: none;
  `;
  
  maskContainer.appendChild(topMask);
  maskContainer.appendChild(bottomMask);
  maskContainer.appendChild(leftMask);
  maskContainer.appendChild(rightMask);
  
  // Рамка вокруг текста
  const glowBorder = document.createElement('div');
  glowBorder.style.cssText = `
    position: fixed;
    top: ${elementTop - padding - 2}px;
    left: ${elementLeft - padding - 2}px;
    width: ${elementRight - elementLeft + (padding * 2) + 4}px;
    height: ${elementBottom - elementTop + (padding * 2) + 4}px;
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
  
  document.body.classList.add('ai-focus-mode');
}

// Обновление позиции маски
function updateMaskPosition() {
  if (!isMaskActive || !currentSimplifiedContainer || !focusMask) return;
  
  const rect = currentSimplifiedContainer.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  
  const padding = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const elementTop = rect.top;
  const elementLeft = rect.left;
  const elementBottom = rect.bottom;
  const elementRight = rect.right;
  
  const masks = focusMask.children;
  if (masks.length >= 4) {
    masks[0].style.height = `${Math.max(0, elementTop - padding)}px`;
    
    masks[1].style.top = `${elementBottom + padding}px`;
    masks[1].style.height = `${Math.max(0, viewportHeight - (elementBottom + padding))}px`;
    
    masks[2].style.top = `${Math.max(0, elementTop - padding)}px`;
    masks[2].style.width = `${Math.max(0, elementLeft - padding)}px`;
    masks[2].style.height = `${elementBottom - elementTop + (padding * 2)}px`;
    
    masks[3].style.top = `${Math.max(0, elementTop - padding)}px`;
    masks[3].style.left = `${elementRight + padding}px`;
    masks[3].style.width = `${Math.max(0, viewportWidth - (elementRight + padding))}px`;
    masks[3].style.height = `${elementBottom - elementTop + (padding * 2)}px`;
    
    const border = focusMask.querySelector('div[style*="focusPulse"]');
    if (border) {
      border.style.top = `${elementTop - padding - 2}px`;
      border.style.left = `${elementLeft - padding - 2}px`;
      border.style.width = `${elementRight - elementLeft + (padding * 2) + 4}px`;
      border.style.height = `${elementBottom - elementTop + (padding * 2) + 4}px`;
    }
  }
}

// Удаление маски
function removeFocusMask() {
  if (focusMask) {
    focusMask.remove();
    focusMask = null;
  }
  isMaskActive = false;
  currentSimplifiedContainer = null;
  document.body.classList.remove('ai-focus-mode');
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
    
    body.ai-focus-mode {
      overflow: hidden !important;
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

function createLoadingOverlay(message) {
  removeLoadingOverlay();
  loadingOverlay = document.createElement('div');
  loadingOverlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 12px 24px;
    border-radius: 40px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    z-index: 10002;
    backdrop-filter: blur(4px);
  `;
  loadingOverlay.textContent = message;
  document.body.appendChild(loadingOverlay);
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

// Анимация
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

// Отслеживание скролла и ресайза
window.addEventListener('scroll', () => {
  if (isMaskActive) updateMaskPosition();
});

window.addEventListener('resize', () => {
  if (isMaskActive) updateMaskPosition();
});

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