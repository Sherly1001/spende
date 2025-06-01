import { t } from 'elysia'
import mongoose, { HydratedDocument } from 'mongoose'
import {
  cssColorSchema,
  objectIdSchema,
  OptionalNullable,
  schemaOptions,
  timestampsSchema,
} from '../utils/schema'
import { userSchema } from './user'
import { walletNoUserSchema } from './wallet'

export const pureTagSchema = t.Object({
  name: t.String({ minLength: 1 }),
  color: cssColorSchema,
})

export const tagSchema = t.Intersect([
  t.Object({
    user: t.Union([userSchema, objectIdSchema]),
  }),
  pureTagSchema,
  timestampsSchema,
])

export const tagModelSchema = new mongoose.Schema(
  {
    user: {
      type: 'ObjectId',
      ref: 'User',
      required: true,
      transform: () => undefined,
    },
    name: { type: String, required: true, unique: true },
    color: { type: String, required: true },
  },
  schemaOptions,
)

export const TagModel = mongoose.model('Tag', tagModelSchema)

export type HydratedTag = HydratedDocument<typeof tagSchema.static>

export const updateTagSchema = t.Partial(pureTagSchema)

export const tagNoUserSchema = t.Omit(tagSchema, ['user'])

export const transactionTypeValues = ['INCOME', 'OUTCOME', 'TRANSFER'] as const
export const transactionTypeSchema = t.UnionEnum(transactionTypeValues, {
  description: `Transaction Type: ${transactionTypeValues.join(' | ')}`,
})

export type TransactionType = typeof transactionTypeSchema.static

export const pureTransactionSchema = t.Object({
  transactionType: transactionTypeSchema,
  amount: t.Number({ default: 0 }),
  wallet: t.Union([walletNoUserSchema, objectIdSchema]),
  targetWallet: OptionalNullable(t.Union([walletNoUserSchema, objectIdSchema])),
  fee: t.Number({ default: 0 }),
  ratio: t.Number({ default: 1 }),
  date: t.Date(),
  note: OptionalNullable(t.String()),
  tags: t.Array(t.Union([tagNoUserSchema, objectIdSchema])),
})

export const transactionSchema = t.Intersect([
  pureTransactionSchema,
  timestampsSchema,
])

export const transactionModelSchema = new mongoose.Schema(
  {
    wallet: {
      type: 'ObjectId',
      ref: 'Wallet',
      required: true,
    },
    targetWallet: {
      type: 'ObjectId',
      ref: 'Wallet',
      required: false,
    },
    tags: {
      type: ['ObjectId'],
      ref: 'Tag',
      required: true,
    },
    transactionType: {
      type: String,
      enum: transactionTypeValues,
      required: true,
    },
    amount: { type: Number, default: 0, required: true },
    fee: { type: Number, default: 0, required: true },
    ratio: { type: Number, default: 1, required: true },
    date: { type: Date, required: true },
    note: { type: String, required: false },
  },
  schemaOptions,
)

export const TransactionModel = mongoose.model<HydratedTransaction>(
  'Transaction',
  transactionModelSchema,
)

export type HydratedTransaction = HydratedDocument<
  typeof transactionSchema.static
>

export const createTransactionSchema = t.Intersect([
  t.Omit(pureTransactionSchema, ['wallet', 'targetWallet', 'tags']),
  t.Object({
    wallet: objectIdSchema,
    targetWallet: t.Optional(objectIdSchema),
    tags: t.Array(objectIdSchema),
  }),
])

export const updateTransactionSchema = t.Partial(createTransactionSchema)

export const getTransactionQuerySchema = t.Partial(
  t.Object({
    transactionTypes: t.Array(transactionTypeSchema),
    walletIds: t.Array(objectIdSchema),
    targetWalletIds: t.Array(objectIdSchema),
    tagIds: t.Array(objectIdSchema),
    amountAbove: t.Number(),
    amountBelow: t.Number(),
    note: t.String(),
    after: t.Date(),
    before: t.Date(),
    limit: t.Number({ default: 20, minimum: 1 }),
    page: t.Number({ default: 1, minimum: 1 }),
    sortBy: t.Array(
      t.String({
        pattern:
          '^-?(date|transactionType|wallet\\.name|targetWallet\\.name|wallet\\.currency|targetWallet\\.currency)$',
        description: 'sort keys',
      }),
      {
        default: ['-date'],
      },
    ),
  }),
)
