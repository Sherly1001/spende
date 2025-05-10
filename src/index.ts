import swagger from '@elysiajs/swagger'
import { Elysia } from 'elysia'
import mongoose from 'mongoose'
import { HOST, MONGODB_URL, PORT, SWAGGER_PATH } from './utils/const'
import { user } from './services'

new Elysia({
  serve: {
    hostname: HOST,
  },
})
  .use(
    swagger({
      path: SWAGGER_PATH,
      documentation: {
        info: {
          title: 'Spende API',
          version: '0.0.1',
        },
      },
    }),
  )
  .onStart(async () => {
    await mongoose.connect(MONGODB_URL)
  })
  .onError(({ code, error }) => {
    if (code == 'VALIDATION') {
      const message = JSON.parse(error.message)
      return {
        code,
        message: 'Validation error',
        details: message?.errors,
      }
    } else if (typeof code == 'number') {
      const response = error.response as any
      if (typeof response == 'string') {
        return {
          code,
          message: response,
        }
      } else if (typeof response == 'object') {
        return {
          code,
          ...response,
        }
      }
    }

    console.error(code, error)

    return {
      code,
      message: error.toString(),
    }
  })
  .onTransform(({ request: { method, url } }) => {
    console.log(new Date(), method, url)
  })
  .use(user)
  .listen(PORT, ({ hostname, port }) => {
    console.log(`Server is running at: http://${hostname}:${port}`)
  })
