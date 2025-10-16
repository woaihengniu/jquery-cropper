# Cornerstone3D ScaleOverlayTool 动态视口问题分析与解决方案

## 问题描述
用户继承了 `ScaleOverlayTool` 并实现了动态跳过视口的功能，但在动态移除视口后无法正常渲染比例尺。

## 根本原因分析

### 1. 初始化时机问题
原代码中的 `_init()` 方法只在工具初始化时调用一次。当动态移除视口从跳过列表后，该视口没有重新执行初始化逻辑。

### 2. 渲染状态不同步
`renderAnnotation()` 方法虽然能控制是否渲染，但当视口从跳过状态恢复时，可能缺少必要的内部状态或DOM元素。

### 3. 缺少清理机制
没有适当的机制来清除已跳过视口的现有比例尺元素，导致状态混乱。

### 4. 缺少重新渲染触发
动态改变跳过状态后，没有触发视口的重新渲染。

## 解决方案

### 1. 添加动态管理方法
```javascript
addSkipViewport(viewportId)    // 添加跳过视口
removeSkipViewport(viewportId) // 移除跳过视口
```

### 2. 实现强制重新渲染
```javascript
_forceRerender(viewportId)     // 强制重新渲染指定视口
_reinitViewport(viewportId)    // 重新初始化视口
```

### 3. 添加清理机制
```javascript
_clearScaleOverlay(viewportId) // 清除比例尺覆盖层
```

### 4. 状态同步机制
```javascript
_refreshAllViewports()         // 刷新所有视口状态
```

## 关键修复点

### 1. 动态移除跳过状态时的处理
```javascript
removeSkipViewport(viewportId) {
    this.skipViewportIds.delete(viewportId);
    // 关键：重新初始化该视口
    this._reinitViewport(viewportId);
}
```

### 2. 重新初始化逻辑
```javascript
_reinitViewport(viewportId) {
    // 先清除现有状态
    this._clearScaleOverlay(viewportId);
    // 重新初始化
    this._init(viewportId);
    // 强制重新渲染
    this._forceRerender(viewportId);
}
```

### 3. 工具激活时的状态检查
```javascript
onSetToolActive() {
    super.onSetToolActive();
    // 重新检查所有视口状态
    this._refreshAllViewports();
}
```

## 使用建议

### 1. 渐进式更新
不要一次性大量更改跳过状态，建议逐个更新以确保稳定性。

### 2. 错误处理
所有动态操作都应该包含适当的错误处理，避免影响其他视口。

### 3. 性能考虑
频繁的动态更新可能影响性能，考虑批量操作或防抖处理。

### 4. 状态验证
在关键操作前验证视口是否存在和有效。

## 测试建议

1. 测试初始跳过状态
2. 测试动态添加跳过视口
3. 测试动态移除跳过视口
4. 测试批量更新跳过列表
5. 测试工具重新激活后的状态
6. 测试异常情况处理

## 注意事项

1. 确保 Cornerstone3D 版本兼容性
2. 根据实际项目调整 DOM 查询逻辑
3. 根据实际渲染引擎获取方式调整代码
4. 考虑多渲染引擎场景的处理