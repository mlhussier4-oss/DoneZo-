import "server-only";
import { headers } from "next/headers";
import { platformFromUserAgent, type AppPlatform } from "./platform";

/** Which HomeHire app made this request, if any (null in a normal browser). */
export async function appPlatform(): Promise<AppPlatform | null> {
  return platformFromUserAgent((await headers()).get("user-agent"));
}

/** True inside the iPhone/iPad app, where subscription purchases are not offered (Apple rule). */
export async function isIosApp(): Promise<boolean> {
  return (await appPlatform()) === "ios";
}

export const IOS_PLAN_MESSAGE =
  "Plans and billing are managed on the HomeHire website. Sign in at homehire.us in any web browser to subscribe, change your plan or update your card.";
