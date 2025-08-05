document.getElementById("startListening").addEventListener("click", () => {
  const status = document.getElementById("status");

  if (!('webkitSpeechRecognition' in window)) {
    status.textContent = "Your browser does not support Speech Recognition.";
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();
  status.textContent = "Listening...";

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim().toLowerCase();
    status.textContent = `You said: "${transcript}"`;

    if (transcript === "start") {
      window.location.href = "services.html"; // To be created later
    } else {
      status.textContent += " — try saying 'Start'.";
    }
  };

  recognition.onerror = (event) => {
    status.textContent = "Error occurred: " + event.error;
  };
});

function startVoiceInput(fieldId) {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Speech Recognition not supported in this browser.');
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    console.log('Voice input started for', fieldId);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById(fieldId).value = transcript;
  };

  recognition.onerror = (event) => {
    console.error('Voice input error:', event.error);
  };

  recognition.start();
}

