import { status, t, ValidationError } from 'elysia'
import { isUndefined, omitBy } from 'lodash'
import mongoose, { ClientSession, Types } from 'mongoose'
import { walletRepo } from '.'
import {
  createTransactionSchema,
  getTransactionQuerySchema,
  pureTagSchema,
  TagModel,
  TransactionModel,
  TransactionType,
  updateTagSchema,
  updateTransactionSchema,
} from '../schemas/transaction'
import { HydratedWallet, WalletModel } from '../schemas/wallet'
import { objectIdSchema } from '../utils/schema'

export async function getTags(userId: Types.ObjectId) {
  return await TagModel.find({ user: userId })
}

export async function getTag(userId: Types.ObjectId, tagId: Types.ObjectId) {
  const tag = await TagModel.findOne({ user: userId, _id: tagId })
  if (!tag) {
    throw status('Not Found', 'Tag not found')
  }
  return tag
}

export async function createTag(
  userId: Types.ObjectId,
  data: typeof pureTagSchema.static,
) {
  const tag = new TagModel({ ...data, user: userId })
  await tag.save()
  return tag
}

export async function updateTag(
  userId: Types.ObjectId,
  tagId: Types.ObjectId,
  data: typeof updateTagSchema.static,
) {
  const tag = await getTag(userId, tagId)
  tag.set(omitBy(data, isUndefined))
  await tag.save()
  return tag
}

export async function deleteTag(userId: Types.ObjectId, tagId: Types.ObjectId) {
  const tag = await getTag(userId, tagId)
  await tag.deleteOne()
  return tag
}

export async function getTransactions(
  userId: Types.ObjectId,
  params: typeof getTransactionQuerySchema.static,
) {
  const filterPipeline: any = {}
  if (params.walletIds?.length) {
    filterPipeline['wallet._id'] = {
      $in: params.walletIds.map(Types.ObjectId.createFromHexString),
    }
  }

  if (params.targetWalletIds?.length) {
    filterPipeline['targetWallet._id'] = {
      $in: params.targetWalletIds.map(Types.ObjectId.createFromHexString),
    }
  }

  if (params.tagIds?.length) {
    filterPipeline['tags'] = {
      $elemMatch: {
        _id: { $in: params.tagIds.map(Types.ObjectId.createFromHexString) },
      },
    }
  }

  if (params.note) {
    filterPipeline['$and'] = params.note.split(/\s+/).map((val) => ({
      note: { $regex: val, $options: 'i' },
    }))
  }

  if (params.after) {
    filterPipeline['date'] = Object.assign(filterPipeline['date'] ?? {}, {
      $gte: params.after,
    })
  }

  if (params.before) {
    filterPipeline['date'] = Object.assign(filterPipeline['date'] ?? {}, {
      $lte: params.before,
    })
  }

  if (typeof params.amountAbove != 'undefined') {
    filterPipeline['amount'] = Object.assign(filterPipeline['amount'] ?? {}, {
      $gte: params.amountAbove,
    })
  }

  if (typeof params.amountBelow != 'undefined') {
    filterPipeline['amount'] = Object.assign(filterPipeline['amount'] ?? {}, {
      $lte: params.amountBelow,
    })
  }

  let sortPipeline: any = { date: -1 }
  if (params.sortBy?.length) {
    sortPipeline = Object.fromEntries(
      params.sortBy
        .map((s) =>
          s.match(
            /^(-?)(date|transactionType|wallet\.name|targetWallet\.name|wallet\.currency|targetWallet\.currency)$/,
          ),
        )
        .filter((m) => m !== null)
        .map((m) => [m[2], m[1] === '-' ? -1 : 1]),
    )
  }

  const limit = params.limit ?? 20
  const page = params.page ?? 1
  const skip = limit * (page - 1)

  const pipelines = [
    {
      $lookup: {
        from: WalletModel.collection.name,
        localField: 'wallet',
        foreignField: '_id',
        as: 'wallet',
      },
    },
    {
      $unwind: '$wallet',
    },
    {
      $lookup: {
        from: WalletModel.collection.name,
        localField: 'targetWallet',
        foreignField: '_id',
        as: 'targetWallet',
      },
    },
    {
      $unwind: {
        path: '$targetWallet',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        'wallet.user': userId,
      },
    },
    {
      $lookup: {
        from: TagModel.collection.name,
        localField: 'tags',
        foreignField: '_id',
        as: 'tags',
      },
    },
    ...(Object.keys(filterPipeline).length ? [{ $match: filterPipeline }] : []),
    ...[{ $sort: sortPipeline }],
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
    {
      $addFields: {
        total: {
          $ifNull: [{ $arrayElemAt: ['$total.count', 0] }, 0],
        },
        limit: limit,
        page: page,
      },
    },
  ]

  return (await TransactionModel.aggregate(pipelines))[0]
}

