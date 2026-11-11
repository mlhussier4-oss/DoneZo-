import type { Metadata } from "next";
import { NotificationList } from "@/components/marketplace/notification-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Notifications" };

export default async function CustomerNotificationsPage() {
  const user = await requireRole("customer");
  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationList userId={user.id} timeZone="America/Chicago" />
    </>
  );
}
