import { describe, expect, it } from 'vitest'
import { formatPhone, linkWhatsApp, normalizePhone } from './whatsapp'

describe('normalizePhone', () => {
  it.each([
    ['333 123 4567', '+393331234567'],
    ['333.123.4567', '+393331234567'],
    ['(333) 123-4567', '+393331234567'],
    ['+39 333 123 4567', '+393331234567'],
    ['0039 333 1234567', '+393331234567'],
    ['39 333 1234567', '+393331234567'],
    ['393 123 4567', '+393931234567'], // mobile starting with 39, no prefix
    ['06 1234 5678', '+390612345678'], // landline keeps its leading 0
    ['+41 79 123 45 67', '+41791234567'], // foreign number
  ])('%j → %j', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected)
  })

  it.each(['', '   ', 'chiedere', '12345', '+39 333 1234 5678 9999'])('rejects %j', (raw) => {
    expect(normalizePhone(raw)).toBeNull()
  })
})

describe('formatPhone', () => {
  it('groups Italian mobiles', () => {
    expect(formatPhone('+393331234567')).toBe('+39 333 123 4567')
  })

  it('leaves other numbers readable', () => {
    expect(formatPhone('+390612345678')).toBe('+39 0612345678')
    expect(formatPhone('+41791234567')).toBe('+41791234567')
  })
})

describe('linkWhatsApp', () => {
  it('builds a wa.me link with the number without + and the text encoded', () => {
    expect(linkWhatsApp('+393331234567', 'Ciao Maria! ✅ 2 su 10')).toBe(
      'https://wa.me/393331234567?text=Ciao%20Maria!%20%E2%9C%85%202%20su%2010',
    )
  })
})
