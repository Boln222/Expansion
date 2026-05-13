console.log("✅ BACKGROUND.JS ЗАГРУЖЕН - ПОЛНАЯ ВЕРСИЯ");

// Промпты для разных уровней упрощения
const PROMPTS = {
  1: {
    name: "Чётко",
    emoji: "🔍",
    systemPrompt: `Ты — помощник для людей с дислексией. Сделай текст ЧЁТКИМ.
Правила:
1. Каждое предложение — не длиннее 14 слов. Если длиннее — разбей.
2. Убери вводные слова («к сожалению», «вообще говоря», «тем не менее»).
3. Замени пассивный залог на активный.
4. Сохрани все смысловые детали и факты.
Формат вывода: Только исправленный текст. Без списков и пояснений.`
  },
  2: {
    name: "Просто",
    emoji: "📖",
    systemPrompt: `Ты — помощник для людей с дислексией. Перепиши текст ПРОСТО.
Правила:
1. Каждое предложение — не длиннее 9 слов.
2. Используй только простые слова (1–3 слога).
3. Каждую мысль начинай с новой строки.
4. Не используй причастия и деепричастия.
Формат вывода: Только текст. Короткие строки.`
  },
  3: {
    name: "Суть",
    emoji: "⚡",
    systemPrompt: `Ты — помощник для людей с дислексией. Выдели только СУТЬ текста.
Правила:
1. Итоговый текст не длиннее 20 слов.
2. Удали всё: примеры, повторы, аргументы.
3. Оставь только главный факт или задачу.
4. Если фактов несколько — разделяй их чертой « | ».
Формат вывода: Только 1–3 коротких фразы.`
  }
};

// Твой актуальный URL сервера из манифеста и скриншотов
const YOUR_API_URL = "https://apikey-wxbq.vercel.app/api/simplify";

// Основная функция запроса к серверу
async function simplifyTextWithServer(text, level) {
  console.log(`📡 Запрос на уровень ${level}:`, text.substring(0, 50) + "...");
  
  const requestBody = {
    text: text,
    level: level,
    systemPrompt: PROMPTS[level].systemPrompt,
    userPrompt: level === 3 
      ? `Выдели главные мысли из этого текста:\n\n${text}` 
      : `Упрости этот текст:\n\n${text}`
  };

  try {
    const response = await fetch(YOUR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    // Проверка на ошибки сервера (Forbidden, Not Found и т.д.)
    if (!response.ok) {
      if (response.status === 403) throw new Error("Доступ запрещен (403). Проверь настройки Vercel.");
      if (response.status === 429) throw new Error("Лимит запросов исчерпан. Подожди 1 минуту.");
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    // Проверка, что пришел именно JSON, а не HTML-страница с ошибкой
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Сервер прислал текст вместо JSON. Проверь деплой на Vercel.");
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Ошибка в логике сервера');
    }
    
    return data.text;

  } catch (error) {
    console.error("❌ Ошибка выполнения:", error.message);
    throw error;
  }
}

// Создание контекстного меню
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "simplifyParent",
    title: "✨ Упростить текст",
    contexts: ["selection"]
  });
  
  Object.keys(PROMPTS).forEach(level => {
    chrome.contextMenus.create({
      id: `simplifyLevel${level}`,
      parentId: "simplifyParent",
      title: `${PROMPTS[level].emoji} Уровень ${level}: ${PROMPTS[level].name}`,
      contexts: ["selection"]
    });
  });
});

// Обработка кликов
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId.startsWith("simplifyLevel")) return;
  
  const level = parseInt(info.menuItemId.replace("simplifyLevel", ""));
  
  chrome.tabs.sendMessage(tab.id, {
    action: "showLoading",
    message: `🔄 ${PROMPTS[level].emoji} Работаем...`
  });
  
  try {
    const simplified = await simplifyTextWithServer(info.selectionText, level);
    chrome.tabs.sendMessage(tab.id, {
      action: "replaceText",
      originalText: info.selectionText,
      simplifiedText: simplified,
      level: level,
      levelName: PROMPTS[level].name
    });
  } catch (error) {
    chrome.tabs.sendMessage(tab.id, {
      action: "showError",
      message: `❌ ${error.message}`
    });
  }
});

// Обработка горячих клавиш из content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'simplifyWithLevel') {
    handleInAppRequest(request);
    return true;
  }
});

async function handleInAppRequest(request) {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab) return;

  try {
    const simplified = await simplifyTextWithServer(request.text, request.level);
    chrome.tabs.sendMessage(tab.id, {
      action: "replaceText",
      originalText: request.text,
      simplifiedText: simplified,
      level: request.level,
      levelName: PROMPTS[request.level].name
    });
  } catch (error) {
    chrome.tabs.sendMessage(tab.id, {
      action: "showError",
      message: `❌ ${error.message}`
    });
  }
}