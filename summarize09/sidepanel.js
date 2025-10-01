const contentArea = document.getElementById('contentArea');
const statusMessage = document.getElementById('statusMessage');

/**
 * Displays status or error messages in the dedicated message box.
 * @param {string} message - The message to display.
 * @param {boolean} [isError=false] - Whether the message is an error (changes color).
 */
function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    // Use template literals to set dynamic Tailwind classes for styling
    statusMessage.className = `mt-3 p-2 text-sm text-center rounded-lg block ${isError ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`;
    
    // Hide the message after 3 seconds
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 3000);
}

// --- Event Listeners ---

// Listener for the "Show All Text" button
document.getElementById('showAllBtn').addEventListener('click', () => {
    contentArea.value = 'Loading...';
    showStatus('Fetching all page text...', false);
    // Send a message to the service worker to request all content
    chrome.runtime.sendMessage({ action: 'getAllContent' });
});

// Listener for the "Show Selected" button
document.getElementById('showSelectedBtn').addEventListener('click', () => {
    contentArea.value = 'Loading...';
    showStatus('Fetching selected text...', false);
    // Send a message to the service worker to request selected content
    chrome.runtime.sendMessage({ action: 'getSelectedContent' });
});

// --- Message Listener from Service Worker ---

// This listener receives the extracted content from the background script
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'contentResponse') {
        const content = message.content.trim();
        contentArea.value = content || "No content found or selected.";
        
        // Update the status message based on whether content was found
        showStatus(
            content ? "Content successfully extracted." : "Extraction complete. Content was empty.", 
            !content
        );
    }
});
