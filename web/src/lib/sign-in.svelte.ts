// Global sign-in dialog state: any surface (header, review form, app page)
// can open the same magic-link dialog, rendered once by AuthMenu in the
// layout header.
export const signIn = $state({ open: false });

export function openSignIn() {
  signIn.open = true;
}

export function closeSignIn() {
  signIn.open = false;
}
