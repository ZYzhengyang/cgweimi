/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Lazy load heavy chart.js dependencies (~275KB) — only fetched when a chart page is actually opened
export async function initChart() {
	const [
		{ Chart, ArcElement, LineElement, BarElement, PointElement, BarController, LineController, DoughnutController, CategoryScale, LinearScale, TimeScale, Legend, Title, Tooltip, SubTitle, Filler },
		{ default: gradient },
		{ default: zoomPlugin },
		{ MatrixController, MatrixElement },
		{ themeManager },
		{ store },
	] = await Promise.all([
		import('chart.js'),
		import('chartjs-plugin-gradient'),
		import('chartjs-plugin-zoom'),
		import('chartjs-chart-matrix'),
		import('@/theme.js'),
		import('@/store.js'),
		import('chartjs-adapter-date-fns'),
	]);

	Chart.register(
		ArcElement,
		LineElement,
		BarElement,
		PointElement,
		BarController,
		LineController,
		DoughnutController,
		CategoryScale,
		LinearScale,
		TimeScale,
		Legend,
		Title,
		Tooltip,
		SubTitle,
		Filler,
		MatrixController, MatrixElement,
		zoomPlugin,
		gradient,
	);

	// フォントカラー
	Chart.defaults.color = themeManager.currentCompiledTheme!.fg;

	Chart.defaults.borderColor = store.s.darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

	Chart.defaults.animation = false;
}
