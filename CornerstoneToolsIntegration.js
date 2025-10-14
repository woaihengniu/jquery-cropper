/**
 * @cornerstonejs/tools 集成指南和使用示例
 * 修复 ScaleOverlayTool 切换图像时的错误
 */

import { addTool, ToolGroupManager, Enums } from '@cornerstonejs/tools';
import { RenderingEngine, imageLoader } from '@cornerstonejs/core';
import FixedScaleOverlayTool from './CornerstoneToolsFix.js';

/**
 * 方法1: 完全替换原有的ScaleOverlayTool
 */
export function setupFixedScaleOverlayTool() {
  try {
    // 添加修复版本的工具
    addTool(FixedScaleOverlayTool);
    
    console.log('✅ 修复版本的ScaleOverlayTool已成功添加');
    return true;
  } catch (error) {
    console.error('❌ 添加修复版本工具时出错:', error);
    return false;
  }
}

/**
 * 方法2: 创建工具组并配置ScaleOverlayTool
 */
export function createToolGroupWithFixedScale(toolGroupId = 'myToolGroup') {
  try {
    // 创建工具组
    const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
    
    if (!toolGroup) {
      throw new Error('无法创建工具组');
    }

    // 添加修复版本的ScaleOverlayTool
    toolGroup.addTool(FixedScaleOverlayTool.toolName, {
      configuration: {
        showScale: true,
        scaleColor: 'rgb(255, 255, 0)', // 黄色
        location: 'bottom-right',
        minPixelLength: 50,
        maxPixelLength: 100,
        fontSize: '14px',
        fontFamily: 'Helvetica, Arial, sans-serif',
        lineWidth: 2,
        tickLength: 10,
        showUnit: true,
        precision: 1
      }
    });

    // 设置工具为激活状态
    toolGroup.setToolActive(FixedScaleOverlayTool.toolName);

    console.log(`✅ 工具组 ${toolGroupId} 已创建并配置了修复版本的ScaleOverlayTool`);
    return toolGroup;
  } catch (error) {
    console.error('❌ 创建工具组时出错:', error);
    return null;
  }
}

/**
 * 方法3: 完整的集成示例
 */
export async function setupCompleteCornerstone3DWithFixedScale() {
  try {
    // 1. 初始化cornerstone3D
    await initCornerstone3D();

    // 2. 添加修复版本的工具
    setupFixedScaleOverlayTool();

    // 3. 创建渲染引擎
    const renderingEngineId = 'myRenderingEngine';
    const renderingEngine = new RenderingEngine(renderingEngineId);

    // 4. 创建视口
    const viewportId = 'CT_AXIAL';
    const viewportInput = {
      viewportId,
      type: Enums.ViewportType.ORTHOGRAPHIC,
      element: document.getElementById('cornerstone-element'),
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
      },
    };

    renderingEngine.enableElement(viewportInput);

    // 5. 创建工具组
    const toolGroup = createToolGroupWithFixedScale('mainToolGroup');
    
    // 6. 将视口添加到工具组
    toolGroup.addViewport(viewportId, renderingEngineId);

    // 7. 加载图像
    const imageIds = [
      'wadouri:https://example.com/image1.dcm',
      'wadouri:https://example.com/image2.dcm',
      'wadouri:https://example.com/image3.dcm'
    ];

    const viewport = renderingEngine.getViewport(viewportId);
    await viewport.setStack(imageIds, 0);

    // 8. 渲染
    viewport.render();

    console.log('✅ Cornerstone3D 完整设置完成，包含修复版本的ScaleOverlayTool');
    
    return {
      renderingEngine,
      viewport,
      toolGroup
    };

  } catch (error) {
    console.error('❌ 设置Cornerstone3D时出错:', error);
    return null;
  }
}

/**
 * 初始化cornerstone3D (根据您的具体设置调整)
 */
async function initCornerstone3D() {
  // 这里应该包含您的cornerstone3D初始化代码
  // 例如：
  // await cornerstone3D.init();
  // 注册图像加载器等
}

/**
 * 方法4: 安全的图像切换函数
 * 这个函数演示如何安全地切换图像，避免ScaleOverlayTool错误
 */
export async function safeImageSwitch(viewport, newImageId, toolGroup) {
  try {
    console.log(`🔄 开始切换到图像: ${newImageId}`);

    // 1. 暂时禁用ScaleOverlayTool以避免渲染错误
    if (toolGroup) {
      toolGroup.setToolPassive(FixedScaleOverlayTool.toolName);
    }

    // 2. 切换图像
    await viewport.setStack([newImageId], 0);

    // 3. 等待图像加载完成
    await new Promise(resolve => {
      const checkImageLoaded = () => {
        const currentImageId = viewport.getCurrentImageId();
        if (currentImageId === newImageId) {
          resolve();
        } else {
          setTimeout(checkImageLoaded, 50);
        }
      };
      checkImageLoaded();
    });

    // 4. 重新激活ScaleOverlayTool
    if (toolGroup) {
      toolGroup.setToolActive(FixedScaleOverlayTool.toolName);
    }

    // 5. 强制重新渲染
    viewport.render();

    console.log(`✅ 图像切换完成: ${newImageId}`);
    return true;

  } catch (error) {
    console.error('❌ 图像切换时出错:', error);
    
    // 确保工具状态正确
    if (toolGroup) {
      try {
        toolGroup.setToolActive(FixedScaleOverlayTool.toolName);
      } catch (toolError) {
        console.error('❌ 恢复工具状态时出错:', toolError);
      }
    }
    
    return false;
  }
}

