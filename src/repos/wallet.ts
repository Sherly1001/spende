import { status } from 'elysia'
import { isUndefined, omitBy } from 'lodash'
import mongoose, { ClientSession, Types } from 'mongoose'
import {
  pureWalletSchema,
  updateWalletSchema,
  WalletModel,
} from '../schemas/wallet'
import { TransactionModel } from '../schemas/transaction'

export async function getWallets(userId: Types.ObjectId) {
  return await WalletModel.find({ user: userId })
}

export async function getWallet(
  userId: Types.ObjectId,
  walletId: Types.ObjectId,
  session?: ClientSession,
) {
  const query = WalletModel.findOne({ user: userId, _id: walletId })
  if (session) query.session(session)
  const wallet = await query
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
  const session = await mongoose.startSession()
  session.startTransaction()

  const wallet = await getWallet(userId, walletId, session)

  const transactionInWallet = await TransactionModel.countDocuments(
    { $or: [{ wallet: wallet._id }, { targetWallet: wallet._id }] },
    { session },
  )

  if (transactionInWallet > 0) {
    throw status(
      'Forbidden',
      'Cannot delete the wallet if there are any transactions related to it',
    )
  }

  await wallet.deleteOne({ session })

  await session.commitTransaction()
  await session.endSession()

  return wallet
}
