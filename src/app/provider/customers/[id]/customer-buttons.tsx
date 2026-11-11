"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAddress, deleteNote, makeAddressPrimary, setCustomerArchived } from "../actions";

export function ArchiveButton({ customerId, archived }: { customerId: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!archived && !confirm("Archive this customer? Their history is kept and you can restore them any time.")) return;
        start(() => setCustomerArchived(customerId, !archived));
      }}
    >
      {archived ? "Restore customer" : "Archive"}
    </Button>
  );
}

export function AddressActions({ customerId, addressId, isPrimary }: { customerId: string; addressId: string; isPrimary: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      {!isPrimary ? (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => makeAddressPrimary(customerId, addressId))}>
          Make primary
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm("Remove this address? Addresses used by jobs can't be removed.")) start(() => deleteAddress(addressId));
        }}
      >
        Remove
      </Button>
    </div>
  );
}

export function DeleteNoteButton({ noteId }: { noteId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm("Delete this note?") && start(() => deleteNote(noteId))}
      className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
    >
      Delete
    </button>
  );
}
