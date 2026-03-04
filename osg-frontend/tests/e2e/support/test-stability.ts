import { type Page } from '@playwright/test'

const fixedTime = process.env.E2E_FIXED_TIME || ''

export async function applyDeterministicRuntime(page: Page): Promise<void> {
  await page.addInitScript(({ inputTime }) => {
    if (!inputTime) {
      return
    }
    const timestamp = new Date(inputTime).valueOf()
    if (!Number.isFinite(timestamp)) {
      return
    }

    const OriginalDate = Date

    class MockDate extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) {
          super(timestamp)
          return
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        super(...(args as any))
      }

      static now(): number {
        return timestamp
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).Date = MockDate
  }, { inputTime: fixedTime })
}
