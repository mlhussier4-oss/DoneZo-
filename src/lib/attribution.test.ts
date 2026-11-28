import { describe, expect, it } from "vitest";
import { attributionFromVisit, decodeAttribution, encodeAttribution } from "./attribution";

const own = ["homehire.us", "localhost", "127.0.0.1"];

describe("sign-up source tracking", () => {
  it("records ad tags, the landing page and a referral code", () => {
    const a = attributionFromVisit(new URL("https://homehire.us/post-job?utm_source=Facebook&utm_medium=paid&utm_campaign=austin_lawn&ref=ABCD12"), null, own);
    expect(a).toEqual({ source: "facebook", medium: "paid", campaign: "austin_lawn", landing: "/post-job", ref: "abcd12" });
  });

  it("records the outside website that linked here, but not HomeHire's own pages", () => {
    expect(attributionFromVisit(new URL("https://homehire.us/"), "https://www.google.com/search?q=x", own).referrer).toBe("google.com");
    expect(attributionFromVisit(new URL("https://homehire.us/faq"), "https://homehire.us/", own).referrer).toBeUndefined();
  });

  it("survives the cookie round trip and drops anything unexpected", () => {
    const a = attributionFromVisit(new URL("https://homehire.us/?utm_source=tiktok"), null, own);
    expect(decodeAttribution(encodeAttribution(a))).toEqual(a);
    expect(decodeAttribution(encodeURIComponent(JSON.stringify({ source: "<script>", evil: "x" })))).toEqual({ source: "script" });
    expect(decodeAttribution("not json")).toBeNull();
  });
});
