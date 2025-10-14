/**
 * Example usage of the fixed ScaleOverlayTool
 * This demonstrates how to use the fixed components to avoid the
 * "Cannot read properties of undefined (reading 'data')" error
 */

import ScaleOverlayTool from './ScaleOverlayTool.js';
import AnnotationRenderingEngine from './AnnotationRenderingEngine.js';

// Example 1: Basic setup
function setupScaleOverlayTool() {
  // Create rendering engine
  const renderingEngine = new AnnotationRenderingEngine();
  
  // Create scale overlay tool with configuration
  const scaleOverlayTool = new ScaleOverlayTool({
    configuration: {
      showScale: true,
      scaleColor: 'white',
      scalePosition: 'bottom-right',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif'
    }
  });
  
  return { renderingEngine, scaleOverlayTool };
}

// Example 2: Safe image switching
async function switchImageSafely(viewport, newImageId, renderingEngine) {
  try {
    console.log(`Switching to image: ${newImageId}`);
    
    // Set the new image
    await viewport.setImageId(newImageId);
    
    // Wait a bit for the image to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Schedule rendering (the fixed tool will handle any missing data gracefully)
    renderingEngine.scheduleRender();
    
    console.log('Image switch completed successfully');
  } catch (error) {
    console.error('Error switching image:', error);
  }
}

// Example 3: Handling multiple viewports
function setupMultipleViewports() {
  const renderingEngine = new AnnotationRenderingEngine();
  const viewports = [];
  
  // Create multiple viewports
  for (let i = 0; i < 3; i++) {
    const viewport = createViewport(`viewport-${i}`);
    const scaleOverlayTool = new ScaleOverlayTool();
    
    // Register the tool with the viewport
    renderingEngine.addAnnotation(`viewport-${i}`, scaleOverlayTool);
    
    viewports.push({ viewport, tool: scaleOverlayTool });
  }
  
  return { renderingEngine, viewports };
}

// Example 4: Error handling during rapid image switching
async function rapidImageSwitching(viewport, imageIds, renderingEngine) {
  console.log('Starting rapid image switching test...');
  
  for (let i = 0; i < imageIds.length; i++) {
    try {
      const imageId = imageIds[i];
      console.log(`Switching to image ${i + 1}/${imageIds.length}: ${imageId}`);
      
      // Switch image without waiting for completion
      viewport.setImageId(imageId);
      
      // Small delay to simulate rapid switching
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Force render (the fixed tool will handle any race conditions)
      renderingEngine.forceRender();
      
    } catch (error) {
      console.error(`Error during rapid switch ${i}:`, error);
      // Continue with next image even if one fails
    }
  }
  
  console.log('Rapid image switching test completed');
}

// Example 5: Custom error handling
function createScaleOverlayWithCustomErrorHandling() {
  const scaleOverlayTool = new ScaleOverlayTool();
  
  // Override renderAnnotation with additional custom error handling
  const originalRenderAnnotation = scaleOverlayTool.renderAnnotation.bind(scaleOverlayTool);
  
  scaleOverlayTool.renderAnnotation = function(enabledElement, svgDrawingHelper) {
    try {
      // Call the fixed version
      originalRenderAnnotation(enabledElement, svgDrawingHelper);
    } catch (error) {
      // Custom error handling
      console.error('Custom error handler - ScaleOverlayTool failed:', error);
      
      // You could implement fallback behavior here
      this.renderFallbackScale(enabledElement, svgDrawingHelper);
    }
  };
  
  // Fallback rendering method
  scaleOverlayTool.renderFallbackScale = function(enabledElement, svgDrawingHelper) {
    try {
      // Simple fallback - just show "Scale unavailable"
      if (svgDrawingHelper && enabledElement.canvas) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '20');
        text.setAttribute('y', enabledElement.canvas.height - 20);
        text.setAttribute('fill', 'yellow');
        text.setAttribute('font-size', '12px');
        text.textContent = 'Scale unavailable';
        svgDrawingHelper.appendNode(text);
      }
    } catch (fallbackError) {
      console.error('Even fallback rendering failed:', fallbackError);
    }
  };
  
  return scaleOverlayTool;
}

