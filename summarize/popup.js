// This function is linked directly to the HTML button.
async function mySummarizePage() {
  const mySummaryArea = document.getElementById('mySummaryArea');
  mySummaryArea.textContent = 'Summarizing...';

  // Get the active tab information
  const [myTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Inject a function into the active tab to grab the page's text content.
  // This is a crucial step for getting data from the webpage.
  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetPageText
  });

  const myPageText = myResults[0].result;

  if (myPageText) {
    // Call the "AI" function to get the summary.
    // Replace this with your actual AI logic or API call.
    const mySummary = await mySummarizeText(myPageText);
    mySummaryArea.textContent = mySummary;
  } else {
    mySummaryArea.textContent = 'Could not retrieve text from the page.';
  }
}

// This function will be injected and run on the webpage.
function myGetPageText() {
  return document.body.innerText;
}

// This is a placeholder for your AI summarization logic.
// In a real-world scenario, this would send text to an LLM.
async function mySummarizeText(myText) {
  // Simulate an AI response.
  // For a real project, you would make an API call here.
  const myWords = myText.split(/\s+/);
  const myFirstSentences = myWords.slice(0, 50).join(' ') + '... (This is a simplified summary to demonstrate the process. Your AI would go here.)';
  return myFirstSentences;
}
