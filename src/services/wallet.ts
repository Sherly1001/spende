import { Elysia, t } from 'elysia'
import { Types } from 'mongoose'
import { walletRepo } from '../repos'
import {
  pureWalletSchema,
  updateWalletSchema,
  walletNoUserSchema,
} from '../schemas/wallet'
import { objectIdSchema } from '../utils/schema'
import { auth } from './user'

export const wallet = new Elysia({ prefix: '/wallets', tags: ['Wallets'] })
  .use(auth)
  .get(
    '/',
    async ({ user }) => ({
      data: await walletRepo
        .getWallets(user._id)
        .then((ws) => ws.map((w) => w.toJSON())),
    }),
    {
      response: t.Object({
        data: t.Array(walletNoUserSchema),
      }),
    },
  )
  .post(
    '/',
    async ({ user, body: { data } }) => ({
      data: await walletRepo
        .createWallet(user._id, data)
        .then((w) => w.toJSON()),
    }),
    {
      body: t.Object({
        data: pureWalletSchema,
      }),
    },
  )
  .put(
    '/:walletId',
    async ({ user, params: { walletId }, body: { data } }) => ({
      data: await walletRepo
        .updateWallet(
          user._id,
          Types.ObjectId.createFromHexString(walletId),
          data,
        )
        .then((w) => w.toJSON()),
    }),
    {
      body: t.Object({
        data: updateWalletSchema,
      }),
      params: t.Object({
        walletId: objectIdSchema,
      }),
      response: t.Object({
        data: walletNoUserSchema,
      }),
    },
  )
  .delete(
    '/:walletId',
    async ({ user, params: { walletId } }) => ({
      data: await walletRepo
        .deleteWallet(user._id, Types.ObjectId.createFromHexString(walletId))
        .then((w) => w.toJSON()),
    }),
    {
      params: t.Object({
        walletId: objectIdSchema,
      }),
      response: t.Object({
        data: walletNoUserSchema,
      }),
    },
  )
