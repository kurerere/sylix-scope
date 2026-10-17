import { test, expect } from '@playwright/test'

import { CONNECTED_ROW_COUNT, LISTEN_ROW_COUNT } from './fixtures/sockets'
import { installTauriStub } from './tauri-stub'

test.beforeEach(async ({ page }) => {
    await installTauriStub(page)
    await page.goto('/')
    await page.getByRole('button', { name: '开始连接' }).click()
    await expect(page.getByRole('button', { name: '断开当前连接' })).toBeVisible()

    await page.getByRole('button', { name: '网络看板' }).click()
    await page.getByRole('button', { name: '套接字连接' }).click()
})

test('监听 (LISTEN) 过滤只显示监听端口，不混入 UNIX estab 会话', async ({ page }) => {
    const rows = page.getByRole('table').getByRole('row')

    await page.getByRole('button', { name: '监听 (LISTEN)' }).click()
    await expect(rows).toHaveCount(LISTEN_ROW_COUNT + 1)
    await expect(page.getByRole('table')).not.toContainText('estab')

    await page.getByRole('button', { name: 'TCP', exact: true }).click()
    await expect(rows).toHaveCount(5)
    await expect(page.getByRole('cell', { name: '*:23' })).toBeVisible()
})

test('连接 过滤只显示 ESTAB 会话，且与监听过滤可反复切换', async ({ page }) => {
    const rows = page.getByRole('table').getByRole('row')

    await page.getByRole('button', { name: '连接', exact: true }).click()
    await expect(rows).toHaveCount(CONNECTED_ROW_COUNT + 1)
    await expect(page.getByRole('cell', { name: '*:137' })).toHaveCount(0)

    await page.getByRole('button', { name: '监听 (LISTEN)' }).click()
    await expect(rows).toHaveCount(LISTEN_ROW_COUNT + 1)
    await expect(page.getByRole('cell', { name: '*:161' })).toBeVisible()

    await page.getByRole('button', { name: '全部', exact: true }).click()
    await expect(rows).toHaveCount(22)
})
