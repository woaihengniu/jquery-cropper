/**
 * 针对 @cornerstonejs/tools 的 ScaleOverlayTool 修复方案
 * 修复切换图像时 "Cannot read properties of undefined (reading 'data')" 错误
 */

import { BaseTool } from '@cornerstonejs/tools';
import { utilities } from '@cornerstonejs/core';

/**
 * 修复版本的 ScaleOverlayTool
 * 继承自 @cornerstonejs/tools 的 BaseTool
 */
class FixedScaleOverlayTool extends BaseTool {
  static toolName = 'FixedScaleOverlayTool';

  constructor(
    toolProps = {},
    defaultToolProps = {
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {
        showScale: true,
        scaleColor: 'rgb(255, 255, 0)', // 黄色
        location: 'bottom-right', // 位置：bottom-right, bottom-left, top-right, top-left
        minPixelLength: 50, // 最小像素长度
        maxPixelLength: 100, // 最大像素长度
        fontSize: '14px',
        fontFamily: 'Helvetica, Arial, sans-serif',
        lineWidth: 2,
        tickLength: 10,
        showUnit: true,
        precision: 1 // 小数点精度
      }
    }
  ) {
    super(toolProps, defaultToolProps);
  }

  /**
   * 主要的渲染方法 - 这里是原来出错的地方
   * 添加了全面的错误处理和空值检查
   */
  renderAnnotation(enabledElement, svgDrawingHelper) {
    try {
      // 1. 验证基本参数
      if (!this._validateRenderParameters(enabledElement, svgDrawingHelper)) {
        return false;
      }

      // 2. 获取视口信息
      const viewport = enabledElement.viewport;
      if (!viewport) {
        console.warn('FixedScaleOverlayTool: viewport 未定义');
        return false;
      }

      // 3. 安全获取图像数据 - 这是主要的修复点
      const imageData = this._getImageDataSafely(enabledElement);
      if (!imageData) {
        console.warn('FixedScaleOverlayTool: 图像数据不可用，跳过渲染');
        return false;
      }

      // 4. 获取像素间距信息
      const pixelSpacing = this._getPixelSpacingSafely(imageData, viewport);
      if (!pixelSpacing) {
        console.warn('FixedScaleOverlayTool: 像素间距信息不可用');
        return false;
      }

      // 5. 计算缩放信息
      const scaleInfo = this._calculateScaleInfo(viewport, pixelSpacing);
      if (!scaleInfo) {
        console.warn('FixedScaleOverlayTool: 无法计算缩放信息');
        return false;
      }

      // 6. 渲染缩放尺
      this._renderScale(enabledElement, svgDrawingHelper, scaleInfo);

      return true;

    } catch (error) {
      console.error('FixedScaleOverlayTool: 渲染过程中发生错误:', error);
      // 不抛出错误，避免破坏渲染管道
      return false;
    }
  }

  /**
   * 验证渲染参数
   */
  _validateRenderParameters(enabledElement, svgDrawingHelper) {
    if (!enabledElement) {
      console.warn('FixedScaleOverlayTool: enabledElement 为空');
      return false;
    }

    if (!svgDrawingHelper) {
      console.warn('FixedScaleOverlayTool: svgDrawingHelper 为空');
      return false;
    }

    if (!this.configuration.showScale) {
      return false; // 配置为不显示缩放尺
    }

    return true;
  }

