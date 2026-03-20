import { describe, it, expect } from 'vitest'
import { formatMemory, formatUptime } from './format'

describe('formatMemory', () => {
  it('returns dash for null', () => {
    expect(formatMemory(null)).toBe('-')
  })

  it('formats bytes', () => {
    expect(formatMemory(512)).toBe('512.0 B')
  })

  it('formats kilobytes', () => {
    expect(formatMemory(1024)).toBe('1.0 KB')
    expect(formatMemory(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatMemory(1048576)).toBe('1.0 MB')
  })

  it('formats gigabytes', () => {
    expect(formatMemory(1073741824)).toBe('1.0 GB')
  })
})

describe('formatUptime', () => {
  it('returns dash for null', () => {
    expect(formatUptime(null)).toBe('-')
  })

  it('formats seconds only', () => {
    expect(formatUptime(45)).toBe('00:00:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatUptime(125)).toBe('00:02:05')
  })

  it('formats hours, minutes, and seconds', () => {
    expect(formatUptime(3661)).toBe('01:01:01')
  })
})