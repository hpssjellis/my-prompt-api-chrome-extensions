let myTimerInterval;
let mySeconds = 0;

function myStartTimer(myArea) {
  mySeconds = 0;
  myArea.textContent = 'Thinking (0s)...';
  myTimerInterval = setInterval(() => {
    mySeconds++;
    myArea.textContent = `Thinking (${mySeconds}s)...`;
  }, 1000);
}

function myStopTimer() {
  clearInterval(myTimerInterval);
}

// Grabs and summarizes the text from the entire webpage.
async function mySummarizePage() {
  const mySummaryArea = document.getElementById('mySummaryArea');
  myStartTimer(mySummaryArea);

  const [myTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check for a valid URL
  if (myTab.url.startsWith('chrome://') || myTab.url.startsWith('chrome-extension://') || myTab.url.startsWith('file://')) {
    myStopTimer();
    mySummaryArea.textContent = 'Error: Cannot summarize this page due to security restrictions.';
    return; // Exit the function
  }

  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetPageText
  });

  const myPageText = myResults[0].result;

  if (myPageText) {
    const mySummary = await mySummarizeText(myPageText);
    myStopTimer();
    mySummaryArea.textContent = mySummary;
  } else {
    myStopTimer();
    mySummaryArea.textContent = 'Could not retrieve text from the page.';
  }
}

// Grabs and summarizes only the text the user has highlighted.
async function mySummarizeSelection() {
  const mySummaryArea = document.getElementById('mySummaryArea');
  myStartTimer(mySummaryArea);

  const [myTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check for a valid URL
  if (myTab.url.startsWith('chrome://') || myTab.url.startsWith('chrome-extension://') || myTab.url.startsWith('file://')) {
    myStopTimer();
    mySummaryArea.textContent = 'Error: Cannot summarize this page due to security restrictions.';
    return; // Exit the function
  }

  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetSelectedText
  });

  const mySelectedText = myResults[0].result;

  if (mySelectedText) {
    const mySummary = await mySummarizeText(mySelectedText);
    myStopTimer();
    mySummaryArea.textContent = mySummary;
  } else {
    myStopTimer();
    mySummaryArea.textContent = 'No text was selected on the page.';
  }
}

// This function is injected to get all text from the page body.
function myGetPageText() {
  return document.body.innerText;
}

// This function is injected to get only the selected text.
function myGetSelectedText() {
  return window.getSelection().toString();
}

// This is the updated function that uses the real Summarizer API.
async function mySummarizeText(myText) {
  if ('Summarizer' in window) {
    try {
      const mySummarizer = await Summarizer.create();
      const mySummary = await mySummarizer.summarize(myText);
      return mySummary.output;
    } catch (error) {
      console.error('Error during summarization:', error);
      return `Error: ${error.message}`;
    }
  } else {
    return 'The Summarizer API is not supported in this browser or is not enabled.';
  }
}

// Event listeners to handle button clicks.
document.addEventListener('DOMContentLoaded', () => {
  const myFullPageButton = document.getElementById('myFullPageButton');
  const mySelectionButton = document.getElementById('mySelectionButton');

  if (myFullPageButton) {
    myFullPageButton.addEventListener('click', mySummarizePage);
  }
  if (mySelectionButton) {
    mySelectionButton.addEventListener('click', mySummarizeSelection);
  }
});
