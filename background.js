// Конфигурация Gemini API
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Список моделей для перебора в случае ошибки или перегрузки
const MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite", 
  "gemini-2.5-flash-lite",
  "gemini-flash-latest"
];

// Промпты для разных уровней упрощения
const PROMPTS = {
  1: {
    name: "Чётко",
    emoji: "🔍",
    systemPrompt: `Ты — помощник, который делает текст чётким и понятным.
Твоя задача: сохранить полный смысл и структуру оригинала, но убрать главные препятствия:
- Удали сложные вводные конструкции
- Замени канцеляриты на простые слова
- Разбей очень длинные предложения
- Сохрани все факты и логику

Не добавляй комментариев. Только сам текст.`
  },
  2: {
    name: "Просто",
    emoji: "📖",
    systemPrompt: `Ты — помощник, который делает текст доступным для комфортного чтения.
Твоя задача:
- Используй короткие предложения
- Замени сложные слова на простые
- Объясняй термины простыми словами
- Используй активный залог

Не добавляй комментариев. Только сам текст.`
  },
  3: {
    name: "Суть",
    emoji: "⚡",
    systemPrompt: `Ты — помощник, который выделяет самое главное.
Твоя задача: выделить 3-5 самых важных мыслей.

Правила:
- Каждый пункт с новой строки и с "- "
- Максимум 10-15 слов на пункт
- Удали примеры и повторы

Не добавляй комментариев. Только список.`
  }
};

// Создание контекстного меню
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "simplifyParent",
    title: "✨ Упростить текст",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "simplifyLevel1",
    parentId: "simplifyParent",
    title: "🔍 Уровень 1: Чётко",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "simplifyLevel2",
    parentId: "simplifyParent",
    title: "📖 Уровень 2: Просто",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "simplifyLevel3",
    parentId: "simplifyParent",
    title: "⚡ Уровень 3: Суть",
    contexts: ["selection"]
  });
});

// Обработчик клика по контекстному меню
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let level = null;
  
  if (info.menuItemId === "simplifyLevel1") level = 1;
  else if (info.menuItemId === "simplifyLevel2") level = 2;
  else if (info.menuItemId === "simplifyLevel3") level = 3;
  else return;
  
  if (!info.selectionText) return;
  
  const selectedText = info.selectionText;
  
  // Получаем API ключ
  const result = await chrome.storage.sync.get(['apiKey']);
  const apiKey = result.apiKey;
  
  if (!apiKey) {
    chrome.tabs.sendMessage(tab.id, {
      action: "showError",
      message: "❌ API ключ не настроен. Нажмите на иконку расширения."
    });
    return;
  }
  
  chrome.tabs.sendMessage(tab.id, {
    action: "showLoading",
    message: `🔄 ${PROMPTS[level].emoji} ${PROMPTS[level].name}...`
  });
  
  try {
    const simplified = await simplifyTextWithGemini(selectedText, apiKey, level);
    
    chrome.tabs.sendMessage(tab.id, {
      action: "replaceText",
      originalText: selectedText,
      simplifiedText: simplified,
      level: level,
      levelName: PROMPTS[level].name
    });
  } catch (error) {
    console.error('Error:', error);
    chrome.tabs.sendMessage(tab.id, {
      action: "showError",
      message: `❌ Ошибка: ${error.message}`
    });
  }
});

// Функция вызова Gemini API с перебором моделей
async function simplifyTextWithGemini(text, apiKey, level) {
  let lastError = null;
  
  for (const model of MODELS) {
    try {
      const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;
      
      const userPrompt = level === 3
        ? `Выдели 3-5 главных мыслей из этого текста:\n\n${text}`
        : `Упрости этот текст:\n\n${text}`;
      
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPTS[level].systemPrompt },
              { text: userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      // Если модель перегружена, пробуем следующую
      if (response.status === 429) {
        console.log(`Модель ${model} перегружена, пробуем следующую...`);
        continue;
      }
      
      // Если модель не найдена, пробуем следующую
      if (response.status === 404) {
        console.log(`Модель ${model} не найдена, пробуем следующую...`);
        continue;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const simplifiedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!simplifiedText) {
        throw new Error('Не удалось получить ответ от AI');
      }
      
      console.log(`✅ Успешно использована модель: ${model}`);
      return simplifiedText.trim();
      
    } catch (error) {
      lastError = error;
      console.log(`❌ Ошибка с моделью ${model}:`, error.message);
    }
  }
  
  // Если все модели не сработали
  throw lastError || new Error('Все модели временно недоступны. Попробуйте позже.');
}

// Обработчик сообщений от content.js (для горячих клавиш)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'simplifyWithLevel') {
    const level = request.level;
    const text = request.text;
    
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      const tab = tabs[0];
      const { apiKey } = await chrome.storage.sync.get(['apiKey']);
      
      if (!apiKey) {
        chrome.tabs.sendMessage(tab.id, {
          action: "showError",
          message: "❌ API ключ не настроен"
        });
        sendResponse({status: "error", message: "no api key"});
        return;
      }
      
      chrome.tabs.sendMessage(tab.id, {
        action: "showLoading",
        message: `🔄 ${PROMPTS[level].emoji} ${PROMPTS[level].name}...`
      });
      
      try {
        const simplified = await simplifyTextWithGemini(text, apiKey, level);
        
        chrome.tabs.sendMessage(tab.id, {
          action: "replaceText",
          originalText: text,
          simplifiedText: simplified,
          level: level,
          levelName: PROMPTS[level].name
        });
        sendResponse({status: "ok"});
      } catch (error) {
        chrome.tabs.sendMessage(tab.id, {
          action: "showError",
          message: `❌ Ошибка: ${error.message}`
        });
        sendResponse({status: "error", message: error.message});
      }
    });
    
    return true; // Для асинхронного ответа
  }
});