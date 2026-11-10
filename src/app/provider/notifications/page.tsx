import type { Metadata } from "next";
import { NotificationList } from "@/components/marketplace/notification-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";

export const metadata: Metadata = { title: "Notifications" };

export default async function ProviderNotificationsPage() {
  const { user, business } = await requireProvider();
  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationList userId={user.id} timeZone={business.timezone} />
    </>
  );
}
