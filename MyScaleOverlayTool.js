import { ScaleOverlayTool } from '@cornerstonejs/tools';

export default class MyScaleOverlayTool extends ScaleOverlayTool {
  static toolName = 'MyScaleOverlay';

  constructor(props = {}) {
    super(props);
    // 取出黑名单，默认空数组
    this.skipViewportIds = new Set((props.configuration && props.configuration.skipViewportIds) || []);
  }

  /* ---- 关键重写 ---- */
  _init(targetViewportId) {
    if (this.skipViewportIds.has(targetViewportId)) return; // 直接跳过
    super._init(targetViewportId); // 官方逻辑
  }

  // myScaleOverlayTool.js
  renderAnnotation(enabledElement, svgDrawingHelper) {
    /* 你的黑名单逻辑 */
    const viewportId = enabledElement.viewport.id;
    if (this.skipViewportIds.has(viewportId)) return false;

    /* 一定要原样把两个参数还给父类 */
    return super.renderAnnotation(enabledElement, svgDrawingHelper);
  }
}