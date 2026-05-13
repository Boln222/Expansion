document.addEventListener('DOMContentLoaded', async () => {
  // --- ЛОГИКА ВЫБОРА УРОВНЯ (ТВОЙ ОРИГИНАЛЬНЫЙ КОД) ---
  
  // Загружаем сохраненный уровень (если есть)
  const { selectedLevel } = await chrome.storage.sync.get(['selectedLevel']);
  const modeItems = document.querySelectorAll('.mode-item');

  // Устанавливаем активный класс из хранилища
  if (selectedLevel) {
    modeItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.level === selectedLevel) {
        item.classList.add('active');
      }
    });
  }

  // Логика выбора уровня
  modeItems.forEach(item => {
    item.addEventListener('click', async () => {
      // Визуальное переключение
      modeItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Сохранение в память Chrome
      const level = item.dataset.level;
      await chrome.storage.sync.set({ selectedLevel: level });
      
      console.log(`Уровень сохранен: ${level}`);
    });
  });

  // --- НОВАЯ ЛОГИКА ДЛЯ ФОКУС-ЛИНЕЙКИ ---

  const rulerBtn = document.getElementById('rulerBtn');
  if (rulerBtn) {
    rulerBtn.addEventListener('click', async () => {
      // Находим активную вкладку
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        // Отправляем сообщение в content.js для переключения линейки
        chrome.tabs.sendMessage(tab.id, { action: 'toggleRuler' });
        
        // Визуальная индикация нажатия кнопки в попапе
        rulerBtn.classList.toggle('active-ruler');
        
        // Опционально: меняем стиль кнопки прямо здесь, если нет CSS класса
        if (rulerBtn.classList.contains('active-ruler')) {
          rulerBtn.style.backgroundColor = 'rgba(125, 211, 252, 0.2)';
          rulerBtn.style.borderColor = '#7dd3fc';
        } else {
          rulerBtn.style.backgroundColor = 'rgba(30, 41, 59, 0.8)';
          rulerBtn.style.borderColor = 'rgba(125, 211, 252, 0.5)';
        }
      }
    });
  }
});