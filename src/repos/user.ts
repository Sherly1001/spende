import { status } from 'elysia'
import jwt from 'jsonwebtoken'
import { isUndefined, omitBy } from 'lodash'
import { Types } from 'mongoose'
import {
  createUserSchema,
  HydratedUser,
  updateUserSchema,
  UserModel,
} from '../schemas/user'
import { JWT_SECRET } from '../utils/const'

export async function getUserInfo(userId: Types.ObjectId | string) {
  userId = Types.ObjectId.createFromHexString(userId.toString())
  const user = await UserModel.findById(userId)
  return user
}

export async function createUser(data: typeof createUserSchema.static) {
  const user = new UserModel(data)
  user.hashedPassword = await Bun.password.hash(data.password)
  await user.save()
  return user
}

export async function updateUser(
  user: HydratedUser,
  data: typeof updateUserSchema.static,
) {
  user.set(omitBy(data, isUndefined))

  if (data.password && data.oldPassword) {
    if (await Bun.password.verify(data.oldPassword, user.hashedPassword)) {
      user.hashedPassword = await Bun.password.hash(data.password)
    } else {
      throw status('Forbidden', 'Old password not matched')
    }
  }

  await user.save()
  return user
}

export async function deleteUser(user: HydratedUser) {
  await user.deleteOne()
}

export async function loginUser(username: string, password: string) {
  const user = await UserModel.findOne({ username })
  if (!user || !(await Bun.password.verify(password, user.hashedPassword)))
    return null
  return user
}

export function generateToken(userId: Types.ObjectId | string) {
  userId = userId.toString()
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '60 days',
  })
}

export async function verifyToken(token: string) {
  const info = jwt.verify(token, JWT_SECRET)
  let userId = undefined
  if (typeof info == 'string') {
    userId = info
  } else {
    userId = info?.userId as string
  }
  return await UserModel.findById(userId)
}
