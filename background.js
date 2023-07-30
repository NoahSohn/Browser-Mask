// Read the config from config.json
const loadConfig = async () => {
  try {
    // Fetch the config.json file using the browser API
    const response = await fetch(browser.runtime.getURL("config.json"));

    // Parse the JSON response to obtain the configuration data
    return await response.json();
  } catch (error) {
    // If there's an error loading the config, log the error and set a default empty configuration
    console.error("Error loading config:", error);
    return { browsers: {} };
  }
};

// Initialize an empty config object
let config = {};

// Load config when the extension starts
loadConfig().then((data) => {
  // Store the loaded configuration data in the 'config' variable for later use
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
  // Get the tab information using the tabId
  browser.tabs.get(tabId, (tab) => {
    if (!tab || !tab.url) return; // If the tab or its URL is not available, do nothing.

    // Check if the tab is a valid webpage
    if (isValidWebpage(tab.url)) {
      // Check if the URL is allowed to trigger the badge
      if (isAllowedURL(tab.url)) {
        // Find the browser data corresponding to the current website's URL
        const browserData = Object.values(config.browsers).find((browser) => {
          return browser.websites.some((site) => tab.url.includes(site));
        });

        // If browserData is found, update the badge text and title based on the configuration
        if (browserData) {
          browser.browserAction.setBadgeText({ text: browserData.badgeText });
          browser.browserAction.setTitle({ title: browserData.name });
        } else {
          // If the current website's URL is not specified in the config, set default badge text and title.
          browser.browserAction.setBadgeText({ text: "" });
          browser.browserAction.setTitle({ title: "Browser Mask" });
        }
      } else {
        // If it's not an allowed URL, hide the badge text and set default title.
        browser.browserAction.setBadgeText({ text: "" });
        browser.browserAction.setTitle({ title: "Browser Mask" });
      }
    } else {
      // If it's not a valid webpage, hide the badge text and set default title.
      browser.browserAction.setBadgeText({ text: "" });
      browser.browserAction.setTitle({ title: "Browser Mask" });
    }
  });
};

// Update badge text when a new tab is activated
browser.tabs.onActivated.addListener((activeInfo) => {
  // Call updateBadgeText function to update the badge when the active tab changes
  updateBadgeText(activeInfo.tabId);
});

// Update badge text when the page loads in a tab
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Call updateBadgeText function to update the badge when the page loads completely
  if (changeInfo.status === "complete") {
    updateBadgeText(tabId);
  }
});

// Replace the user agent based on the website's URL
const replaceUserAgent = (details) => {
  // Find the browser data corresponding to the website's URL from the configuration
  const browserData = Object.values(config.browsers).find((browser) => {
    return browser.websites.some((site) => details.url.includes(site));
  });

  // If browserData is found, modify the user agent header in the web request
  if (browserData) {
    const userAgent = browserData.userAgent;
    return {
      // Replace the 'User-Agent' header with the configured user agent for the matching website
      requestHeaders: details.requestHeaders.map((header) => {
        if (header.name.toLowerCase() === "user-agent") {
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
  // Call replaceUserAgent function when a web request is about to be sent
  replaceUserAgent,
  // Apply the listener to all URLs ('<all_urls>')
  { urls: ["<all_urls>"] },
  // Use 'blocking' to ensure the listener has a chance to modify the request headers
  ["blocking", "requestHeaders"],
);
