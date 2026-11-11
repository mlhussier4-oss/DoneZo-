"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { categoryIconNames, CategoryIcon } from "@/components/brand/category-icon";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveCategory, type AdminState } from "../actions";

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CategoryForm({ category, submitLabel }: { category?: CategoryRow; submitLabel: string }) {
  const [state, action] = useFormAction<AdminState>(saveCategory, { status: "idle" });
  const idp = category?.id ?? "new";
  return (
    <Form form={action}  className="grid gap-3 sm:grid-cols-6 sm:items-end">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`name-${idp}`}>Name</Label>
        <Input id={`name-${idp}`} name="name" defaultValue={category?.name} required maxLength={80} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`slug-${idp}`}>Slug (used in links)</Label>
        <Input id={`slug-${idp}`} name="slug" defaultValue={category?.slug} required maxLength={60} pattern="[a-z0-9-]+" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`icon-${idp}`}>Icon</Label>
        <select id={`icon-${idp}`} name="icon" defaultValue={category?.icon ?? "wrench"} className={selectClass}>
          {categoryIconNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`order-${idp}`}>Order</Label>
        <Input id={`order-${idp}`} name="sortOrder" type="number" min={0} max={1000} defaultValue={category?.sort_order ?? 0} />
      </div>
      <div className="space-y-1.5 sm:col-span-4">
        <Label htmlFor={`desc-${idp}`}>Description</Label>
        <Input id={`desc-${idp}`} name="description" defaultValue={category?.description ?? ""} maxLength={500} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`active-${idp}`}>Visible</Label>
        <select id={`active-${idp}`} name="isActive" defaultValue={category?.is_active === false ? "false" : "true"} className={selectClass}>
          <option value="true">Visible</option>
          <option value="false">Hidden</option>
        </select>
      </div>
      <Button type="submit" disabled={action.pending} variant={category ? "outline" : "primary"}>
        {category ? <CategoryIcon name={category.icon} /> : null}
        {action.pending ? "Saving…" : submitLabel}
      </Button>
      {state.message ? (
        <Alert tone={state.status === "error" ? "error" : "success"} className="sm:col-span-6">
          {state.message}
        </Alert>
      ) : null}
    </Form>
  );
}
