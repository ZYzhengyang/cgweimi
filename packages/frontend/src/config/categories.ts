/**
 * CG微米 Explore 分类配置
 * 统一管理分类定义，避免硬编码在组件中
 */

export interface Category {
	/** 分类标识（英文） */
	key: string;
	/** 中文显示名 */
	label: string;
	/** 图标 class */
	icon: string;
	/** 匹配此分类的标签列表（用于按 tag 筛选笔记） */
	tags: string[];
}

/**
 * 8大专业分类 + "全部"
 * tags 数组用于本地时间线 API 按标签筛选
 */
export const categories: Category[] = [
	{
		key: 'all',
		label: '全部',
		icon: 'ti ti-apps',
		tags: [],
	},
	{
		key: 'illustration',
		label: '2D插画',
		icon: 'ti ti-pencil',
		tags: ['插画', '2D', 'illustration', '原画', '手绘', '数字绘画', '平面设计', '海报', 'UI设计'],
	},
	{
		key: 'modeling',
		label: '3D建模',
		icon: 'ti ti-cube',
		tags: ['建模', '3D', 'modeling', 'ZBrush', 'Maya', 'Blender', '雕刻', '角色建模', '场景建模', '拓扑'],
	},
	{
		key: 'concept',
		label: '概念设计',
		icon: 'ti ti-brush',
		tags: ['概念设计', 'concept', '原画', '场景原画', '角色原画', '道具设计', '世界观', '设定'],
	},
	{
		key: 'game-art',
		label: '游戏美术',
		icon: 'ti ti-device-gamepad',
		tags: ['游戏美术', 'game art', '游戏', '贴图', '材质', 'spine', '像素', 'low poly'],
	},
	{
		key: 'animation',
		label: '动画特效',
		icon: 'ti ti-player-play',
		tags: ['动画', '特效', 'animation', 'VFX', '动态', 'motion', '粒子', '流体', '布料'],
	},
	{
		key: 'architecture',
		label: '建筑产品',
		icon: 'ti ti-building',
		tags: ['建筑', '产品', 'architecture', '室内', '景观', '工业设计', '产品渲染', '空间'],
	},
	{
		key: 'tech',
		label: '技术工具',
		icon: 'ti ti-tool',
		tags: ['技术', '工具', 'tech', '教程', '插件', '脚本', '工作流', 'pipeline', '自动化'],
	},
	{
		key: 'other',
		label: '其他',
		icon: 'ti ti-dots',
		tags: ['其他', 'other', '杂项'],
	},
];

// ---- 投稿分类（Post Form 专用）----

export interface PostSubCategory {
	key: string;
	label: string;
	tag: string;
}

export interface PostCategory {
	key: string;
	label: string;
	icon: string;
	subs: PostSubCategory[];
}

/**
 * 投稿时的主分类 + 子分类
 * AI工具 和 CG资讯 有独立的子分类列表，不混入创作软件
 */
export const postCategories: PostCategory[] = [
	{
		key: 'work',
		label: 'CG作品',
		icon: 'ti ti-palette',
		subs: [
			{ key: 'illustration', label: '2D插画', tag: '插画' },
			{ key: 'modeling', label: '3D建模', tag: '建模' },
			{ key: 'concept', label: '概念设计', tag: '概念设计' },
			{ key: 'game-art', label: '游戏美术', tag: '游戏美术' },
			{ key: 'animation', label: '动画特效', tag: '动画' },
			{ key: 'architecture', label: '建筑产品', tag: '建筑' },
			{ key: 'tech', label: '技术工具', tag: '技术' },
			{ key: 'other', label: '其他', tag: '其他' },
		],
	},
	{
		key: 'ai-tool',
		label: 'AI工具',
		icon: 'ti ti-robot',
		subs: [
			{ key: 'ai-image', label: 'AI绘画', tag: 'AI绘画' },
			{ key: 'ai-3d', label: 'AI建模', tag: 'AI建模' },
			{ key: 'ai-video', label: 'AI视频', tag: 'AI视频' },
			{ key: 'ai-text', label: 'AI文本', tag: 'AI文本' },
			{ key: 'ai-code', label: 'AI编程', tag: 'AI编程' },
			{ key: 'ai-audio', label: 'AI音频', tag: 'AI音频' },
			{ key: 'ai-other', label: '其他AI', tag: 'AI工具' },
		],
	},
	{
		key: 'news',
		label: 'CG资讯',
		icon: 'ti ti-news',
		subs: [
			{ key: 'industry', label: '行业动态', tag: '行业动态' },
			{ key: 'software', label: '软件更新', tag: '软件更新' },
			{ key: 'tutorial', label: '教程', tag: '教程' },
			{ key: 'event', label: '活动赛事', tag: '活动赛事' },
			{ key: 'job', label: '招聘求职', tag: '招聘' },
			{ key: 'news-other', label: '其他资讯', tag: 'CG资讯' },
		],
	},
];

/**
 * 获取分类的标签映射（key -> tags[]），供组件使用
 */
export function getCategoryTagMap(): Record<string, string[]> {
	const map: Record<string, string[]> = {};
	for (const cat of categories) {
		if (cat.key !== 'all') {
			map[cat.key] = cat.tags;
		}
	}
	return map;
}