  /**
   * 安全获取图像数据 - 核心修复方法
   * 这个方法解决了原始错误中 data 属性未定义的问题
   */
  _getImageDataSafely(enabledElement) {
    try {
      const viewport = enabledElement.viewport;
      
      // 方法1: 从当前图像ID获取
      if (viewport && typeof viewport.getCurrentImageId === 'function') {
        const currentImageId = viewport.getCurrentImageId();
        if (currentImageId) {
          const imageLoadObject = utilities.imageLoadPoolManager.getImageLoadObject(currentImageId);
          if (imageLoadObject && imageLoadObject.image && imageLoadObject.image.data) {
            return imageLoadObject.image;
          }
        }
      }

      // 方法2: 从视口的图像数据获取
      if (viewport && viewport.getImageData) {
        const imageData = viewport.getImageData();
        if (imageData && imageData.data) {
          return imageData;
        }
      }

      // 方法3: 从enabledElement直接获取
      if (enabledElement.image && enabledElement.image.data) {
        return enabledElement.image;
      }

      // 方法4: 从视口属性获取
      if (viewport && viewport.imageData && viewport.imageData.data) {
        return viewport.imageData;
      }

      // 方法5: 尝试从缓存获取
      if (viewport && viewport.getCurrentImageId) {
        const imageId = viewport.getCurrentImageId();
        if (imageId && window.cornerstone3D) {
          const imageLoadObject = window.cornerstone3D.imageLoader.getImageLoadObject(imageId);
          if (imageLoadObject && imageLoadObject.promise) {
            // 图像正在加载中，返回null等待下次渲染
            return null;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('FixedScaleOverlayTool: 获取图像数据时出错:', error);
      return null;
    }
  }

  /**
   * 安全获取像素间距
   */
  _getPixelSpacingSafely(imageData, viewport) {
    try {
      let pixelSpacing = null;

      // 方法1: 从图像元数据获取
      if (imageData.metadata && imageData.metadata.pixelSpacing) {
        pixelSpacing = imageData.metadata.pixelSpacing;
      }

      // 方法2: 从图像属性获取
      if (!pixelSpacing && imageData.pixelSpacing) {
        pixelSpacing = imageData.pixelSpacing;
      }

      // 方法3: 从视口获取
      if (!pixelSpacing && viewport.pixelSpacing) {
        pixelSpacing = viewport.pixelSpacing;
      }

      // 方法4: 从DICOM标签获取
      if (!pixelSpacing && imageData.data && imageData.data.string) {
        const pixelSpacingTag = imageData.data.string('x00280030');
        if (pixelSpacingTag) {
          const values = pixelSpacingTag.split('\\');
          if (values.length >= 2) {
            pixelSpacing = [parseFloat(values[0]), parseFloat(values[1])];
          }
        }
      }

      // 标准化像素间距格式
      if (pixelSpacing) {
        if (Array.isArray(pixelSpacing)) {
          return pixelSpacing[0]; // 使用行间距
        } else if (typeof pixelSpacing === 'object' && pixelSpacing.x) {
          return pixelSpacing.x;
        } else if (typeof pixelSpacing === 'number') {
          return pixelSpacing;
        }
      }

      return null;
    } catch (error) {
      console.error('FixedScaleOverlayTool: 获取像素间距时出错:', error);
      return null;
    }
  }

  /**
   * 计算缩放信息
   */
  _calculateScaleInfo(viewport, pixelSpacing) {
    try {
      // 获取缩放比例
      const scale = viewport.getZoom ? viewport.getZoom() : (viewport.scale || 1);
      
      if (!scale || scale <= 0) {
        console.warn('FixedScaleOverlayTool: 无效的缩放比例:', scale);
        return null;
      }

      // 计算实际像素间距
      const actualPixelSpacing = pixelSpacing / scale;

      // 计算合适的尺子长度
      const targetPixelLength = this._getTargetPixelLength();
      const realWorldLength = targetPixelLength * actualPixelSpacing;

      // 四舍五入到合适的数值
      const roundedLength = this._roundToNiceNumber(realWorldLength);
      const finalPixelLength = roundedLength / actualPixelSpacing;

      return {
        pixelLength: finalPixelLength,
        realWorldLength: roundedLength,
        unit: this._getUnit(),
        scale: scale,
        pixelSpacing: pixelSpacing
      };
    } catch (error) {
      console.error('FixedScaleOverlayTool: 计算缩放信息时出错:', error);
      return null;
    }
  }

  /**
   * 获取目标像素长度
   */
  _getTargetPixelLength() {
    const minLength = this.configuration.minPixelLength || 50;
    const maxLength = this.configuration.maxPixelLength || 100;
    return (minLength + maxLength) / 2;
  }

  /**
   * 将数值四舍五入到合适的显示数值
   */
  _roundToNiceNumber(value) {
    if (value <= 0) return 1;

    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;

    let nice;
    if (normalized <= 1) nice = 1;
    else if (normalized <= 2) nice = 2;
    else if (normalized <= 5) nice = 5;
    else nice = 10;

    return nice * magnitude;
  }

  /**
   * 获取单位
   */
  _getUnit() {
    // 通常医学图像使用毫米
    return 'mm';
  }

  /**
   * 渲染缩放尺
   */
  _renderScale(enabledElement, svgDrawingHelper, scaleInfo) {
    try {
      const canvas = enabledElement.canvas || enabledElement.element;
      if (!canvas) {
        console.warn('FixedScaleOverlayTool: 找不到画布元素');
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();
      const position = this._calculatePosition(canvasRect, scaleInfo);

      // 创建SVG组
      const scaleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      scaleGroup.setAttribute('class', 'scale-overlay-group');

      // 绘制主线
      this._drawMainLine(scaleGroup, position, scaleInfo);
      
      // 绘制刻度线
      this._drawTicks(scaleGroup, position, scaleInfo);
      
      // 绘制文本
      this._drawText(scaleGroup, position, scaleInfo);

      // 添加到SVG
      svgDrawingHelper.appendNode(scaleGroup);

    } catch (error) {
      console.error('FixedScaleOverlayTool: 渲染缩放尺时出错:', error);
    }
  }

  /**
   * 计算位置
   */
  _calculatePosition(canvasRect, scaleInfo) {
    const margin = 20;
    const location = this.configuration.location || 'bottom-right';
    
    let x, y;
    
    switch (location) {
      case 'bottom-left':
        x = margin;
        y = canvasRect.height - margin - 30;
        break;
      case 'top-right':
        x = canvasRect.width - scaleInfo.pixelLength - margin;
        y = margin + 30;
        break;
      case 'top-left':
        x = margin;
        y = margin + 30;
        break;
      default: // bottom-right
        x = canvasRect.width - scaleInfo.pixelLength - margin;
        y = canvasRect.height - margin - 30;
        break;
    }

    return { x, y };
  }

  /**
   * 绘制主线
   */
  _drawMainLine(group, position, scaleInfo) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', position.x);
    line.setAttribute('y1', position.y);
    line.setAttribute('x2', position.x + scaleInfo.pixelLength);
    line.setAttribute('y2', position.y);
    line.setAttribute('stroke', this.configuration.scaleColor);
    line.setAttribute('stroke-width', this.configuration.lineWidth);
    group.appendChild(line);
  }

  /**
   * 绘制刻度线
   */
  _drawTicks(group, position, scaleInfo) {
    const tickLength = this.configuration.tickLength;
    
    // 左侧刻度
    const leftTick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leftTick.setAttribute('x1', position.x);
    leftTick.setAttribute('y1', position.y - tickLength / 2);
    leftTick.setAttribute('x2', position.x);
    leftTick.setAttribute('y2', position.y + tickLength / 2);
    leftTick.setAttribute('stroke', this.configuration.scaleColor);
    leftTick.setAttribute('stroke-width', this.configuration.lineWidth);
    group.appendChild(leftTick);

    // 右侧刻度
    const rightTick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rightTick.setAttribute('x1', position.x + scaleInfo.pixelLength);
    rightTick.setAttribute('y1', position.y - tickLength / 2);
    rightTick.setAttribute('x2', position.x + scaleInfo.pixelLength);
    rightTick.setAttribute('y2', position.y + tickLength / 2);
    rightTick.setAttribute('stroke', this.configuration.scaleColor);
    rightTick.setAttribute('stroke-width', this.configuration.lineWidth);
    group.appendChild(rightTick);
  }

  /**
   * 绘制文本
   */
  _drawText(group, position, scaleInfo) {
    if (!this.configuration.showUnit) {
      return;
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', position.x + scaleInfo.pixelLength / 2);
    text.setAttribute('y', position.y - 15);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', this.configuration.scaleColor);
    text.setAttribute('font-size', this.configuration.fontSize);
    text.setAttribute('font-family', this.configuration.fontFamily);
    text.setAttribute('stroke', 'black');
    text.setAttribute('stroke-width', '0.5');
    text.setAttribute('paint-order', 'stroke fill');

    const displayValue = scaleInfo.realWorldLength.toFixed(this.configuration.precision);
    text.textContent = `${displayValue} ${scaleInfo.unit}`;
    
    group.appendChild(text);
  }

  /**
   * 工具激活时调用
   */
  onSetToolActive() {
    // 工具激活逻辑
  }

  /**
   * 工具被动时调用
   */
  onSetToolPassive() {
    // 工具被动逻辑
  }

  /**
   * 工具禁用时调用
   */
  onSetToolDisabled() {
    // 工具禁用逻辑
  }
}

export default FixedScaleOverlayTool;