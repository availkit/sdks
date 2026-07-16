import { createClient } from '@availkit/client'

const availkit = createClient({ apiKey: process.env.AVAILKIT_API_KEY })
const availability = await availkit.getAvailability({
  service_id: 'svc_example',
  date: '2026-07-20',
})
console.log(availability.data.slots)
