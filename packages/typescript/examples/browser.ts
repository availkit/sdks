import { createClient } from '@availkit/client'

const apiKey = document.documentElement.dataset.availkitPublishableKey
if (!apiKey) throw new Error('Missing data-availkit-publishable-key')

const availkit = createClient({ apiKey })
const result = await availkit.getAvailability({
  service_id: 'svc_example',
  date: new Date().toISOString().slice(0, 10),
})
if (result.status !== 200) throw new Error(`Availability failed with status ${result.status}`)

document.querySelector('#slots')?.replaceChildren(
  ...result.data.slots.map(slot => {
    const option = document.createElement('option')
    option.value = slot.starts_at
    option.textContent = new Date(slot.starts_at).toLocaleTimeString()
    return option
  }),
)
