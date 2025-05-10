import { t } from 'elysia'
import mongoose, { HydratedDocument } from 'mongoose'
import {
  OptionalNullable,
  schemaOptions,
  timestampsSchema,
} from '../utils/schema'

export const pureUserSchema = t.Object({
  username: t.String({ minLength: 3 }),
  displayName: t.String({ minLength: 1 }),
  avatarUrl: OptionalNullable(t.String()),
})

export const pureUserWithHashedPasswordSchema = t.Intersect([
  pureUserSchema,
  t.Object({
    hashedPassword: t.String(),
  }),
])

export const userSchema = t.Intersect([pureUserSchema, timestampsSchema])
export const userWithHashedPasswordSchema = t.Intersect([
  pureUserWithHashedPasswordSchema,
  timestampsSchema,
])

export const userModelSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String, required: false },
    hashedPassword: {
      type: String,
      required: true,
      transform: () => undefined,
    },
  },
  schemaOptions,
)

export const UserModel = mongoose.model('User', userModelSchema)

export type HydratedUser = HydratedDocument<
  typeof userWithHashedPasswordSchema.static
>

export const createUserSchema = t.Intersect([
  pureUserSchema,
  t.Object({
    password: t.String({ minLength: 4 }),
  }),
])

export const updateUserSchema = t.Partial(
  t.Intersect([
    pureUserSchema,
    t.Object({
      oldPassword: t.String({ minLength: 4 }),
      password: t.String({ minLength: 4 }),
    }),
  ]),
)
