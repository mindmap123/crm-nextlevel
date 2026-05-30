export function isAuthorized(
  authorization: string | null,
  expectedUser: string | undefined,
  expectedPassword: string | undefined,
) {
  if (!expectedUser || !expectedPassword || !authorization?.startsWith("Basic ")) {
    return false;
  }

  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const separator = decoded.indexOf(":");
    if (separator === -1) return false;

    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return user === expectedUser && password === expectedPassword;
  } catch {
    return false;
  }
}
