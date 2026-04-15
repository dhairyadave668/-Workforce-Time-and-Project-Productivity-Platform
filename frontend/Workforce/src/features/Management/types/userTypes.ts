export type User = {
  id: string
  name: string
  email: string
  role: string
  createdOn: string
}

export type CreateUserPayload = {
  employeeId: string
  name: string
  email: string
  role: string
}

export type UpdateUserRolePayload = {
  roleName: string
}

export type ErrorResponse = {
  message?: string
}