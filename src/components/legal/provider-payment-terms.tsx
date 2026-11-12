/**
 * Provider terms (owner requests 2026-11-12): friendly in tone, but clear that providers run their own business,
 * are responsible for their work on the jobsite and for collecting payment, and that DoneZo doesn't guarantee either.
 * Shown on /terms, at sign-up and on the acceptance screen. Draft wording: must be reviewed by an attorney before public launch.
 */
export function ProviderPaymentTerms() {
  return (
    <div className="space-y-4">
      <p>
        <strong>The short version:</strong> you run your own business. DoneZo gives you tools to find jobs, stay organized
        and get paid. The work itself, and the payment for it, are between you and your customer.
      </p>

      <div className="space-y-2">
        <p className="font-semibold">Bidding</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Your bid is your final price.</strong> Bid only on jobs you intend to do, at the price you&apos;ll
            charge for the job as described. Once a customer picks your bid and you confirm, you do the job at that price.
            If the customer asks for extra work, you can send a change request for them to approve.
          </li>
          <li>
            <strong>Bids must be real.</strong> Fake, placeholder or misleading bids, or bids you don&apos;t intend to honor,
            aren&apos;t allowed. A provider who places them loses access to the DoneZo marketplace.
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <p className="font-semibold">Getting paid</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>You collect payment from your customer.</strong> You set your price, send your invoice and collect what
            you&apos;re owed, including following up if a customer pays late or doesn&apos;t pay.
          </li>
          <li>
            <strong>Card payments run through Stripe.</strong> When a customer pays by card through DoneZo, Stripe processes
            the payment and sends it to your own Stripe account. DoneZo keeps its 10% fee. A card payment counts as paid once
            Stripe confirms it. Refunds and card disputes are handled between you, your customer and Stripe.
          </li>
          <li>
            <strong>Cash, Venmo, Cash App and check are between you and your customer.</strong> DoneZo doesn&apos;t handle
            or check these. When you mark a job paid with one of them, you&apos;re confirming you received the money.
          </li>
          <li>
            <strong>DoneZo doesn&apos;t guarantee payment.</strong> DoneZo isn&apos;t a collection agency, guarantor or
            escrow service, and isn&apos;t responsible for a customer who pays late, pays less, reverses a payment or
            doesn&apos;t pay.
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <p className="font-semibold">Your work on the job</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>You&apos;re an independent business,</strong> not an employee or agent of DoneZo. You decide how to do
            the work, and you supply your own tools, equipment and crew.
          </li>
          <li>
            <strong>You&apos;re responsible for the job and the jobsite:</strong> the quality and safety of your work, any
            damage to property, and any injury to you, your crew, your customer or anyone else connected with the work.
          </li>
          <li>
            <strong>You keep the licenses, permits and insurance your work requires,</strong> and you handle your own taxes.
          </li>
          <li>
            <strong>Disagreements about a job are between you and your customer.</strong> DoneZo may help by reviewing
            reports and can take action on accounts, but isn&apos;t responsible for resolving them.
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <p className="font-semibold">Keeping things fair</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You agree not to hold DoneZo responsible for amounts your customers owe you, or for anything that happens on a
            job or jobsite, and to cover DoneZo if someone makes a claim against it because of your work or your dealings
            with your customer. [Release, indemnity and liability wording to be finalized by an attorney.]
          </li>
          <li>Your subscription covers your use of DoneZo, so it&apos;s due whether or not a customer pays you.</li>
          <li>Invoices, payment records and messages in DoneZo are there to help you. DoneZo doesn&apos;t collect or chase payments for you.</li>
        </ul>
      </div>
    </div>
  );
}
