document.addEventListener('DOMContentLoaded', async () => {
  const { apiKey } = await chrome.storage.sync.get(['apiKey']);
  
  if (apiKey) {
    document.getElementById('apiKey').value = apiKey;
  }
  
  // Анимация выбора уровня (просто для UI)
  const levelCards = document.querySelectorAll('.level-card');
  levelCards.forEach(card => {
    card.addEventListener('click', () => {
      levelCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      // Показываем подсказку
      const level = card.dataset.level;
      const levelName = level === '1' ? 'Чётко' : (level === '2' ? 'Просто' : 'Суть');
      showStatus(`💡 Выбран уровень "${levelName}". Выделите текст и нажмите правую кнопку мыши.`, 'success');
      setTimeout(() => {
        const statusDiv = document.getElementById('status');
        statusDiv.className = 'status';
        statusDiv.style.display = 'none';
      }, 3000);
    });
  });
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const statusDiv = document.getElementById('status');
  
  if (!apiKey) {
    showStatus('❌ Введите API ключ', 'error');
    return;
  }
  
  await chrome.storage.sync.set({ apiKey });
  showStatus('✅ API ключ сохранён!', 'success');
  
  setTimeout(() => {
    statusDiv.className = 'status';
    statusDiv.style.display = 'none';
  }, 3000);
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
}