// Example 6: Integration with cornerstone3D tools
function integrateWithCornerstone3D() {
  // This would be used with actual cornerstone3D setup
  const example = `
    import { addTool, ToolGroupManager } from '@cornerstonejs/tools';
    import ScaleOverlayTool from './ScaleOverlayTool.js';
    
    // Add the fixed tool
    addTool(ScaleOverlayTool);
    
    // Create tool group
    const toolGroup = ToolGroupManager.createToolGroup('myToolGroup');
    
    // Add scale overlay tool
    toolGroup.addTool(ScaleOverlayTool.toolName, {
      configuration: {
        showScale: true,
        scaleColor: '#FFFFFF'
      }
    });
    
    // Set tool active
    toolGroup.setToolActive(ScaleOverlayTool.toolName);
    
    // Add viewports to tool group
    toolGroup.addViewport('viewport1', 'renderingEngine1');
  `;
  
  console.log('Cornerstone3D integration example:', example);
}

// Example 7: Testing the fix
async function testScaleOverlayFix() {
  console.log('Testing ScaleOverlayTool fix...');
  
  const { renderingEngine, scaleOverlayTool } = setupScaleOverlayTool();
  
  // Mock viewport and image data for testing
  const mockViewport = {
    scale: 1.0,
    pixelSpacing: 0.5, // 0.5mm per pixel
    getCurrentImageId: () => 'test-image-1'
  };
  
  const mockEnabledElement = {
    viewport: mockViewport,
    canvas: { width: 512, height: 512 },
    image: {
      data: new Uint16Array(512 * 512), // Mock image data
      metadata: { unit: 'mm' }
    }
  };
  
  const mockSvgHelper = {
    appendNode: (node) => console.log('Would append SVG node:', node.tagName),
    clear: () => console.log('Would clear SVG')
  };
  
  try {
    // Test normal rendering
    scaleOverlayTool.renderAnnotation(mockEnabledElement, mockSvgHelper);
    console.log('✓ Normal rendering test passed');
    
    // Test with missing image data
    const mockElementNoData = { ...mockEnabledElement, image: null };
    scaleOverlayTool.renderAnnotation(mockElementNoData, mockSvgHelper);
    console.log('✓ Missing image data test passed (no error thrown)');
    
    // Test with undefined viewport
    const mockElementNoViewport = { ...mockEnabledElement, viewport: null };
    scaleOverlayTool.renderAnnotation(mockElementNoViewport, mockSvgHelper);
    console.log('✓ Missing viewport test passed (no error thrown)');
    
    // Test with completely undefined element
    scaleOverlayTool.renderAnnotation(null, mockSvgHelper);
    console.log('✓ Null element test passed (no error thrown)');
    
    console.log('All tests passed! The fix is working correctly.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Helper function to create a mock viewport
function createViewport(id) {
  return {
    id: id,
    scale: 1.0,
    pixelSpacing: [0.5, 0.5],
    getCurrentImageId: () => `image-${id}`,
    setImageId: async (imageId) => {
      console.log(`Viewport ${id} loading image: ${imageId}`);
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
      console.log(`Viewport ${id} loaded image: ${imageId}`);
    }
  };
}

// Export examples for use
export {
  setupScaleOverlayTool,
  switchImageSafely,
  setupMultipleViewports,
  rapidImageSwitching,
  createScaleOverlayWithCustomErrorHandling,
  integrateWithCornerstone3D,
  testScaleOverlayFix
};

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.testScaleOverlayFix = testScaleOverlayFix;
  console.log('ScaleOverlayTool fix examples loaded. Run testScaleOverlayFix() to test.');
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    setupScaleOverlayTool,
    switchImageSafely,
    setupMultipleViewports,
    rapidImageSwitching,
    createScaleOverlayWithCustomErrorHandling,
    integrateWithCornerstone3D,
    testScaleOverlayFix
  };
}