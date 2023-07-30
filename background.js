// Read the config from config.json
const loadConfig = async () => {
  try {
    const response = await fetch(browser.runtime.getURL('config.json'));
    return await response.json();
  } catch (error) {
    console.error('Error loading config:', error);
    return { browsers: {} };
  }
};

let config = {};

// Load config when the extension starts
loadConfig().then((data) => {
  config = data;
});

// Function to check if a URL is a valid webpage
const isValidWebpage = (url) => {
  // Check if the URL starts with "http" or "https" to ensure it's a valid webpage
  return /^https?:\/\//i.test(url);
};

// Function to check if a URL is allowed to trigger the badge
const isAllowedURL = (url) => {
  // Check if the URL starts with "http" or "https" and exclude other schemes like "file://", "about:", etc.
  return /^(https?|ftp):\/\//i.test(url);
};

// Function to update the badge text based on the current tab
const updateBadgeText = (tabId) => {
  browser.tabs.get(tabId, (tab) => {
    if (!tab || !tab.url) return;

    // Check if the tab is a valid webpage
    if (isValidWebpage(tab.url)) {
      // Check if the URL is allowed to trigger the badge
      if (isAllowedURL(tab.url)) {
        const browserData = Object.values(config.browsers).find((browser) => {
          return browser.websites.some((site) => tab.url.includes(site));
        });

        if (browserData) {
          browser.browserAction.setBadgeText({ text: browserData.badgeText });
          browser.browserAction.setTitle({ title: browserData.name });
        } else {
          browser.browserAction.setBadgeText({ text: '' });
          browser.browserAction.setTitle({ title: 'Browser Mask' });
        }
      } else {
        // If it's not an allowed URL, hide the badge text
        browser.browserAction.setBadgeText({ text: '' });
        browser.browserAction.setTitle({ title: 'Browser Mask' });
      }
    } else {
      // If it's not a valid webpage, hide the badge text
      browser.browserAction.setBadgeText({ text: '' });
      browser.browserAction.setTitle({ title: 'Browser Mask' });
    }
  });
};

// Update badge text when a new tab is activated
browser.tabs.onActivated.addListener((activeInfo) => {
  updateBadgeText(activeInfo.tabId);
});

// Update badge text when the page loads in a tab
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadgeText(tabId);
  }
});

// Replace the user agent based on the website's URL
const replaceUserAgent = (details) => {
  const browserData = Object.values(config.browsers).find((browser) => {
    return browser.websites.some((site) => details.url.includes(site));
  });

  if (browserData) {
    const userAgent = browserData.userAgent;
    return {
      requestHeaders: details.requestHeaders.map((header) => {
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
browser.webRequest.onBeforeSendHeaders.addListener(
  replaceUserAgent,
  { urls: ['<all_urls>'] },
  ['blocking', 'requestHeaders']
  );
