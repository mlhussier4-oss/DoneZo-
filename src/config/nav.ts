import type { NavItem } from "@/components/layout/app-shell";

export const customerNav: NavItem[] = [
  { href: "/customer", label: "Home", icon: "home", exact: true },
  { href: "/customer/requests", label: "My requests", icon: "briefcase" },
  { href: "/customer/messages", label: "Messages", icon: "message" },
  { href: "/customer/payments", label: "Payments", icon: "card" },
  { href: "/customer/account", label: "Account", icon: "settings" },
];

/** Provider navigation (Blueprint §10). Marketplace appears only when enabled. */
export function providerNav(marketplaceEnabled: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: "/provider", label: "Overview", icon: "gauge", exact: true },
    { href: "/provider/calendar", label: "Calendar", icon: "calendar" },
    { href: "/provider/customers", label: "Customers", icon: "users" },
    { href: "/provider/jobs", label: "Jobs", icon: "briefcase" },
    { href: "/provider/invoices", label: "Invoices", icon: "invoice" },
    { href: "/provider/payments", label: "Payments", icon: "card" },
  ];
  if (marketplaceEnabled) items.push({ href: "/provider/marketplace", label: "Marketplace", icon: "store" });
  items.push(
    { href: "/provider/employees", label: "Employees", icon: "userCog" },
    { href: "/provider/reports", label: "Reports", icon: "chart" },
    { href: "/provider/settings", label: "Business settings", icon: "settings" },
  );
  return items;
}

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "gauge", exact: true },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/businesses", label: "Businesses", icon: "store" },
  { href: "/admin/categories", label: "Service categories", icon: "tags" },
  { href: "/admin/audit-log", label: "Audit log", icon: "log" },
];
