# @cornerstonejs/tools ScaleOverlayTool 修复方案

## 问题描述

在使用 `@cornerstonejs/tools` 包中的 `ScaleOverlayTool` 时，切换图像会出现以下错误：

```
ScaleOverlayTool.js:307  Uncaught TypeError: Cannot read properties of undefined (reading 'data')
    at ScaleOverlayTool.renderAnnotation (ScaleOverlayTool.js:307:36)
    at handleDrawSvg (AnnotationRenderingEngine.js:93:43)
```

## 错误原因

1. **时序问题**：图像切换时，新图像数据可能还未完全加载
2. **空值检查缺失**：原始代码没有验证图像数据对象是否存在
3. **异步加载**：图像加载是异步的，但渲染是同步触发的

## 解决方案

### 1. 修复版本的 ScaleOverlayTool

我创建了一个增强版本的 `FixedScaleOverlayTool`，包含以下改进：

- ✅ **全面的空值检查**：在访问任何属性前验证对象存在性
- ✅ **多种数据获取方式**：提供多个回退方法获取图像数据
- ✅ **错误隔离**：单个组件错误不会影响整个渲染管道
- ✅ **优雅降级**：数据不可用时跳过渲染而不是崩溃
- ✅ **详细日志**：提供清晰的调试信息

### 2. 核心修复点

**原始问题代码（第307行附近）：**
```javascript
// 可能的原始代码
const pixelData = imageData.data; // 当 imageData 为 undefined 时报错
```

**修复后的代码：**
```javascript
// 修复版本
const imageData = this._getImageDataSafely(enabledElement);
if (!imageData || !imageData.data) {
  console.warn('图像数据不可用，跳过渲染');
  return false;
}
const pixelData = imageData.data; // 现在是安全的
```

## 使用方法

### 方法1: 基本集成

```javascript
import { addTool, ToolGroupManager } from '@cornerstonejs/tools';
import FixedScaleOverlayTool from './CornerstoneToolsFix.js';

// 1. 添加修复版本的工具
addTool(FixedScaleOverlayTool);

// 2. 创建工具组
const toolGroup = ToolGroupManager.createToolGroup('myToolGroup');

// 3. 添加工具到工具组
toolGroup.addTool(FixedScaleOverlayTool.toolName, {
  configuration: {
    showScale: true,
    scaleColor: 'rgb(255, 255, 0)',
    location: 'bottom-right',
    fontSize: '14px'
  }
});

// 4. 激活工具
toolGroup.setToolActive(FixedScaleOverlayTool.toolName);
```

### 方法2: 完整设置

```javascript
import { 
  setupFixedScaleOverlayTool,
  createToolGroupWithFixedScale,
  safeImageSwitch 
} from './CornerstoneToolsIntegration.js';

// 设置修复版本的工具
setupFixedScaleOverlayTool();

// 创建配置好的工具组
const toolGroup = createToolGroupWithFixedScale('mainToolGroup');

// 将视口添加到工具组
toolGroup.addViewport('myViewport', 'myRenderingEngine');
```

### 方法3: 安全的图像切换

```javascript
import { safeImageSwitch } from './CornerstoneToolsIntegration.js';

// 安全切换图像，避免ScaleOverlayTool错误
async function switchImage(newImageId) {
  const success = await safeImageSwitch(viewport, newImageId, toolGroup);
  if (success) {
    console.log('图像切换成功');
  } else {
    console.log('图像切换失败');
  }
}

// 使用示例
switchImage('wadouri:https://example.com/new-image.dcm');
```

## 配置选项

```javascript
const configuration = {
  showScale: true,              // 是否显示缩放尺
  scaleColor: 'rgb(255, 255, 0)', // 缩放尺颜色（黄色）
  location: 'bottom-right',     // 位置：bottom-right, bottom-left, top-right, top-left
  minPixelLength: 50,           // 最小像素长度
  maxPixelLength: 100,          // 最大像素长度
  fontSize: '14px',             // 字体大小
  fontFamily: 'Helvetica, Arial, sans-serif', // 字体
  lineWidth: 2,                 // 线条宽度
  tickLength: 10,               // 刻度线长度
  showUnit: true,               // 是否显示单位
  precision: 1                  // 小数点精度
};
```

## 高级功能

### 1. 工具配置管理

