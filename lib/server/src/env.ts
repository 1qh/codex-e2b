import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'
const env = createEnv({
  // biome-ignore lint/style/noProcessEnv: single env entry point
  runtimeEnv: process.env,
  server: {
    ADMIN_SECRET: z.string().min(1),
    E2B_API_KEY: z.string().min(1),
    PORT: z.coerce.number().default(3001)
  }
})
export { env }
