import puppeteer from "puppeteer";

export const scrapeText = async (url) => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Wait for any product container to load (adjust for your website)
    await page.waitForSelector("body");

    const text = await page.evaluate(() => {
      const selectors = [
        "h1",                     // Product title
        "#productTitle",                
        "#productTitle",                
        ".a-price-whole",                
        ".price",                // Price class (common)
        ".product-price",        // Alternate price
        ".product-title",        // Alternate title
        ".product-description",  // Main description
        ".description",          // Fallback description
        ".features",             // Features list
        "ul li",                 // Feature points
        "span",                  // All spans
        "p"                      // All paragraphs
      ];

      const content = [];

      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const text = el.innerText?.trim();
          if (text && text.length > 10 && !content.includes(text)) {
            content.push(text);
          }
        });
      });

      return content.join("\n");
    });

    await browser.close();
    return text;
  } catch (error) {
    console.error("Scraping failed:", error);
    await browser.close();
    throw new Error("Failed to scrape product text");
  }
};
