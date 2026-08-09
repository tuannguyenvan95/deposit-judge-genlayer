import { describe, it, expect } from 'vitest'
import { formatGen } from './utils'

describe('formatGen', () => {
  // --- Falsy / zero values ---
  it('returns "0" for undefined', () => {
    expect(formatGen(undefined)).toBe('0')
  })

  it('returns "0" for null', () => {
    expect(formatGen(null)).toBe('0')
  })

  it('returns "0" for empty string', () => {
    expect(formatGen('')).toBe('0')
  })

  it('returns "0" for string "0"', () => {
    expect(formatGen('0')).toBe('0')
  })

  it('returns "0" for number 0', () => {
    expect(formatGen(0)).toBe('0')
  })

  // --- Decimal strings (already formatted) ---
  it('returns decimal strings as-is', () => {
    expect(formatGen('3.5')).toBe('3.5')
    expect(formatGen('0.001')).toBe('0.001')
    expect(formatGen('100.50')).toBe('100.50')
  })

  // --- Small wei strings (< 10 chars, no decimal) ---
  it('returns short numeric strings as-is (no decimal, < 10 chars)', () => {
    expect(formatGen('1')).toBe('1')
    expect(formatGen('42')).toBe('42')
    expect(formatGen('9999')).toBe('9999')
    expect(formatGen('123456789')).toBe('123456789') // 9 chars
  })

  // --- Wei strings >= 10 chars → converted to GEN ---
  it('converts wei strings to GEN for 10+ char strings', () => {
    // 1e18 = 1 GEN exactly
    expect(formatGen('1000000000000000000')).toBe('1')
    // 3.5e18 = 3.5 GEN
    expect(formatGen('3500000000000000000')).toBe('3.5')
    // 0.5e18 = 0.5 GEN
    expect(formatGen('500000000000000000')).toBe('0.5')
  })

  it('formats non-integer GEN values to 4 decimals', () => {
    // 1.12345 GEN → "1.1235" (rounded)
    expect(formatGen('1123450000000000000')).toBe('1.1235')
  })

  it('trailing zeros are stripped from formatted decimals', () => {
    // 2.1000 GEN → "2.1"
    expect(formatGen('2100000000000000000')).toBe('2.1')
    // 1.0010 GEN → "1.001"
    expect(formatGen('1001000000000000000')).toBe('1.001')
  })

  // --- Large wei values ---
  it('handles large wei values (1M GEN)', () => {
    // 1,000,000 GEN = 1e24 wei
    expect(formatGen('1000000000000000000000000')).toBe('1000000')
  })

  it('handles very large wei values with decimals', () => {
    // 1,234,567.8901 GEN
    const wei = BigInt(Math.floor(1234567.8901 * 1e18))
    const result = formatGen(wei.toString())
    expect(result).toBe('1234567.8901')
  })

  // --- Number type inputs ---
  it('handles number inputs directly', () => {
    expect(formatGen(42)).toBe('42')
    expect(formatGen(3.14)).toBe('3.14')
  })

  // --- Edge: exactly 10 chars (boundary) ---
  it('treats 9-char strings as passthrough, 10-char as wei', () => {
    expect(formatGen('123456789')).toBe('123456789')   // 9 chars → passthrough
    // 1234567890 wei = ~0.00000123 GEN, rounds to '0' with 4 decimal precision
    expect(formatGen('1234567890')).toBe('0')
  })

  it('converts a 10-char wei that yields a visible GEN amount', () => {
    // 10000000000 wei = 0.00000001 GEN → rounds to '0'
    // But 1000000000000000000 (19 chars) = 1 GEN
    expect(formatGen('1000000000000000000')).toBe('1')
  })

  // --- Edge: zero wei ---
  it('converts "0" to "0" (not via wei path since length < 10)', () => {
    expect(formatGen('0')).toBe('0')
  })
})
