import { Elysia, status, t, ValidationError } from 'elysia'
import { userRepo } from '../repos'
import { createUserSchema, updateUserSchema, userSchema } from '../schemas/user'

export const auth = new Elysia({
  name: 'auth',
})
  .guard({
    cookie: t.Object({
      token: t.String(),
    }),
  })
  .resolve(async ({ cookie: { token } }) => {
    try {
      const user = await userRepo.verifyToken(token.value)
      if (!user) throw 'Invalid token'
      return { user }
    } catch {
      throw status(401, 'Invalid token')
    }
  })
  .as('scoped')

export const user = new Elysia({ prefix: '/users', tags: ['Users'] })
  .post(
    '/',
    async ({ body: { data }, cookie: { token } }) => {
      const user = await userRepo.createUser(data)

      token.set({
        value: userRepo.generateToken(user._id),
        httpOnly: true,
      })

      return {
        data: user.toJSON(),
      }
    },
    {
      body: t.Object({
        data: createUserSchema,
      }),
      response: t.Object({
        data: userSchema,
      }),
    },
  )
  .post(
    '/login',
    async ({
      body: {
        data: { username, password },
      },
      cookie: { token },
    }) => {
      const user = await userRepo.loginUser(username, password)
      if (!user) {
        throw status('Unauthorized', 'Wrong username or password')
      }

      token.set({
        value: userRepo.generateToken(user._id),
        httpOnly: true,
      })

      return {
        data: user.toJSON(),
      }
    },
    {
      body: t.Object({
        data: t.Object({
          username: t.String({ minLength: 3 }),
          password: t.String({ minLength: 4 }),
        }),
      }),
      response: t.Object({
        data: t.Nullable(userSchema),
      }),
    },
  )
  .use(auth)
  .get(
    '/',
    ({ user }) => ({
      data: user.toJSON(),
    }),
    {
      response: t.Object({
        data: userSchema,
      }),
    },
  )
  .put(
    '/',
    async ({ user, body: { data } }) => {
      if (
        typeof data.password != 'undefined' &&
        typeof data.oldPassword == 'undefined'
      ) {
        throw new ValidationError(
          'VALIDATION',
          t.Object({
            data: t.Object({
              oldPassword: t.String(),
            }),
          }),
          { data },
        )
      }

      return {
        data: await userRepo.updateUser(user, data).then((u) => u.toJSON()),
      }
    },
    {
      body: t.Object({
        data: updateUserSchema,
      }),
      response: t.Object({
        data: userSchema,
      }),
    },
  )
  .delete(
    '/',
    async ({ user, cookie: { token } }) => {
      await userRepo.deleteUser(user)
      token.remove()
      return {
        data: user.toJSON(),
      }
    },
    {
      response: t.Object({
        data: userSchema,
      }),
    },
  )
