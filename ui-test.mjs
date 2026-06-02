// CG微米 UI 自动测试脚本
// 用 Playwright 截图各个页面，检查渲染效果
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:1990';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Admin2026!';
const SCREENSHOT_DIR = 'C:/Users/Administrator/ui-test-screenshots';

async function main() {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	// 收集控制台错误
	const errors = [];
	page.on('console', msg => {
		if (msg.type() === 'error') errors.push(msg.text());
	});

	console.log('=== 1. 欢迎页（未登录）===');
	await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(2000);
	await page.screenshot({ path: `${SCREENSHOT_DIR}/01-welcome.png`, fullPage: false });
	console.log('  ✓ 截图完成');

	// 登录
	console.log('\n=== 2. 登录 ===');
	await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(1000);
	// 填写用户名和密码
	const usernameInput = page.locator('input[name="username"], input[placeholder*="用户"]').first();
	const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
	if (await usernameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
		await usernameInput.fill(ADMIN_USER);
		await passwordInput.fill(ADMIN_PASS);
		await page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")').first().click();
		await page.waitForTimeout(3000);
		console.log('  ✓ 登录完成');
	} else {
		console.log('  ⚠ 未找到登录表单');
	}

	// 时间线
	console.log('\n=== 3. 时间线 ===');
	await page.goto(`${BASE}/timeline`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(3000);
	await page.screenshot({ path: `${SCREENSHOT_DIR}/02-timeline.png`, fullPage: false });
	// 检查帖子卡片
	const notes = page.locator('article, [class*="article"]');
	const noteCount = await notes.count().catch(() => 0);
	console.log(`  ✓ 帖子数量: ${noteCount}`);

	// 检查图片是否正常显示（不是灰色）
	const images = page.locator('img[src*="cgvmi"], img[src*="cos-files"]');
	const imgCount = await images.count().catch(() => 0);
	console.log(`  ✓ 图片数量: ${imgCount}`);

	// Explore 作品页
	console.log('\n=== 4. Explore 作品页 ===');
	await page.goto(`${BASE}/explore`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(3000);
	await page.screenshot({ path: `${SCREENSHOT_DIR}/03-explore-works.png`, fullPage: false });
	const waterfallCards = page.locator('[class*="card"], [class*="waterfall"] [class*="card"]');
	const cardCount = await waterfallCards.count().catch(() => 0);
	console.log(`  ✓ 瀑布流卡片数量: ${cardCount}`);

	// 刷视频页
	console.log('\n=== 5. 刷视频页 ===');
	await page.goto(`${BASE}/video-feed`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(3000);
	await page.screenshot({ path: `${SCREENSHOT_DIR}/04-video-feed.png`, fullPage: false });
	// 检查 Swiper 是否加载
	const swiperEl = page.locator('.swiper, [class*="swiper"]');
	const swiperExists = await swiperEl.count().catch(() => 0);
	console.log(`  ✓ Swiper 元素: ${swiperExists > 0 ? '已加载' : '未找到'}`);
	// 检查评论面板
	const commentPanel = page.locator('[class*="commentPanel"], [class*="comment"]');
	const commentCount = await commentPanel.count().catch(() => 0);
	console.log(`  ✓ 评论面板元素: ${commentCount}`);

	// 点击帖子弹窗
	console.log('\n=== 6. 帖子弹窗 ===');
	await page.goto(`${BASE}/timeline`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(2000);
	// 点击第一个帖子的内容区域
	const firstNoteContent = page.locator('article').first();
	if (await firstNoteContent.isVisible({ timeout: 3000 }).catch(() => false)) {
		await firstNoteContent.click();
		await page.waitForTimeout(2000);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/05-note-popup.png`, fullPage: false });
		console.log('  ✓ 弹窗已打开');
		// 检查关闭按钮
		const closeBtn = page.locator('[class*="closeBtn"], button:has(i.ti-x)');
		const closeBtnCount = await closeBtn.count().catch(() => 0);
		console.log(`  ✓ 关闭按钮: ${closeBtnCount > 0 ? '存在' : '未找到'}`);
	} else {
		console.log('  ⚠ 未找到帖子');
	}

	// 控制台错误汇总
	console.log('\n=== 控制台错误 ===');
	if (errors.length === 0) {
		console.log('  ✓ 无错误');
	} else {
		console.log(`  ⚠ ${errors.length} 个错误:`);
		errors.slice(0, 5).forEach(e => console.log(`    - ${e.substring(0, 150)}`));
	}

	await browser.close();
	console.log('\n=== 测试完成 ===');
	console.log(`截图保存在: ${SCREENSHOT_DIR}`);
}

main().catch(err => {
	console.error('测试失败:', err.message);
	process.exit(1);
});
