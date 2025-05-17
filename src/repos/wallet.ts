import { status } from 'elysia'
import { isUndefined, omitBy } from 'lodash'
import { Types } from 'mongoose'
import {
  pureWalletSchema,
  updateWalletSchema,
  WalletModel,
} from '../schemas/wallet'

export async function getWallets(userId: Types.ObjectId) {
  return await WalletModel.find({ user: userId })
}

export async function getWallet(
  userId: Types.ObjectId,
  walletId: Types.ObjectId,
) {
  const wallet = await WalletModel.findOne({ user: userId, _id: walletId })
  if (!wallet) {
    throw status('Not Found', 'Wallet not found')
  }
  return wallet
}

export async function createWallet(
  userId: Types.ObjectId,
  data: typeof pureWalletSchema.static,
) {
  const wallet = new WalletModel({ ...data, user: userId })
  await wallet.save()
  return wallet
}

export async function updateWallet(
  userId: Types.ObjectId,
  walletId: Types.ObjectId,
  data: typeof updateWalletSchema.static,
) {
  const wallet = await getWallet(userId, walletId)
  wallet.set(omitBy(data, isUndefined))
  await wallet.save()
  return wallet
}

export async function deleteWallet(
  userId: Types.ObjectId,
  walletId: Types.ObjectId,
) {
  const wallet = await getWallet(userId, walletId)
  await wallet.deleteOne()
  return wallet
}
