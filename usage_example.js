// 使用示例
import MyScaleOverlayTool from './MyScaleOverlayTool_Fixed.js';
import { ToolGroupManager } from '@cornerstonejs/tools';

// 1. 创建工具实例
const myScaleOverlayTool = new MyScaleOverlayTool({
  configuration: {
    skipViewportIds: ['viewport1', 'viewport2'] // 初始跳过的视口
  }
});

// 2. 注册工具
ToolGroupManager.addTool(MyScaleOverlayTool);

// 3. 添加到工具组并激活
const toolGroup = ToolGroupManager.createToolGroup('myToolGroup');
toolGroup.addTool(MyScaleOverlayTool.toolName);
toolGroup.setToolActive(MyScaleOverlayTool.toolName);

// 4. 动态管理视口
class ViewportScaleManager {
  constructor(toolInstance) {
    this.tool = toolInstance;
  }

  // 动态添加跳过视口
  skipViewport(viewportId) {
    console.log(`Skipping scale overlay for viewport: ${viewportId}`);
    this.tool.addSkipViewport(viewportId);
  }

  // 动态恢复视口比例尺
  showViewportScale(viewportId) {
    console.log(`Showing scale overlay for viewport: ${viewportId}`);
    this.tool.removeSkipViewport(viewportId);
  }

  // 批量更新跳过列表
  updateSkipList(viewportIds) {
    // 清除所有当前跳过的视口
    const currentSkipped = Array.from(this.tool.skipViewportIds);
    currentSkipped.forEach(id => this.showViewportScale(id));

    // 添加新的跳过视口
    viewportIds.forEach(id => this.skipViewport(id));
  }
}

// 5. 使用管理器
const scaleManager = new ViewportScaleManager(myScaleOverlayTool);

// 示例操作
setTimeout(() => {
  // 动态跳过 viewport3
  scaleManager.skipViewport('viewport3');
}, 2000);

setTimeout(() => {
  // 恢复 viewport1 的比例尺
  scaleManager.showViewportScale('viewport1');
}, 4000);

setTimeout(() => {
  // 批量更新跳过列表
  scaleManager.updateSkipList(['viewport2', 'viewport4']);
}, 6000);

export { MyScaleOverlayTool, ViewportScaleManager };