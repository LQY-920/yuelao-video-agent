# Design
## Reference
主参考：Mobbin / ISO Meet Hero Section
https://mobbin.com/explore/sections/5b101db5-6858-4280-a8d2-77b31aa1353d
实际查看了公开截图，借鉴浅色留白、左右主次布局、圆角预览和少量强调色。重新实现月老自己的产品界面，不复制第三方图片、品牌或源码。Mobbin discover 页面需登录，本轮通过公开 Explore > Sites 获取参考；未取得可下载代码模板。
辅助比较：Lightdash Hero Section（https://mobbin.com/explore/sections/29e133de-34ee-4255-a796-b185d60e359d）。Voiceflow 媒体无法播放，未将其作为视觉依据。
## Scene and theme
创作者在日常明亮的桌面工作环境中，把看到的账号整理成自己的内容方向，需要安静、可读和容易开始的工作台。采用浅色主题。
## Color
Restrained：暖灰与米白为主要表面，珊瑚红只用于主按钮和当前导航状态；绿色只用于保存状态。用 OKLCH 定义 token。
## Typography
Segoe UI / Microsoft YaHei 系统字体，正文14px，说明12px，页面标题32–36px。避免原型里过多10px说明。
## Layout
208px浅色固定导航，64px顶部栏；首页为主要输入区与次要样例预览两栏。可选背景折叠；研究页采用编号步骤导航，报告以纵向阅读为主。
## Components
统一10px按钮/输入圆角、18–24px主要面板圆角；1px边界，轻量阴影用于样例预览。状态区分成功、注意、只读样例和待更新；显式键盘焦点。
## Motion
仅交互状态150ms颜色变化，尊重prefers-reduced-motion。无需装饰动画、摄影素材或生图；实际Mobbin截图与代码浏览器预览足以评估本轮布局。
