import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="[date of attorney approval]">
      <p>These terms are an agreement between you and [business legal name] (&ldquo;DoneZo&rdquo;, &ldquo;we&rdquo;). By creating an account or using DoneZo you agree to them. Please also read our <Link href="/privacy">Privacy policy</Link>.</p>

      <h2>What DoneZo is</h2>
      <p>DoneZo has two parts: a <strong>marketplace</strong> where customers post home-service jobs and receive sealed bids from local providers, and <strong>business-management software</strong> that providers use to run their business, with or without the marketplace.</p>
      <p>DoneZo is not a contractor and does not perform any work. Each job is an agreement between the customer and the provider they choose. Providers are independent businesses, not DoneZo employees or agents. [Scope of DoneZo&apos;s responsibility to be confirmed by an attorney.]</p>

      <h2>Accounts</h2>
      <ul>
        <li>You must be at least 18 and give accurate information.</li>
        <li>Keep your sign-in details private. You&apos;re responsible for activity on your account, including by team members you add.</li>
        <li>We may suspend accounts that break these terms, harm other users, or put the service at risk.</li>
      </ul>

      <h2>For customers</h2>
      <ul>
        <li>Posting a job and accepting a bid are free. You don&apos;t enter a card to post or accept.</li>
        <li>When you accept a bid, the chosen provider receives your name, address and contact details so they can do the job.</li>
        <li>You pay the provider directly: by card through DoneZo when they send a payment request, or another way you agree with them.</li>
        <li>Reviews must be honest and about your own experience.</li>
      </ul>

      <h2>For providers</h2>
      <ul>
        <li><strong>Subscription:</strong> using DoneZo&apos;s business tools and marketplace requires an active subscription of <strong>$9.99 per month</strong>, billed by Stripe at sign-up and monthly after that until you cancel. There is no free trial. You can cancel at any time from &ldquo;Manage billing&rdquo;. Your records are kept if your subscription ends. [When access ends after cancelling, and refund rules for subscription fees, to be confirmed.]</li>
        <li><strong>Card payment fee:</strong> when your customer pays you by card through DoneZo, DoneZo keeps <strong>10% of the payment</strong>. Stripe also charges its own processing fee. There is no DoneZo fee on cash, Venmo, Cash App or check payments you record. If a card payment is refunded, DoneZo&apos;s 10% is refunded too.</li>
        <li>Card payments are paid out to your own Stripe account, under Stripe&apos;s terms, which you accept when you connect Stripe.</li>
        <li>You&apos;re responsible for holding any licenses, permits and insurance your work requires, for the quality and safety of your work, and for your own taxes.</li>
        <li>Bids are sealed and are your price for the job described. You may only see a customer&apos;s full address and message them after they accept your bid.</li>
        <li>You own your customer records. Use them only for your business and in line with privacy law.</li>
      </ul>

      <h2>Things not allowed</h2>
      <ul>
        <li>Fake jobs, bids, reviews or accounts.</li>
        <li>Harassment, discrimination, or unsafe behavior toward anyone using DoneZo.</li>
        <li>Trying to access other users&apos; information or to interfere with the service.</li>
      </ul>

      <h2>Problems and disputes</h2>
      <p>If something goes wrong with a job, contact the other person first through DoneZo, then use the <Link href="/help">Help page</Link> or &ldquo;Report a problem&rdquo; on the booking. We&apos;ll review reports and may suspend accounts, but disputes about the work itself are between the customer and the provider. [Dispute-resolution, governing law (e.g. Texas) and arbitration terms to be written by an attorney.]</p>

      <h2>Disclaimers and liability</h2>
      <p>[Warranty disclaimer and limitation-of-liability language to be written by an attorney.]</p>

      <h2>Changes</h2>
      <p>We may update these terms. If changes are important we&apos;ll tell you in DoneZo or by email before they take effect. Questions: use the <Link href="/help">Help page</Link>.</p>
    </LegalPage>
  );
}