/**
 * 方法5: 批量图像切换测试
 * 测试修复版本在快速切换图像时的稳定性
 */
export async function testRapidImageSwitching(viewport, imageIds, toolGroup, delay = 1000) {
  console.log('🧪 开始快速图像切换测试...');
  
  const results = [];
  
  for (let i = 0; i < imageIds.length; i++) {
    const imageId = imageIds[i];
    console.log(`📸 测试图像 ${i + 1}/${imageIds.length}: ${imageId}`);
    
    const startTime = Date.now();
    const success = await safeImageSwitch(viewport, imageId, toolGroup);
    const endTime = Date.now();
    
    results.push({
      imageId,
      success,
      duration: endTime - startTime,
      index: i
    });
    
    if (success) {
      console.log(`✅ 图像 ${i + 1} 切换成功 (${endTime - startTime}ms)`);
    } else {
      console.log(`❌ 图像 ${i + 1} 切换失败`);
    }
    
    // 等待指定延迟
    if (i < imageIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log('📊 测试结果:');
  console.log(`   成功: ${successCount}/${results.length}`);
  console.log(`   平均切换时间: ${averageDuration.toFixed(2)}ms`);
  console.log(`   成功率: ${(successCount / results.length * 100).toFixed(1)}%`);
  
  return results;
}

/**
 * 方法6: 错误监控和报告
 */
export function setupErrorMonitoring() {
  // 监控ScaleOverlayTool相关错误
  const originalConsoleError = console.error;
  
  console.error = function(...args) {
    // 检查是否是ScaleOverlayTool相关错误
    const errorMessage = args.join(' ');
    if (errorMessage.includes('ScaleOverlayTool') || 
        errorMessage.includes('Cannot read properties of undefined')) {
      
      console.warn('🔍 检测到ScaleOverlayTool相关错误:', errorMessage);
      
      // 这里可以添加错误报告逻辑
      // 例如发送到错误监控服务
      reportScaleOverlayError(errorMessage, args);
    }
    
    // 调用原始的console.error
    originalConsoleError.apply(console, args);
  };
}

function reportScaleOverlayError(message, details) {
  // 错误报告逻辑
  const errorReport = {
    timestamp: new Date().toISOString(),
    type: 'ScaleOverlayTool Error',
    message: message,
    details: details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  console.log('📋 错误报告:', errorReport);
  
  // 这里可以发送到您的错误监控服务
  // 例如: sendToErrorService(errorReport);
}

/**
 * 方法7: 工具配置管理
 */
export class ScaleOverlayToolManager {
  constructor(toolGroup) {
    this.toolGroup = toolGroup;
    this.defaultConfig = {
      showScale: true,
      scaleColor: 'rgb(255, 255, 0)',
      location: 'bottom-right',
      minPixelLength: 50,
      maxPixelLength: 100,
      fontSize: '14px',
      fontFamily: 'Helvetica, Arial, sans-serif',
      lineWidth: 2,
      tickLength: 10,
      showUnit: true,
      precision: 1
    };
  }

  /**
   * 更新工具配置
   */
  updateConfiguration(newConfig) {
    try {
      const mergedConfig = { ...this.defaultConfig, ...newConfig };
      
      // 移除旧工具
      this.toolGroup.removeTool(FixedScaleOverlayTool.toolName);
      
      // 添加新配置的工具
      this.toolGroup.addTool(FixedScaleOverlayTool.toolName, {
        configuration: mergedConfig
      });
      
      // 重新激活工具
      this.toolGroup.setToolActive(FixedScaleOverlayTool.toolName);
      
      console.log('✅ ScaleOverlayTool配置已更新');
      return true;
    } catch (error) {
      console.error('❌ 更新ScaleOverlayTool配置时出错:', error);
      return false;
    }
  }

  /**
   * 切换工具显示/隐藏
   */
  toggleVisibility() {
    try {
      const currentConfig = this.toolGroup.getToolConfiguration(FixedScaleOverlayTool.toolName);
      const newShowScale = !currentConfig.configuration.showScale;
      
      this.updateConfiguration({ showScale: newShowScale });
      
      console.log(`✅ ScaleOverlayTool可见性已${newShowScale ? '启用' : '禁用'}`);
      return newShowScale;
    } catch (error) {
      console.error('❌ 切换ScaleOverlayTool可见性时出错:', error);
      return false;
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefault() {
    return this.updateConfiguration(this.defaultConfig);
  }
}

// 导出所有功能
export default {
  setupFixedScaleOverlayTool,
  createToolGroupWithFixedScale,
  setupCompleteCornerstone3DWithFixedScale,
  safeImageSwitch,
  testRapidImageSwitching,
  setupErrorMonitoring,
  ScaleOverlayToolManager
};