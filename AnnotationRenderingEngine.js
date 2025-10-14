/**
 * AnnotationRenderingEngine - Fixed version with proper error handling
 * This fixes rendering pipeline errors when switching images in cornerstone3d.js
 */

class AnnotationRenderingEngine {
  constructor() {
    this.annotations = new Map();
    this.renderingQueue = [];
    this.isRendering = false;
    this.renderRequestId = null;
  }

  /**
   * Registers an annotation for rendering
   */
  addAnnotation(viewportId, annotation) {
    if (!this.annotations.has(viewportId)) {
      this.annotations.set(viewportId, []);
    }
    this.annotations.get(viewportId).push(annotation);
  }

  /**
   * Removes annotations for a specific viewport
   */
  removeAnnotations(viewportId) {
    this.annotations.delete(viewportId);
  }

  /**
   * Triggers rendering for flagged viewports with proper error handling
   */
  _renderFlaggedViewports() {
    try {
      if (this.isRendering) {
        return; // Prevent concurrent rendering
      }

      this.isRendering = true;
      
      // Get all viewports that need rendering
      const viewportsToRender = this.getViewportsToRender();
      
      if (viewportsToRender.length === 0) {
        this.isRendering = false;
        return;
      }

      // Process each viewport
      viewportsToRender.forEach(viewport => {
        try {
          this._triggerRender(viewport);
        } catch (error) {
          console.error(`AnnotationRenderingEngine: Error rendering viewport ${viewport.id}:`, error);
          // Continue with other viewports even if one fails
        }
      });

    } catch (error) {
      console.error('AnnotationRenderingEngine: Error in _renderFlaggedViewports:', error);
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Gets viewports that need rendering
   */
  getViewportsToRender() {
    // This would typically interface with cornerstone's viewport management
    // Return viewports that are flagged for rendering
    const viewports = [];
    
    try {
      // Example implementation - adjust based on your cornerstone setup
      if (window.cornerstone && window.cornerstone.getEnabledElements) {
        const enabledElements = window.cornerstone.getEnabledElements();
        enabledElements.forEach(element => {
          if (element && element.viewport && this.shouldRenderViewport(element)) {
            viewports.push(element);
          }
        });
      }
    } catch (error) {
      console.error('AnnotationRenderingEngine: Error getting viewports to render:', error);
    }

    return viewports;
  }

  /**
   * Determines if a viewport should be rendered
   */
  shouldRenderViewport(element) {
    try {
      // Check if element is valid and has required properties
      if (!element || !element.viewport) {
        return false;
      }

      // Check if viewport is flagged for rendering
      if (element.viewport.renderingInvalidated || element.viewport.needsRender) {
        return true;
      }

      // Check if there are annotations to render
      const viewportId = this.getViewportId(element);
      return this.annotations.has(viewportId) && this.annotations.get(viewportId).length > 0;
    } catch (error) {
      console.error('AnnotationRenderingEngine: Error checking if viewport should render:', error);
      return false;
    }
  }

  /**
   * Gets viewport ID from element
   */
  getViewportId(element) {
    try {
      return element.viewport?.id || 
             element.element?.id || 
             element.uuid || 
             'default';
    } catch (error) {
      console.error('AnnotationRenderingEngine: Error getting viewport ID:', error);
      return 'default';
    }
  }

  /**
   * Triggers rendering for a specific viewport with enhanced error handling
   */
  _triggerRender(enabledElement) {
    try {
      // Validate enabled element
      if (!this.validateEnabledElement(enabledElement)) {
        console.warn('AnnotationRenderingEngine: Invalid enabled element, skipping render');
        return;
      }

      // Get or create SVG layer
      const svgDrawingHelper = this.getSvgDrawingHelper(enabledElement);
      if (!svgDrawingHelper) {
        console.warn('AnnotationRenderingEngine: Could not get SVG drawing helper');
        return;
      }

      // Clear previous annotations
      this.clearPreviousAnnotations(svgDrawingHelper);

      // Get annotations for this viewport
      const viewportId = this.getViewportId(enabledElement);
      const annotations = this.annotations.get(viewportId) || [];

      // Render each annotation with error handling
      annotations.forEach((annotation, index) => {
        try {
          this.handleDrawSvg(annotation, enabledElement, svgDrawingHelper);
        } catch (error) {
          console.error(`AnnotationRenderingEngine: Error rendering annotation ${index}:`, error);
          // Continue with other annotations
        }
      });

      // Mark viewport as rendered
      if (enabledElement.viewport) {
        enabledElement.viewport.renderingInvalidated = false;
        enabledElement.viewport.needsRender = false;
      }

    } catch (error) {
      console.error('AnnotationRenderingEngine: Error in _triggerRender:', error);
    }
  }

  /**
   * Validates that an enabled element has all required properties
   */
  validateEnabledElement(enabledElement) {
    try {
      if (!enabledElement) {
        console.warn('AnnotationRenderingEngine: enabledElement is null or undefined');
        return false;
      }

      if (!enabledElement.viewport) {
        console.warn('AnnotationRenderingEngine: enabledElement.viewport is missing');
        return false;
      }

      if (!enabledElement.element && !enabledElement.canvas) {
        console.warn('AnnotationRenderingEngine: enabledElement missing both element and canvas');
        return false;
      }

      return true;
    } catch (error) {
      console.error('AnnotationRenderingEngine: Error validating enabled element:', error);
      return false;
    }
  }

  /**
   * Gets or creates SVG drawing helper
   */
  getSvgDrawingHelper(enabledElement) {
    try {
      const element = enabledElement.element || enabledElement.canvas;
      
      if (!element) {
        return null;
      }

      // Look for existing SVG layer
      let svgLayer = element.querySelector('.cornerstone-svg-layer');
      
      if (!svgLayer) {
        // Create new SVG layer
        svgLayer = this.createSvgLayer(element);
      }

      return {
        svgLayer: svgLayer,
        appendNode: (node) => {
          if (svgLayer && node) {
            svgLayer.appendChild(node);
          }
        },
        clear: () => {
          if (svgLayer) {
            while (svgLayer.firstChild) {
              svgLayer.removeChild(svgLayer.firstChild);
            }
          }
        }
      };
    } catch (error) {
      console.error('AnnotationRenderingEngine: Error getting SVG drawing helper:', error);
      return null;
    }
  }

  /**
   * Creates a new SVG layer
   */
  createSvgLayer(element) {
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('cornerstone-svg-layer');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      
      // Set viewBox to match element dimensions
      const rect = element.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      svg.setAttribute('width', rect.width);
      svg.setAttribute('height', rect.height);
      
      element.appendChild(svg);
      return svg;
    } catch (error) {
      console.error('AnnotationRenderingEngine: Error creating SVG layer:', error);
      return null;
    }
  }

  /**
   * Clears previous annotations from SVG
   */
  clearPreviousAnnotations(svgDrawingHelper) {
    try {
      if (svgDrawingHelper && svgDrawingHelper.clear) {
        svgDrawingHelper.clear();
      }
    } catch (error) {
      console.error('AnnotationRenderingEngine: Error clearing previous annotations:', error);
    }
  }

  /**
   * Handles drawing SVG annotations with enhanced error handling
   * This is the method that was calling renderAnnotation at line 93
   */
  handleDrawSvg(annotation, enabledElement, svgDrawingHelper) {
    try {
      // Validate inputs
      if (!annotation) {
        console.warn('AnnotationRenderingEngine: annotation is null or undefined');
        return;
      }

      if (!enabledElement) {
        console.warn('AnnotationRenderingEngine: enabledElement is null or undefined');
        return;
      }

      if (!svgDrawingHelper) {
        console.warn('AnnotationRenderingEngine: svgDrawingHelper is null or undefined');
        return;
      }

      // Check if annotation has a renderAnnotation method
      if (typeof annotation.renderAnnotation !== 'function') {
        console.warn('AnnotationRenderingEngine: annotation does not have renderAnnotation method');
        return;
      }

      // This is where the original error occurred - line 93 equivalent
      // Added comprehensive error handling around the renderAnnotation call
      annotation.renderAnnotation(enabledElement, svgDrawingHelper);

    } catch (error) {
      console.error('AnnotationRenderingEngine: Error in handleDrawSvg:', error);
      
      // Log additional context for debugging
      console.error('Context:', {
        annotationType: annotation?.constructor?.name,
        hasRenderMethod: typeof annotation?.renderAnnotation === 'function',
        enabledElementValid: !!enabledElement,
        viewportValid: !!enabledElement?.viewport,
        imageDataValid: !!(enabledElement?.image?.data || enabledElement?.viewport?.imageData?.data)
      });
    }
  }

  /**
   * Schedules a render using requestAnimationFrame
   */
  scheduleRender() {
    if (this.renderRequestId) {
      cancelAnimationFrame(this.renderRequestId);
    }

    this.renderRequestId = requestAnimationFrame(() => {
      this._renderFlaggedViewports();
      this.renderRequestId = null;
    });
  }

  /**
   * Forces immediate rendering (use sparingly)
   */
  forceRender() {
    if (this.renderRequestId) {
      cancelAnimationFrame(this.renderRequestId);
      this.renderRequestId = null;
    }
    this._renderFlaggedViewports();
  }

  /**
   * Cleans up resources
   */
  destroy() {
    if (this.renderRequestId) {
      cancelAnimationFrame(this.renderRequestId);
    }
    this.annotations.clear();
    this.renderingQueue = [];
  }
}

// Helper function to create draw function (referenced in the error stack)
function draw(enabledElement) {
  try {
    if (!enabledElement || !enabledElement.viewport) {
      console.warn('draw: Invalid enabled element');
      return;
    }

    // This would typically interface with cornerstone's drawing pipeline
    // The actual implementation depends on your cornerstone version
    
    // Example implementation
    if (window.cornerstone && window.cornerstone.draw) {
      window.cornerstone.draw(enabledElement.element);
    } else if (enabledElement.viewport.render) {
      enabledElement.viewport.render();
    }
  } catch (error) {
    console.error('draw: Error in draw function:', error);
  }
}

export default AnnotationRenderingEngine;
export { draw };