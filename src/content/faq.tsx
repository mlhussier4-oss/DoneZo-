import Link from "next/link";

/** Frequently asked questions (owner request 2026-11-15). Used by /faq and the Help page; keep in step with the product. */
export type Faq = { q: string; a: React.ReactNode };

export const homeownerFaqs: Faq[] = [
  { q: "Does it cost anything to post a job?", a: "No. Posting a job and getting bids are free, and you never enter a card to get quotes. You pay the pro you choose after the work is done: by card through HomeHire, or cash, Venmo, Cash App or check if they accept it." },
  { q: "Do I need an account?", a: "Yes, a free one: your first name, email and a password. Tick “Keep me signed in” and HomeHire opens already signed in, on the website and in the app." },
  { q: "Who can see my information?", a: "Pros see only your first name, your profile photo (if you add one), your ZIP code and the job's description and photos. HomeHire never gives them your email, phone number or address. After a pro confirms your job, a private chat opens and you send them your address yourself." },
  { q: "Will I get calls, texts or emails from pros?", a: "No. Pros can't contact you at all until you pick one, and then only through the private HomeHire chat. You decide what else to share." },
  { q: "How do bids work?", a: "Local pros send sealed bids: each sees only their own price. Bids appear live on your dashboard, side by side, with each pro's reviews, completed jobs and badges. Tap the one you want." },
  { q: "What happens after I pick a bid?", a: "That pro has 5 minutes to confirm your job and arrival time. If time is running low you can give them 10 more minutes. If they don't confirm, they lose the job and you can pick any of your other bids." },
  { q: "What if I need to cancel?", a: <>Before a pro confirms, there&apos;s no penalty. After they confirm, cancelling counts on your cancellation record. See the <Link href="/cancellation-policy">cancellation &amp; no-show policy</Link>.</> },
  { q: "What if the pro cancels or doesn't show up?", a: <>Use <strong>Report a problem</strong> on the job and choose “Provider cancelled”. Our team checks it, and confirmed cancellations count on the pro&apos;s record. You can pick another bid or post the job again.</> },
  { q: "What do the badges mean?", a: "Verified: HomeHire checked this pro's documents. Insured: the pro says they carry liability insurance (HomeHire hasn't checked the policy). Responds fast: usually confirms a picked job within 2 minutes." },
  { q: "Can I book the same pro again?", a: "Yes. After a job, tap “Book [pro] again” to post it again with the same answers (they get invited), or set up repeat visits: weekly, every 2 weeks or monthly." },
  { q: "Can I add photos to my review?", a: "Yes, up to 3 photos of the finished job. Reviews only come from customers who booked through HomeHire." },
  { q: "How do I delete my account?", a: <>Go to <Link href="/customer/account">Profile</Link> and choose “Delete my account”.</> },
];

export const providerFaqs: Faq[] = [
  { q: "What does HomeHire cost?", a: "HomeHire Basic is $9.99 a month for the marketplace, and your first month is free. HomeHire Pro is $19.99 a month for the marketplace plus business tools. HomeHire Priority is $39.99 a month: everything in Pro, plus a 5-minute head start on new jobs. Basic and Pro can be paid yearly with 2 months free. There are no fees per lead." },
  { q: "How does the Priority head start work?", a: "When a customer posts a job you serve, Priority pros get an alert (\"You have a 5-minute head start on your bid!\") and can see and bid on it for 5 minutes before other pros, so your bid is among the first the customer sees. If several Priority pros serve the job, they share the head start. If no Priority pro serves it, everyone sees it right away. Customers still choose whichever bid they like." },
  { q: "How does the free month work?", a: "Choose Basic and add a card. We place a temporary hold to confirm the card is real, then release it straight away. Your first payment is 30 days later. Cancel during the free month and you pay nothing." },
  { q: "What fees are there on payments?", a: "When a customer pays you by card through HomeHire, HomeHire keeps 10% and Stripe charges its processing fee. There's no HomeHire fee on cash, Venmo, Cash App or check." },
  { q: "How do I win jobs?", a: "You get an alert when a homeowner nearby posts a job in your services. Send a sealed bid with your price. If they pick you, confirm the job and your arrival time within 5 minutes. A private chat with the customer then opens, where they send you their address." },
  { q: "Why don't I get the customer's address or phone number?", a: "To protect homeowners' privacy, HomeHire never shares them. The customer sends their address in the chat once you've confirmed the job, and can share more if they choose." },
  { q: "What if I need to cancel?", a: <>Cancelling a job you&apos;ve confirmed counts on your cancellation record. 3 within 6 months removes you from the marketplace. See the <Link href="/cancellation-policy">cancellation &amp; no-show policy</Link>.</> },
  { q: "How do I get paid?", a: "Tap “Mark job completed” and choose the form of payment. Card sends the customer an invoice with a secure pay link, paid out to your own Stripe account. Cash, Venmo, Cash App or check records the payment as paid." },
  { q: "How do referrals work?", a: <>Share your link from <Link href="/provider/referrals">Refer &amp; earn</Link>. A referral counts once that pro is actually charged for their subscription (after any free month), whichever plan they choose. Every 2 that count earn you a free month of your own plan, whether you&apos;re on Basic, Pro or Priority. There&apos;s no limit.</> },
  { q: "What are ranks and badges?", a: "Your rank grows with completed jobs: Bronze at 5, Silver at 25, Gold at 50 and Emerald at 100. Badges like Insured and Responds fast show on your bids and profile." },
  { q: "Do I have to use the marketplace?", a: "No. On HomeHire Pro you can use the business tools on their own and switch the marketplace on or off any time in Business settings." },
  { q: "How do I cancel my subscription or delete my account?", a: <>Cancel from <Link href="/provider/plan">Plan &amp; billing</Link> → “Manage billing”. To delete your account, go to <Link href="/provider/settings">Business settings</Link> → “Delete my account”.</> },
];
