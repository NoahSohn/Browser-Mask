// Read the config from config.json
const loadConfig = async () => {
  try {
    const response = await fetch(chrome.runtime.getURL('config.json'));
    return await response.json();
  } catch (error) {
    console.error('Error loading config:', error);
    return { browsers: {}, websites: {} };
  }
};

let config = {};

// Load config when the extension starts
loadConfig().then((data) => {
  config = data;
});

// Function to check if a URL is a valid webpage
const isValidWebpage = (url) => {
  // Check if the URL starts with "http" or "ftp" to ensure it's a webpage
  return url.startsWith('http') || url.startsWith('ftp');
};

// Function to update the badge text based on the current tab
const updateBadgeText = (tabId) => {
  chrome.tabs.get(tabId, (tab) => {
    if (!tab || !tab.url) return;

    // Check if the tab is a valid webpage
    if (isValidWebpage(tab.url)) {
      const website = Object.keys(config.websites).find(site => tab.url.includes(site));
      if (website) {
        const browserKey = config.websites[website];
        const browser = config.browsers[browserKey];
        chrome.browserAction.setBadgeText({ text: browser.badgeText });
        chrome.browserAction.setTitle({ title: browser.name });
      } else {
        chrome.browserAction.setBadgeText({ text: '' });
        chrome.browserAction.setTitle({ title: 'Browser Mask' });
      }
    } else {
      // If it's not a valid webpage, hide the badge text
      chrome.browserAction.setBadgeText({ text: '' });
      chrome.browserAction.setTitle({ title: 'Browser Mask' });
    }
  });
};

// Update badge text when a new tab is activated
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateBadgeText(activeInfo.tabId);
});

// Update badge text when the page loads in a tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadgeText(tabId);
  }
});

// Replace the user agent based on the website's URL
const replaceUserAgent = (details) => {
  const website = Object.keys(config.websites).find(site => details.url.includes(site));
  if (website) {
    const browserKey = config.websites[website];
    const browser = config.browsers[browserKey];
    const userAgent = browser.userAgent;
    return {
      requestHeaders: details.requestHeaders.map(header => {
        if (header.name.toLowerCase() === 'user-agent') {
          header.value = userAgent;
        }
        return header;
      }),
    };
  }
  // If the website is not specified in config, return null to keep the original user agent.
  return null;
};

// Listen for web requests and modify the user agent
chrome.webRequest.onBeforeSendHeaders.addListener(
  replaceUserAgent,
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
  );
