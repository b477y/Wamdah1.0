import puppeteer from "puppeteer";

export const scrapeText = async (url) => {
  const browser = await puppeteer.launch({ headless: "new" }); // Launch browser
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Extract paragraphs or specific content
    const text = await page.evaluate(() => {
      const elements = document.querySelectorAll("p"); // Modify selector if needed
      return Array.from(elements)
        .map((el) => el.innerText)
        .join("\n");
    });

    await browser.close();
    return text;
  } catch (error) {
    console.error("Scraping failed:", error);
    await browser.close();
    throw new Error("Failed to scrape text");
  }
};
