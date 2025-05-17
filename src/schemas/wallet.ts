import { t } from 'elysia'
import mongoose, { HydratedDocument } from 'mongoose'
import {
  objectIdSchema,
  schemaOptions,
  timestampsSchema,
} from '../utils/schema'
import { userSchema } from './user'

export const pureWalletSchema = t.Object({
  name: t.String({ minLength: 1 }),
  currency: t.String({ minLength: 1, default: 'VND' }),
  balance: t.Number({ default: 0 }),
  ratio: t.Number({ minimum: 0, default: 1 }),
})

export const walletSchema = t.Intersect([
  t.Object({
    user: t.Union([userSchema, objectIdSchema]),
  }),
  pureWalletSchema,
  timestampsSchema,
])

export const walletModelSchema = new mongoose.Schema(
  {
    user: {
      type: 'ObjectId',
      ref: 'User',
      required: true,
      transform: () => undefined,
    },
    name: { type: String, required: true, unique: true },
    currency: { type: String, required: true },
    balance: { type: Number, required: true, default: 0 },
    ratio: { type: Number, required: true, default: 1 },
  },
  schemaOptions,
)

export const WalletModel = mongoose.model('Wallet', walletModelSchema)

export type HydratedWallet = HydratedDocument<typeof walletSchema.static>

export const updateWalletSchema = t.Partial(
  t.Omit(pureWalletSchema, ['balance']),
)

export const walletNoUserSchema = t.Omit(walletSchema, ['user'])
