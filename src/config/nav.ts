import type { NavItem } from "@/components/layout/app-shell";

export function customerNav(unread = 0): NavItem[] {
  return [
    { href: "/customer", label: "Home", icon: "home", exact: true },
    { href: "/customer/requests", label: "My requests", icon: "briefcase" },
    { href: "/customer/messages", label: "Messages", icon: "message" },
    { href: "/customer/payments", label: "Payments", icon: "card" },
    { href: "/customer/notifications", label: "Notifications", icon: "bell", badge: unread },
    { href: "/customer/account", label: "Account", icon: "settings" },
  ];
}

/** Provider navigation (Blueprint §10). Marketplace appears only when enabled; business tools only on Pro. */
export function providerNav(marketplaceEnabled: boolean, unread = 0, hasCrm = true, newJobs = 0): NavItem[] {
  if (!hasCrm) {
    // DoneZo Basic: the marketplace plan.
    return [
      { href: "/provider/marketplace", label: "Marketplace", icon: "store", badge: newJobs, badgeTone: "alert" },
      { href: "/provider/calendar", label: "Calendar", icon: "calendar" },
      { href: "/provider/payments", label: "Payments", icon: "card" },
      { href: "/provider/notifications", label: "Notifications", icon: "bell", badge: unread },
      { href: "/provider/plan", label: "Plan & billing", icon: "plan" },
      { href: "/provider/settings", label: "Business settings", icon: "settings" },
    ];
  }
  const items: NavItem[] = [
    { href: "/provider", label: "Overview", icon: "gauge", exact: true },
    { href: "/provider/calendar", label: "Calendar", icon: "calendar" },
    { href: "/provider/customers", label: "Customers", icon: "users" },
    { href: "/provider/jobs", label: "Jobs", icon: "briefcase" },
    { href: "/provider/invoices", label: "Invoices", icon: "invoice" },
    { href: "/provider/payments", label: "Payments", icon: "card" },
  ];
  if (marketplaceEnabled) items.push({ href: "/provider/marketplace", label: "Marketplace", icon: "store", badge: newJobs, badgeTone: "alert" });
  items.push({ href: "/provider/notifications", label: "Notifications", icon: "bell", badge: unread });
  items.push(
    { href: "/provider/employees", label: "Team", icon: "userCog" },
    { href: "/provider/reports", label: "Reports", icon: "chart" },
    { href: "/provider/plan", label: "Plan & billing", icon: "plan" },
    { href: "/provider/settings", label: "Business settings", icon: "settings" },
  );
  return items;
}

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "gauge", exact: true },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/businesses", label: "Businesses", icon: "store" },
  { href: "/admin/categories", label: "Service categories", icon: "tags" },
  { href: "/admin/marketplace", label: "Marketplace", icon: "briefcase" },
  { href: "/admin/service-areas", label: "Service areas", icon: "map" },
  { href: "/admin/payments", label: "Payments", icon: "card" },
  { href: "/admin/reports", label: "Support inbox", icon: "flag" },
  { href: "/admin/audit-log", label: "Audit log", icon: "log" },
];

/** Employees see only their own work (permissions are enforced in the database too). */
export function employeeNav(unread = 0): NavItem[] {
  return [
    { href: "/provider/my-jobs", label: "My jobs", icon: "briefcase" },
    { href: "/provider/calendar", label: "Calendar", icon: "calendar" },
    { href: "/provider/route", label: "Route", icon: "map" },
    { href: "/provider/notifications", label: "Notifications", icon: "bell", badge: unread },
  ];
}
