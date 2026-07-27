import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  getNextRetryAt,
  getRetryDelayMs,
} from './retry-policy'

describe('retry policy', () => {
  it('aplica backoff exponencial sin jitter variable', () => {
    const fixedRandom = () => 0.5

    expect(
      getRetryDelayMs(1, fixedRandom),
    ).toBe(2_000)

    expect(
      getRetryDelayMs(2, fixedRandom),
    ).toBe(4_000)

    expect(
      getRetryDelayMs(3, fixedRandom),
    ).toBe(8_000)
  })

  it('limita el retraso máximo', () => {
    expect(
      getRetryDelayMs(30, () => 0.5),
    ).toBe(300_000)
  })

  it('calcula la siguiente fecha', () => {
    const next = getNextRetryAt(
      1,
      new Date('2026-07-27T12:00:00.000Z'),
      () => 0.5,
    )

    expect(next).toBe(
      '2026-07-27T12:00:02.000Z',
    )
  })
})
