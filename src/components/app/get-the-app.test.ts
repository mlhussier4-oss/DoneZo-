import { describe, expect, it } from "vitest";
import { appStoreLinks } from "./get-the-app";

describe("app download links", () => {
  it("stay hidden until real store links are set", () => {
    expect(appStoreLinks({})).toEqual({ ios: null, android: null });
    expect(appStoreLinks({ NEXT_PUBLIC_APP_STORE_URL: "not a link" })).toEqual({ ios: null, android: null });
    expect(appStoreLinks({ NEXT_PUBLIC_APP_STORE_URL: "https://apps.apple.com/us/app/homehire/id1", NEXT_PUBLIC_PLAY_STORE_URL: "https://play.google.com/store/apps/details?id=us.homehire.app" }))
      .toEqual({ ios: "https://apps.apple.com/us/app/homehire/id1", android: "https://play.google.com/store/apps/details?id=us.homehire.app" });
  });
});
