export type UserRole = 'admin' | 'administrativo'

export function normalizeRole(value: string | null | undefined): UserRole | null {
  if (value === 'admin' || value === 'administrativo') {
    return value
  }
  return null
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

export function roleLabel(role: UserRole | null | undefined): string {
  if (role === 'admin') return 'Administrador'
  if (role === 'administrativo') return 'Administrativo'
  return 'Usuario'
}
