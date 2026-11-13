import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="[date of attorney approval]">
      <p>HomeHire is operated by [business legal name], [business address] (&ldquo;HomeHire&rdquo;, &ldquo;we&rdquo;). This policy explains what we collect when you use HomeHire, why, who can see it, and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address and, for providers, your business name, phone number, description and service area. Providers sign in with a password; customers sign in with a code we email to them.</li>
        <li><strong>Job details:</strong> the job descriptions, photos, ZIP codes and addresses that customers post, and the bids, messages and photos exchanged after a bid is accepted.</li>
        <li><strong>Business records (providers):</strong> the customers, jobs, schedules, estimates, invoices, notes and payment records a provider keeps in HomeHire. The provider controls these records; we store them on their behalf.</li>
        <li><strong>Payments:</strong> card payments and subscriptions are handled by Stripe. We never see or store full card numbers. We receive the payment amount, status and a reference from Stripe. Providers&apos; bank and identity details for payouts are collected by Stripe, not by us.</li>
        <li><strong>Technical data:</strong> sign-in cookies that keep you logged in, and server logs (time, page requested, error codes) that help us keep HomeHire running and secure. We don&apos;t use advertising or tracking cookies.</li>
      </ul>

      <h2>Who can see what</h2>
      <ul>
        <li>When a customer posts a job, nearby providers who offer that service see the description, photos, timing and ZIP code, <strong>but not the customer&apos;s name or full address</strong>.</li>
        <li>Bids are sealed: a provider can&apos;t see other providers&apos; bids.</li>
        <li>Only after the customer accepts a bid does the chosen provider see the customer&apos;s name, full address and contact details, and messaging opens between them.</li>
        <li>A provider&apos;s business records are visible only to that provider and the team members they add. Employees see only the jobs assigned to them.</li>
        <li>HomeHire administrators can access accounts to provide support, verify providers, and prevent fraud or abuse. Administrator actions are logged.</li>
      </ul>

      <h2>Companies that help us run HomeHire</h2>
      <p>We share information only as needed to run the service: Stripe (payments), Supabase (database, file storage and sign-in emails), and [hosting provider] (website hosting). They process data on our instructions. We don&apos;t sell your personal information and don&apos;t share it for advertising.</p>
      <p>We may disclose information if the law requires it, or to protect the safety of people using HomeHire.</p>

      <h2>How long we keep it</h2>
      <p>We keep your information while your account is open. Payment and invoice records may need to be kept for [number] years for tax and accounting reasons, even after an account is closed. [Retention periods to be confirmed with an attorney/accountant.]</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>You can view and update your profile in your account settings.</li>
        <li>You can ask us for a copy of your information, or ask us to correct or delete it, from the <Link href="/help">Help page</Link> (choose &ldquo;Privacy or my data&rdquo;). Some records may need to be kept as described above.</li>
        <li>Providers can download their payment records as a spreadsheet from Reports.</li>
      </ul>

      <h2>Security</h2>
      <p>Data is encrypted in transit. Access is restricted in the database itself, so one provider can never read another provider&apos;s records. No system is perfectly secure; if we learn of a breach affecting you, we&apos;ll tell you as the law requires.</p>

      <h2>Children</h2>
      <p>HomeHire is for adults. You must be at least 18 to create an account.</p>

      <h2>Changes and contact</h2>
      <p>If we make important changes we&apos;ll tell you in HomeHire or by email. Questions: use the <Link href="/help">Help page</Link> or write to [support email / mailing address].</p>
    </LegalPage>
  );
}
