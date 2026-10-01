import { describe, expect, it } from 'vitest'
import { collapseSpaces, normalizeText, tidyName } from './text'

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('  Nicolò ')).toBe('nicolo')
    expect(normalizeText('ATTIVITÀ')).toBe('attivita')
  })
})

describe('collapseSpaces', () => {
  it('trims and collapses whitespace', () => {
    expect(collapseSpaces('  Maria   Grazia ')).toBe('Maria Grazia')
  })
})

describe('tidyName', () => {
  it('capitalizes names written all upper or lower case', () => {
    expect(tidyName('MARCO')).toBe('Marco')
    expect(tidyName('DE LUCA')).toBe('De Luca')
    expect(tidyName("d'angelo")).toBe("D'Angelo")
    expect(tidyName('ROSSI-BIANCHI')).toBe('Rossi-Bianchi')
  })

  it('keeps names that already have mixed case', () => {
    expect(tidyName('McArthur')).toBe('McArthur')
    expect(tidyName('  De  Luca ')).toBe('De Luca')
  })
})
