import { ScaleOverlayTool } from '@cornerstonejs/tools';

export default class MyScaleOverlayTool extends ScaleOverlayTool {
  static toolName = 'MyScaleOverlay';

  constructor(props = {}) {
    super(props);
    // 取出黑名单，默认空数组
    this.skipViewportIds = new Set((props.configuration && props.configuration.skipViewportIds) || []);
  }

  /**
   * 动态添加视口到跳过列表
   * @param {string} viewportId 
   */
  addSkipViewport(viewportId) {
    this.skipViewportIds.add(viewportId);
    // 强制重新渲染该视口，清除已有的比例尺
    this._forceRerender(viewportId);
  }

  /**
   * 动态移除视口从跳过列表
   * @param {string} viewportId 
   */
  removeSkipViewport(viewportId) {
    this.skipViewportIds.delete(viewportId);
    // 重新初始化该视口的比例尺
    this._reinitViewport(viewportId);
  }

  /**
   * 强制重新渲染指定视口
   * @private
   */
  _forceRerender(viewportId) {
    try {
      const enabledElement = this._getEnabledElementByViewportId(viewportId);
      if (enabledElement && enabledElement.viewport) {
        // 清除现有的比例尺元素
        this._clearScaleOverlay(viewportId);
        // 触发重新渲染
        enabledElement.viewport.render();
      }
    } catch (error) {
      console.warn(`Failed to force rerender for viewport ${viewportId}:`, error);
    }
  }

  /**
   * 重新初始化视口
   * @private
   */
  _reinitViewport(viewportId) {
    try {
      // 先清除现有的比例尺
      this._clearScaleOverlay(viewportId);
      
      // 重新初始化
      this._init(viewportId);
      
      // 强制重新渲染
      const enabledElement = this._getEnabledElementByViewportId(viewportId);
      if (enabledElement && enabledElement.viewport) {
        enabledElement.viewport.render();
      }
    } catch (error) {
      console.warn(`Failed to reinit viewport ${viewportId}:`, error);
    }
  }

  /**
   * 清除指定视口的比例尺覆盖层
   * @private
   */
  _clearScaleOverlay(viewportId) {
    try {
      const enabledElement = this._getEnabledElementByViewportId(viewportId);
      if (enabledElement && enabledElement.viewport) {
        const { canvas } = enabledElement.viewport;
        const svgLayer = canvas.parentElement.querySelector('.cornerstone-svg-layer');
        
        if (svgLayer) {
          // 移除该视口的比例尺相关 SVG 元素
          const scaleElements = svgLayer.querySelectorAll(`[data-viewport-id="${viewportId}"]`);
          scaleElements.forEach(element => element.remove());
          
          // 或者使用更通用的方式，移除所有比例尺相关元素
          const allScaleElements = svgLayer.querySelectorAll('.scale-overlay, .scale-text, .scale-line');
          allScaleElements.forEach(element => {
            // 检查元素是否属于当前视口
            if (this._elementBelongsToViewport(element, viewportId)) {
              element.remove();
            }
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to clear scale overlay for viewport ${viewportId}:`, error);
    }
  }

  /**
   * 检查元素是否属于指定视口
   * @private
   */
  _elementBelongsToViewport(element, viewportId) {
    // 这里需要根据实际的 DOM 结构来判断
    // 可能需要检查父元素或其他属性
    const viewportElement = document.querySelector(`[data-viewport-uid="${viewportId}"]`);
    return viewportElement && viewportElement.contains(element);
  }

  /**
   * 根据视口ID获取启用的元素
   * @private
   */
  _getEnabledElementByViewportId(viewportId) {
    try {
      // 这里需要根据实际的 Cornerstone3D API 来获取
      // 可能需要使用 getRenderingEngine 或其他方法
      const renderingEngine = this._getRenderingEngine();
      if (renderingEngine) {
        const viewport = renderingEngine.getViewport(viewportId);
        if (viewport) {
          return {
            viewport,
            canvas: viewport.canvas
          };
        }
      }
      return null;
    } catch (error) {
      console.warn(`Failed to get enabled element for viewport ${viewportId}:`, error);
      return null;
    }
  }

  /**
   * 获取渲染引擎
   * @private
   */
  _getRenderingEngine() {
    // 这里需要根据实际情况获取渲染引擎实例
    // 可能从全局状态、工具组或其他地方获取
    try {
      const { getRenderingEngine } = require('@cornerstonejs/core');
      return getRenderingEngine(); // 或者传入具体的引擎ID
    } catch (error) {
      console.warn('Failed to get rendering engine:', error);
      return null;
    }
  }

  /* ---- 原有的重写方法 ---- */
  _init(targetViewportId) {
    if (this.skipViewportIds.has(targetViewportId)) return; // 直接跳过
    super._init(targetViewportId); // 官方逻辑
  }

  renderAnnotation(enabledElement, svgDrawingHelper) {
    /* 你的黑名单逻辑 */
    const viewportId = enabledElement.viewport.id;
    if (this.skipViewportIds.has(viewportId)) return false;

    /* 一定要原样把两个参数还给父类 */
    return super.renderAnnotation(enabledElement, svgDrawingHelper);
  }

  /**
   * 重写 onSetToolActive 以确保工具激活时正确处理所有视口
   */
  onSetToolActive() {
    super.onSetToolActive();
    
    // 重新检查所有视口的状态
    this._refreshAllViewports();
  }

  /**
   * 刷新所有视口的比例尺状态
   * @private
   */
  _refreshAllViewports() {
    try {
      const renderingEngine = this._getRenderingEngine();
      if (renderingEngine) {
        const viewports = renderingEngine.getViewports();
        viewports.forEach(viewport => {
          const viewportId = viewport.id;
          
          if (this.skipViewportIds.has(viewportId)) {
            // 清除跳过视口的比例尺
            this._clearScaleOverlay(viewportId);
          } else {
            // 确保非跳过视口有比例尺
            this._init(viewportId);
          }
          
          // 触发重新渲染
          viewport.render();
        });
      }
    } catch (error) {
      console.warn('Failed to refresh all viewports:', error);
    }
  }
}