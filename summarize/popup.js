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
  
  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetPageText
  });

  myStopTimer();

  const myPageText = myResults[0].result;

  if (myPageText) {
    const mySummary = await mySummarizeText(myPageText);
    mySummaryArea.textContent = mySummary;
  } else {
    mySummaryArea.textContent = 'Could not retrieve text from the page.';
  }
}

// Grabs and summarizes only the text the user has highlighted.
async function mySummarizeSelection() {
  const mySummaryArea = document.getElementById('mySummaryArea');
  myStartTimer(mySummaryArea);

  const [myTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetSelectedText
  });

  myStopTimer();

  const mySelectedText = myResults[0].result;

  if (mySelectedText) {
    const mySummary = await mySummarizeText(mySelectedText);
    mySummaryArea.textContent = mySummary;
  } else {
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

// This is the placeholder for your AI summarization logic.
async function mySummarizeText(myText) {
  // Simulating an API call or computation with a delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const myWords = myText.split(/\s+/);
  const myFirstSentences = myWords.slice(0, 50).join(' ') + '... (This is a simplified summary to demonstrate the process. Your AI would go here.)';
  return myFirstSentences;
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
