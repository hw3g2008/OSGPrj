import { test, expect } from '@playwright/test'

const moduleName = process.env.E2E_MODULE || ''

test.describe('Lead Mentor Login Shell @lead-mentor @ui-only @ui-smoke', () => {
  test.skip(moduleName !== 'lead-mentor', 'lead-mentor shell contract only runs for lead-mentor module gate')

  test('lead-mentor login shell matches ticket anchors and public interactions @lead-mentor-t177-login-shell', async ({
    page,
  }) => {
    await page.goto('/login')

    await expect(page.locator('#login-page')).toBeVisible()
    await expect(page.locator('.login-box')).toBeVisible()
    await expect(page.locator('.login-title')).toHaveText('欢迎回来')
    await expect(page.locator('.login-logo')).toContainText('OSG Lead Mentor')
    await expect(page.locator('.login-subtitle')).toHaveText('使用您的账号登录（主导师/班主任）')
    await expect(page.locator('.platform-title')).toHaveText('OSG Platform')
    await expect(page.locator('.platform-subtitle')).toHaveText('职业培训一站式平台，学生与导师共同成长')

    const featureItems = page.locator('.login-feature')
    await expect(featureItems).toHaveCount(4)
    await expect(featureItems.nth(1)).toContainText('导师端：高效课程管理')

    const usernameInput = page.locator('#login-username')
    const passwordInput = page.locator('#login-password')
    const passwordToggle = page.locator('#pwd-eye')
    const forgotTrigger = page.locator('[data-surface-trigger="modal-forgot-password"]')

    await expect(usernameInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(passwordToggle).toBeVisible()
    await expect(forgotTrigger).toContainText('点击重置')

    await expect(usernameInput).toHaveValue('')
    await expect(passwordInput).toHaveValue('')

    await passwordInput.fill('RealPass123!')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await passwordToggle.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await expect(passwordInput).toHaveValue('RealPass123!')
    await passwordToggle.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(passwordInput).toHaveValue('RealPass123!')
  })

  test('forgot-password modal keeps prototype layout rules for placement and spacing @lead-mentor-t178-modal-layout', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.locator('[data-surface-trigger="modal-forgot-password"]').click()

    const modalRoot = page.locator('[data-surface-id="modal-forgot-password"]')
    const shell = page.locator('[data-surface-id="modal-forgot-password"] [data-surface-part="shell"]')
    const header = page.locator('[data-surface-id="modal-forgot-password"] [data-surface-part="header"]')
    const body = page.locator('[data-surface-id="modal-forgot-password"] [data-surface-part="body"]')
    const firstGroup = page.locator('#fp-step-1 .form-group')
    const stepText = page.locator('#fp-step-1 .step-text')
    const formLabel = page.locator('#fp-step-1 .form-label')
    const emailInput = page.locator('#fp-email')
    const sendCodeButton = page.locator('#fp-step-1 .btn.btn-primary')
    const closeButton = page.locator('[data-surface-id="modal-forgot-password"] .modal-close')

    await expect(shell).toBeVisible()

    const modalLayout = await modalRoot.evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        display: style.display,
        alignItems: style.alignItems,
        justifyContent: style.justifyContent,
      }
    })
    expect(modalLayout).toEqual({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    })

    const viewport = page.viewportSize()
    const shellBox = await shell.boundingBox()
    if (!viewport || !shellBox) throw new Error('Missing viewport or shell box')
    const shellCenter = shellBox.x + shellBox.width / 2
    expect(Math.abs(shellCenter - viewport.width / 2)).toBeLessThan(12)

    const shellStyle = await shell.evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        width: style.width,
        maxWidth: style.maxWidth,
        borderRadius: style.borderRadius,
        maxHeight: style.maxHeight,
      }
    })
    expect(shellStyle.maxWidth).toBe('450px')
    expect(shellStyle.borderRadius).toBe('20px')
    expect(parseFloat(shellStyle.maxHeight)).toBeCloseTo(viewport.height * 0.9, 0)

    const headerStyle = await header.evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
      }
    })
    expect(headerStyle).toEqual({
      paddingTop: '22px',
      paddingRight: '26px',
      paddingBottom: '22px',
      paddingLeft: '26px',
    })
    await expect(header).toHaveCSS('border-bottom-width', '1px')

    const bodyStyle = await body.evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
      }
    })
    expect(bodyStyle).toEqual({
      paddingTop: '26px',
      paddingRight: '26px',
      paddingBottom: '26px',
      paddingLeft: '26px',
    })

    await expect(firstGroup).toHaveCSS('margin-bottom', '16px')
    await expect(stepText).toHaveCSS('margin-bottom', '20px')
    await expect(closeButton).toHaveCSS('width', '36px')
    await expect(closeButton).toHaveCSS('height', '36px')
    await expect(sendCodeButton).toHaveCSS('justify-content', 'flex-start')

    const typographyMetrics = await Promise.all([
      stepText.boundingBox(),
      firstGroup.boundingBox(),
      formLabel.boundingBox(),
      emailInput.boundingBox(),
      sendCodeButton.boundingBox(),
    ])
    const [stepTextBox, firstGroupBox, formLabelBox, emailInputBox, sendCodeButtonBox] = typographyMetrics

    if (!stepTextBox || !firstGroupBox || !formLabelBox || !emailInputBox || !sendCodeButtonBox) {
      throw new Error('Missing forgot-password modal metrics')
    }

    expect(stepTextBox.height).toBeCloseTo(20, 0)
    expect(firstGroupBox.height).toBeCloseTo(68, 0)
    expect(formLabelBox.height).toBeCloseTo(18, 0)
    expect(emailInputBox.height).toBeCloseTo(44, 0)
    expect(sendCodeButtonBox.height).toBeCloseTo(40, 0)
  })
})
