import { customersMock, type CustomerMock, type CustomerTimelineItem } from './mockData'

const STORAGE_KEY = 'brain_customers_mock'
const STORAGE_VERSION_KEY = 'brain_customers_mock_version'
const STORAGE_VERSION = '2026-01-16'

function notify() {
  window.dispatchEvent(new Event('brain:customersUpdated'))
}

export function getCustomers(): CustomerMock[] {
  if (typeof window === 'undefined') return customersMock
  const storedVersion = window.localStorage.getItem(STORAGE_VERSION_KEY)
  if (storedVersion !== STORAGE_VERSION) {
    window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customersMock))
    return customersMock
  }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return customersMock
  try {
    const stored = JSON.parse(raw) as CustomerMock[]
    const storedIds = new Set(stored.map((customer) => customer.id))
    const merged = [...stored, ...customersMock.filter((customer) => !storedIds.has(customer.id))]
    if (merged.length !== stored.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    }
    return merged
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
