import { customersMock, type CustomerMock, type CustomerTimelineItem } from './mockData'

const STORAGE_KEY = 'brain_customers_mock'

function notify() {
  window.dispatchEvent(new Event('brain:customersUpdated'))
}

export function getCustomers(): CustomerMock[] {
  if (typeof window === 'undefined') return customersMock
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return customersMock
  try {
    return JSON.parse(raw) as CustomerMock[]
  } catch {
    return customersMock
  }
}

export function saveCustomers(customers: CustomerMock[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customers))
  notify()
}

export function appendCustomerTimeline(
  clienteId: string,
  entry: Omit<CustomerTimelineItem, 'id'>
) {
  const customers = getCustomers()
  const nowId = `T-${Date.now()}`
  const updated = customers.map((customer) => {
    if (customer.id !== clienteId) return customer
    return {
      ...customer,
      timeline: [{ ...entry, id: nowId }, ...customer.timeline],
    }
  })
  saveCustomers(updated)
}
