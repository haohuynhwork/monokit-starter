// 'Name <address>', quoting the name when it has special characters
export function fromHeader(t: { fromName: string; fromEmail: string }): string {
  if (!t.fromName) {
    return t.fromEmail;
  }
  const name = /^[\w .-]+$/.test(t.fromName)
    ? t.fromName
    : `"${t.fromName.replace(/["\\]/g, "\\$&")}"`;
  return `${name} <${t.fromEmail}>`;
}
