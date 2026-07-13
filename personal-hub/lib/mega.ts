import { Storage } from 'megajs'

let storageInstance: Storage | null = null

export async function getMegaStorage(): Promise<Storage> {
  if (storageInstance) return storageInstance

  return new Promise((resolve, reject) => {
    const storage = new Storage({
      email: process.env.MEGA_EMAIL!,
      password: process.env.MEGA_PASSWORD!,
    })

    storage.on('ready', () => {
      storageInstance = storage
      resolve(storage)
    })

    storage.on('error', reject)
  })
}