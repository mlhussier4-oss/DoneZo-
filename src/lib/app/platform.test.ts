import { describe, expect, it } from "vitest";
import { platformFromUserAgent } from "./platform";

describe("platformFromUserAgent", () => {
  it("detects the iPhone app", () => {
    expect(platformFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HomeHireApp/ios")).toBe("ios");
  });
  it("detects the Android app", () => {
    expect(platformFromUserAgent("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 HomeHireApp/android")).toBe("android");
  });
  it("treats normal browsers, including Safari on iPhone, as the website", () => {
    expect(platformFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBeNull();
    expect(platformFromUserAgent(null)).toBeNull();
  });
});
