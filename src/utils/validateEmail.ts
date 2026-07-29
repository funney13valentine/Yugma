export function isPPSUEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@ppsu.ac.in')
}