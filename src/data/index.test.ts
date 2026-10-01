import { describe, expect, it } from 'vitest'
import { createDataSource, DataModeError, parseDataMode } from './index'

describe('parseDataMode', () => {
  it('accepts mock and supabase', () => {
    expect(parseDataMode('mock')).toBe('mock')
    expect(parseDataMode('supabase')).toBe('supabase')
  })

  it.each([undefined, '', 'Mock', 'demo'])('rejects %j with an explicit error', (value) => {
    expect(() => parseDataMode(value)).toThrow(DataModeError)
    expect(() => parseDataMode(value)).toThrow('VITE_DATA_MODE')
  })
})

describe('createDataSource', () => {
  it('refuses supabase until Module 5 instead of falling back to mock', () => {
    expect(() => createDataSource('supabase')).toThrow(DataModeError)
  })
})
