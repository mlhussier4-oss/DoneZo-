/** "Keep me signed in" (owner request 2026-11-13): ticked by default so DoneZo opens already signed in. */
export function RememberMe() {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" name="remember" defaultChecked className="size-5 accent-[var(--primary)]" />
      <span>Keep me signed in <span className="text-muted-foreground">(untick on a shared computer)</span></span>
    </label>
  );
}