```javascript
import { ScaleOverlayToolManager } from './CornerstoneToolsIntegration.js';

const manager = new ScaleOverlayToolManager(toolGroup);

// 更新配置
manager.updateConfiguration({
  scaleColor: 'rgb(255, 0, 0)', // 改为红色
  fontSize: '16px'
});

// 切换显示/隐藏
manager.toggleVisibility();

// 重置为默认配置
manager.resetToDefault();
```

### 2. 错误监控

```javascript
import { setupErrorMonitoring } from './CornerstoneToolsIntegration.js';

// 启用错误监控
setupErrorMonitoring();

// 现在所有ScaleOverlayTool相关错误都会被捕获和报告
```

### 3. 批量图像切换测试

```javascript
import { testRapidImageSwitching } from './CornerstoneToolsIntegration.js';

const imageIds = [
  'wadouri:https://example.com/image1.dcm',
  'wadouri:https://example.com/image2.dcm',
  'wadouri:https://example.com/image3.dcm'
];

// 测试快速切换图像的稳定性
const results = await testRapidImageSwitching(viewport, imageIds, toolGroup, 500);
console.log('测试结果:', results);
```

## 兼容性

- ✅ `@cornerstonejs/tools` v1.x
- ✅ `@cornerstonejs/core` v1.x  
- ✅ 所有现代浏览器
- ✅ TypeScript 支持（需要类型定义）

## 迁移指南

### 从原始 ScaleOverlayTool 迁移：

1. **安装修复版本**：
   ```javascript
   import FixedScaleOverlayTool from './CornerstoneToolsFix.js';
   addTool(FixedScaleOverlayTool);
   ```

2. **替换工具名称**：
   ```javascript
   // 原来
   toolGroup.addTool('ScaleOverlayTool');
   
   // 现在
   toolGroup.addTool(FixedScaleOverlayTool.toolName);
   ```

3. **更新配置**（可选）：
   ```javascript
   // 新的配置选项
   toolGroup.addTool(FixedScaleOverlayTool.toolName, {
     configuration: {
       location: 'bottom-right', // 新增位置选项
       precision: 1,             // 新增精度选项
       // ... 其他配置
     }
   });
   ```

## 故障排除

### 常见问题和解决方案：

**Q1: 工具不显示**
```javascript
// 检查工具是否正确激活
console.log(toolGroup.getToolConfiguration(FixedScaleOverlayTool.toolName));
toolGroup.setToolActive(FixedScaleOverlayTool.toolName);
```

**Q2: 切换图像时仍有错误**
```javascript
// 使用安全切换函数
import { safeImageSwitch } from './CornerstoneToolsIntegration.js';
await safeImageSwitch(viewport, newImageId, toolGroup);
```

**Q3: 缩放尺显示不正确**
```javascript
// 检查图像元数据中的像素间距
const imageData = viewport.getImageData();
console.log('像素间距:', imageData?.metadata?.pixelSpacing);
```

**Q4: 性能问题**
```javascript
// 在大量图像切换时暂时禁用工具
toolGroup.setToolPassive(FixedScaleOverlayTool.toolName);
// 执行批量操作
// ...
toolGroup.setToolActive(FixedScaleOverlayTool.toolName);
```

## 调试技巧

1. **启用详细日志**：
   ```javascript
   // 在浏览器控制台中查看详细的调试信息
   // 修复版本会自动输出有用的警告和错误信息
   ```

2. **检查图像数据**：
   ```javascript
   // 验证图像数据是否正确加载
   const imageData = viewport.getImageData();
   console.log('图像数据状态:', {
     hasData: !!imageData?.data,
     hasMetadata: !!imageData?.metadata,
     pixelSpacing: imageData?.metadata?.pixelSpacing
   });
   ```

3. **监控工具状态**：
   ```javascript
   // 检查工具当前状态
   const toolConfig = toolGroup.getToolConfiguration(FixedScaleOverlayTool.toolName);
   console.log('工具配置:', toolConfig);
   ```

## 性能优化

1. **按需渲染**：修复版本只在数据可用时渲染
2. **错误缓存**：避免重复的错误检查
3. **异步友好**：与cornerstone的异步加载机制兼容

## 支持

如果您遇到问题：

1. 检查浏览器控制台的错误和警告信息
2. 验证您的cornerstone3D设置是否正确
3. 确认图像数据格式符合DICOM标准
4. 使用提供的测试函数验证修复效果

修复版本设计为向后兼容，应该可以直接替换原始的ScaleOverlayTool而无需修改现有代码。