// tts.js

const WORD_LIMIT = 100;

const form = document.getElementById('ttsForm');
const textarea = document.getElementById('inputarea');
const audioPlayer = document.getElementById('audioPlayer');
const errorDiv = document.getElementById('error');
const synthesizeBtn = document.getElementById('synthesizeBtn');
const wordCountDiv = document.getElementById('wordCount');

// Function to count words (split on whitespace, filter empty)
const updateWordCount = () => {
    const text = textarea.value.trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const count = words.length;
    wordCountDiv.textContent = `سۆز: ${count} / ${WORD_LIMIT}`;
    if (count > WORD_LIMIT) {
        wordCountDiv.style.color = 'red';
    } else {
        wordCountDiv.style.color = '#666';
    }
};

// Enforce word limit on input
textarea.addEventListener('input', () => {
    const text = textarea.value.trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    if (words.length > WORD_LIMIT) {
        // Truncate to last valid word
        const limitedWords = words.slice(0, WORD_LIMIT);
        textarea.value = limitedWords.join(' ');
        updateWordCount();
        alert(`سۆز سانى چەكتىن ئېشىپ كەتتى! ${WORD_LIMIT} سۆزگە قىسقارتىلدى.`);
    }
    updateWordCount();
});

// Initial count
updateWordCount();

document.querySelectorAll('.example-row').forEach(row => {
    row.addEventListener('click', () => {
        const text = row.getAttribute('data-text');
        const model = row.getAttribute('data-model');
        
        document.getElementById('inputarea').value = text;
        document.getElementById('modelSelect').value = model;
        
        updateWordCount();
        // Optional: Update word count if your tts.js has that logic
        // You can trigger any existing word count function here if needed
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('ttsForm');
    const audioPlayer = document.getElementById('audioPlayer');
    const errorDiv = document.getElementById('error');
    const synthesizeBtn = document.getElementById('synthesizeBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.style.display = 'none';
        audioPlayer.style.display = 'none';
        synthesizeBtn.disabled = true;
        synthesizeBtn.classList.add('loading');
        synthesizeBtn.textContent = 'ئاۋازغا ئايلىنىۋاتىدۇ...';

        const formData = new FormData(form);
        const text = formData.get('text');
        const model = formData.get('model');

        try {
            const response = await fetch('/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    text,
                    model,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to synthesize audio');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            audioPlayer.src = url;
            audioPlayer.style.display = 'block';
            audioPlayer.play();

            // // Optional: Trigger download
            // const a = document.createElement('a');
            // a.href = url;
            // a.download = 'speech.wav';
            // document.body.appendChild(a);
            // a.click();
            // document.body.removeChild(a);
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        } finally {
            synthesizeBtn.disabled = false;
            synthesizeBtn.classList.remove('loading');
            synthesizeBtn.textContent = 'ئاۋازغا';
        }
    });
});


