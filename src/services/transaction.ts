import { Elysia, t } from 'elysia'
import { Types } from 'mongoose'
import { transactionRepo } from '../repos'
import {
  createTransactionSchema,
  getTransactionQuerySchema,
  pureTagSchema,
  tagNoUserSchema,
  transactionSchema,
  updateTagSchema,
  updateTransactionSchema,
} from '../schemas/transaction'
import { objectIdSchema } from '../utils/schema'
import { auth } from './user'

export const transaction = new Elysia({
  prefix: 'transactions',
  tags: ['Transactions'],
})
  .use(auth)
  .get(
    '/',
    ({ user, query }) => transactionRepo.getTransactions(user._id, query),
    {
      query: getTransactionQuerySchema,
      response: t.Object({
        data: t.Array(transactionSchema),
        total: t.Number(),
        limit: t.Number(),
        page: t.Number(),
      }),
    },
  )
  .post(
    '/',
    async ({ user, body: { data } }) => ({
      data: await transactionRepo
        .createTransaction(user._id, data)
        .then((t) => t.toJSON({ flattenObjectIds: true })),
    }),
    {
      body: t.Object({
        data: createTransactionSchema,
      }),
      response: t.Object({
        data: transactionSchema,
      }),
    },
  )
  .put(
    '/:transactionId',
    async ({ user, body: { data }, params: { transactionId } }) => ({
      data: await transactionRepo
        .updateTransaction(
          user._id,
          Types.ObjectId.createFromHexString(transactionId),
          data,
        )
        .then((t) => t.toJSON()),
    }),
    {
      body: t.Object({
        data: updateTransactionSchema,
      }),
      params: t.Object({
        transactionId: objectIdSchema,
      }),
      response: t.Object({
        data: transactionSchema,
      }),
    },
  )
  .delete(
    '/:transactionId',
    async ({ user, params: { transactionId } }) => ({
      data: await transactionRepo
        .deleteTransaction(
          user._id,
          Types.ObjectId.createFromHexString(transactionId),
        )
        .then((t) => t.toJSON()),
    }),
    {
      params: t.Object({
        transactionId: objectIdSchema,
      }),
      response: t.Object({
        data: transactionSchema,
      }),
    },
  )
  .get(
    '/tags',
    async ({ user }) => ({
      data: await transactionRepo
        .getTags(user._id)
        .then((ts) => ts.map((t) => t.toJSON())),
    }),
    {
      response: t.Object({
        data: t.Array(tagNoUserSchema),
      }),
    },
  )
  .post(
    '/tags',
    async ({ user, body: { data } }) => ({
      data: await transactionRepo
        .createTag(user._id, data)
        .then((t) => t.toJSON()),
    }),
    {
      body: t.Object({
        data: pureTagSchema,
      }),
      response: t.Object({
        data: tagNoUserSchema,
      }),
    },
  )
  .put(
    '/tags/:tagId',
    async ({ user, body: { data }, params: { tagId } }) => ({
      data: await transactionRepo
        .updateTag(user._id, Types.ObjectId.createFromHexString(tagId), data)
        .then((t) => t.toJSON()),
    }),
    {
      body: t.Object({
        data: updateTagSchema,
      }),
      params: t.Object({
        tagId: objectIdSchema,
      }),
      response: t.Object({
        data: tagNoUserSchema,
      }),
    },
  )
  .delete(
    '/tags/:tagId',
    async ({ user, params: { tagId } }) => ({
      data: await transactionRepo
        .deleteTag(user._id, Types.ObjectId.createFromHexString(tagId))
        .then((t) => t.toJSON()),
    }),
    {
      params: t.Object({
        tagId: objectIdSchema,
      }),
      response: t.Object({
        data: tagNoUserSchema,
      }),
    },
  )
