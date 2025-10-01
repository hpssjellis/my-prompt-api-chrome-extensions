// --- Timer Management ---
let timerInterval;
let seconds = 0;
const contentArea = document.getElementById('contentArea');
const statusMessage = document.getElementById('statusMessage');

function startTimer() {
    seconds = 0;
    // Use the statusMessage area for the timer display
    statusMessage.textContent = 'Thinking (0s)...';
    timerInterval = setInterval(() => {
        seconds++;
        statusMessage.textContent = `Thinking (${seconds}s)...`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// --- Content Retrieval Functions (Injected into the Active Tab) ---

// This function is injected to get all text from the page body.
function getPageText() {
    // Only return visible text content
    return document.body.innerText;
}

// This function is injected to get only the selected text.
function getSelectedText() {
    return window.getSelection().toString();
}

// --- AI Summarization Core Function ---

// This is the function that uses the LanguageModel API with a prompt.
async function summarizeWithPrompt(text) {
    if ('LanguageModel' in window) {
        try {
            // FIX: Specify the expected output language ('en') to satisfy new API safety warnings.
            const model = await LanguageModel.create({
                expectedOutputs: [
                    { type: "text", languages: ["en"] }
                ]
            });
            
            const prompt = `Provide a concise, neutral summary of the following text:\n\n${text}`;
            const summary = await model.prompt(prompt);
            return summary;
        } catch (error) {
            console.error('Error using LanguageModel API:', error);
            return `Error: ${error.message}. Please ensure the Language Model API is enabled/supported.`;
        }
    } else {
        return 'Error: The Chrome LanguageModel API is not supported in this browser or is not enabled.';
    }
}

// --- Action Handlers ---

// Grabs and summarizes the text from the entire webpage.
async function summarizePage(extractionFunc) {
    // Clear previous output and start loading state
    contentArea.value = '';
    statusMessage.textContent = '';
    startTimer();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check for a valid URL
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('file://')) {
        stopTimer();
        statusMessage.textContent = 'Error: Cannot access content on this type of page (e.g., settings, extension page).';
        return;
    }

    try {
        // Execute the appropriate content retrieval function
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractionFunc
        });

        const extractedText = results[0].result;

        if (extractedText && extractedText.trim().length > 0) {
            statusMessage.textContent = 'Text extracted successfully. Generating summary...';
            const summary = await summarizeWithPrompt(extractedText);
            stopTimer();
            contentArea.value = summary;
            statusMessage.textContent = 'Summary complete.';
        } else {
            stopTimer();
            contentArea.value = '';
            statusMessage.textContent = extractionFunc === getPageText ? 
                'Could not retrieve any text from the page.' : 
                'No text was selected on the page.';
        }
    } catch (error) {
        stopTimer();
        console.error('Scripting Error:', error);
        statusMessage.textContent = `Scripting Error: Could not execute script on the page.`;
    }
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    const showAllBtn = document.getElementById('showAllBtn');
    const showSelectedBtn = document.getElementById('showSelectedBtn');

    // Button to summarize the entire page content
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => summarizePage(getPageText));
    }

    // Button to summarize the selected text content
    if (showSelectedBtn) {
        showSelectedBtn.addEventListener('click', () => summarizePage(getSelectedText));
    }
});