export async function getTransaction(
  userId: Types.ObjectId,
  transactionId: Types.ObjectId,
  session?: ClientSession,
) {
  const walletIds = await WalletModel.find({ user: userId })
    .select('_id')
    .lean()
    .then((ws) => ws.map((w) => w._id))

  const query = TransactionModel.findOne({
    wallet: { $in: walletIds },
    _id: transactionId,
  })
  if (session) query.session(session)
  const transaction = await query
  if (!transaction) {
    throw status('Not Found', 'Transaction not found')
  }
  return transaction
}

async function depositWallets(
  wallet: Types.ObjectId,
  targetWallet: Types.ObjectId | undefined,
  transactionType: TransactionType,
  amount: number,
  fee: number,
  ratio: number,
  session?: ClientSession,
) {
  if (transactionType == 'INCOME') {
    await WalletModel.findByIdAndUpdate(
      wallet,
      { $inc: { balance: amount } },
      { session },
    )
  } else if (transactionType == 'OUTCOME') {
    await WalletModel.findByIdAndUpdate(
      wallet,
      { $inc: { balance: -amount } },
      { session },
    )
  } else {
    await WalletModel.findByIdAndUpdate(
      wallet,
      { $inc: { balance: -(amount + fee) } },
      { session },
    )
    await WalletModel.findByIdAndUpdate(
      targetWallet!,
      { $inc: { balance: amount * ratio } },
      { session },
    )
  }
}

async function withdrawWallets(
  wallet: Types.ObjectId,
  targetWallet: Types.ObjectId | undefined,
  transactionType: TransactionType,
  amount: number,
  fee: number,
  ratio: number,
  session?: ClientSession,
) {
  if (transactionType == 'INCOME') {
    await WalletModel.findByIdAndUpdate(
      wallet,
      { $inc: { balance: -amount } },
      { session },
    )
  } else if (transactionType == 'OUTCOME') {
    await WalletModel.findByIdAndUpdate(
      wallet,
      { $inc: { balance: +amount } },
      { session },
    )
  } else {
    await WalletModel.findByIdAndUpdate(
      wallet,
      { $inc: { balance: amount + fee } },
      { session },
    )
    await WalletModel.findByIdAndUpdate(
      targetWallet!,
      { $inc: { balance: -(amount * ratio) } },
      { session },
    )
  }
}

export async function createTransaction(
  userId: Types.ObjectId,
  data: typeof createTransactionSchema.static,
) {
  const wallet = await walletRepo.getWallet(
    userId,
    Types.ObjectId.createFromHexString(data.wallet),
  )

  let targetWallet: HydratedWallet | null = null
  if (data.transactionType == 'TRANSFER') {
    if (!data.targetWallet) {
      throw new ValidationError(
        'targetWallet',
        t.Object({
          targetWallet: objectIdSchema,
        }),
        data,
      )
    } else {
      targetWallet = await walletRepo.getWallet(
        userId,
        Types.ObjectId.createFromHexString(data.targetWallet),
      )
    }
  } else {
    data.fee = 0
    data.ratio = 0
    data.targetWallet = undefined
  }

  if (data.tags.length > 0) {
    const dbTagIds = await getTags(userId).then(
      (ts) => new Set(ts.map((t) => t._id.toString())),
    )

    for (const tagId of data.tags) {
      if (!dbTagIds.has(tagId)) {
        throw status('Not Found', 'Tag not found')
      }
    }
  }

  const session = await mongoose.startSession()
  session.startTransaction()

  const transaction = new TransactionModel(data)
  await transaction.save({ session })

  await depositWallets(
    wallet._id,
    targetWallet?._id,
    data.transactionType,
    data.amount,
    data.fee,
    data.ratio,
    session,
  )

  await session.commitTransaction()
  await session.endSession()

  return transaction.populate(['wallet', 'targetWallet', 'tags'])
}

