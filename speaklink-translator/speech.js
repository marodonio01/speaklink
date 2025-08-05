// Simple text-to-speech helper
function speakText(text, lang = 'en-US') {
  if (!text.trim()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  speechSynthesis.speak(utterance);
}

// Attach event listeners once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const ocrBtn = document.getElementById('speak-ocr');
  const translationBtn = document.getElementById('speak-translation');

  if (ocrBtn) {
    ocrBtn.addEventListener('click', () => {
      const text = document.getElementById('ocr-result').textContent;
      speakText(text, 'en-US'); // English
    });
  }

  if (translationBtn) {
    translationBtn.addEventListener('click', () => {
      const text = document.getElementById('translated-result').textContent;
      speakText(text, 'fil-PH'); // Filipino (if available)
    });
  }
});
