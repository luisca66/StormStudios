// Run against this app's Vite server; Chromium uses a synthetic microphone.
import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = 18000 + Math.floor(Math.random() * 5000);
const url = process.env.MIC_APP_URL ?? `http://127.0.0.1:${port}/`;
const server = process.env.MIC_APP_URL ? null : spawn(process.execPath,
  [fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url)), "--host", "127.0.0.1", "--port", String(port)],
  { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: "ignore", windowsHide: true });

let browser;
try {
  await expect.poll(async () => { try { return (await fetch(url)).status; } catch { return 0; } }, { timeout: 10000 }).toBe(200);
  browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ permissions: ["microphone"] });
  await page.addInitScript(() => {
    window.__micStreams = [];
    const acquire = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await acquire(constraints);
      window.__micStreams.push(stream);
      return stream;
    };
  });
  await page.goto(url);
  const liveTracks = () => page.evaluate(() => window.__micStreams.flatMap((stream) => stream.getTracks()).filter((track) => track.readyState === "live").length);
  const captures = () => page.evaluate(() => window.__micStreams.length);
  await page.locator("#start-btn").click();
  await expect(page.locator("#hud")).not.toHaveClass(/hidden/);
  await expect.poll(liveTracks).toBe(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-screen")).not.toHaveClass(/hidden/);
  await expect.poll(liveTracks).toBe(0);
  await page.locator("#pause-resume").click();
  await expect.poll(captures).toBe(2);
  await expect.poll(liveTracks).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(liveTracks).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#pause-screen")).not.toHaveClass(/hidden/);
  expect(await captures()).toBe(2);
  await page.locator("#pause-resume").click();
  await expect.poll(liveTracks).toBe(1);
  await page.keyboard.press("Escape");
  await page.locator("#pause-quit").click();
  await expect(page.locator("#menu-screen")).not.toHaveClass(/hidden/);
  await expect.poll(liveTracks).toBe(0);
  await page.locator("#start-btn").click();
  await expect.poll(liveTracks).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect.poll(liveTracks).toBe(0);
  console.log("Aerostato microphone browser lifecycle passed: pause, resume, hidden, menu, pagehide.");
} finally {
  await browser?.close();
  server?.kill();
}
