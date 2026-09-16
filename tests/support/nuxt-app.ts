// Nuxt is supplied by the test fixture; never start the real app or database.
export function useNuxtApp(): never {
  throw new Error('Mock useNuxtApp before mounting a Nuxt composable')
}
