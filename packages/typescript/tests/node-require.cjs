const { createClient, BookingStatus } = require('../dist/index.js')

const client = createClient({ apiKey: 'ak_test_smoke', fetch: async () => new Response('{}') })
if (typeof client.getWorkspace !== 'function' || BookingStatus.confirmed !== 'confirmed') process.exit(1)