export async function updateTransaction(
  userId: Types.ObjectId,
  transactionId: Types.ObjectId,
  data: typeof updateTransactionSchema.static,
) {
  const updatedData = omitBy(data, isUndefined)

  let newWalletId: Types.ObjectId | null = null
  if (data.wallet) {
    newWalletId = Types.ObjectId.createFromHexString(data.wallet)
    await walletRepo.getWallet(userId, newWalletId)
  }

  let newTargetWalletId: Types.ObjectId | null = null
  if (data.transactionType == 'TRANSFER') {
    if (!data.targetWallet) {
      throw new ValidationError(
        'targetWallet',
        t.Object({
          targetWallet: objectIdSchema,
        }),
        data,
      )
    } else {
      newTargetWalletId = Types.ObjectId.createFromHexString(data.targetWallet)
      await walletRepo.getWallet(userId, newTargetWalletId)
    }
  } else if (typeof data.targetWallet != 'undefined') {
    updatedData.fee = 0
    updatedData.ratio = 0
    updatedData.targetWallet = undefined
  }

  if (data.tags && data.tags.length > 0) {
    const dbTagIds = await getTags(userId).then(
      (ts) => new Set(ts.map((t) => t._id.toString())),
    )

    for (const tagId of data.tags) {
      if (!dbTagIds.has(tagId)) {
        throw status('Not Found', 'Tag not found')
      }
    }
  }

  const session = await mongoose.startSession()
  session.startTransaction()

  const transaction = await getTransaction(userId, transactionId, session)

  const dbWalletId = Types.ObjectId.createFromHexString(
    transaction.wallet.toString(),
  )
  const dbTargetWalletId = transaction.targetWallet
    ? Types.ObjectId.createFromHexString(transaction.targetWallet.toString())
    : undefined

  await withdrawWallets(
    dbWalletId,
    dbTargetWalletId,
    transaction.transactionType,
    transaction.amount,
    transaction.fee,
    transaction.ratio,
    session,
  )

  transaction.set(updatedData)
  await transaction.save({ session })

  await depositWallets(
    newWalletId ?? dbWalletId,
    newTargetWalletId ?? dbTargetWalletId,
    data.transactionType ?? transaction.transactionType,
    data.amount ?? transaction.amount,
    data.fee ?? transaction.fee,
    data.ratio ?? transaction.ratio,
    session,
  )

  await session.commitTransaction()
  await session.endSession()

  return transaction.populate(['wallet', 'targetWallet', 'tags'])
}

export async function deleteTransaction(
  userId: Types.ObjectId,
  transactionId: Types.ObjectId,
) {
  const session = await mongoose.startSession()
  session.startTransaction()

  const transaction = await getTransaction(userId, transactionId, session)

  const dbWalletId = Types.ObjectId.createFromHexString(
    transaction.wallet.toString(),
  )
  const dbTargetWalletId = transaction.targetWallet
    ? Types.ObjectId.createFromHexString(transaction.targetWallet.toString())
    : undefined

  await withdrawWallets(
    dbWalletId,
    dbTargetWalletId,
    transaction.transactionType,
    transaction.amount,
    transaction.fee,
    transaction.ratio,
    session,
  )

  await TransactionModel.findByIdAndDelete(transactionId)

  await session.commitTransaction()
  await session.endSession()

  return transaction.populate(['wallet', 'targetWallet', 'tags'])
}
