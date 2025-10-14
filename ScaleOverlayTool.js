/**
 * ScaleOverlayTool - Fixed version with proper error handling
 * This fixes the "Cannot read properties of undefined (reading 'data')" error
 * that occurs when switching images in cornerstone3d.js
 */

class ScaleOverlayTool {
  constructor(toolProps = {}) {
    this.toolProps = toolProps;
    this.configuration = {
      ...this.getDefaultConfiguration(),
      ...toolProps.configuration
    };
  }

  getDefaultConfiguration() {
    return {
      // Default configuration options
      showScale: true,
      scaleColor: 'white',
      scalePosition: 'bottom-right',
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif'
    };
  }

  /**
   * Renders the scale annotation with proper error handling
   * This is the method that was failing at line 307 in the original code
   */
  renderAnnotation(enabledElement, svgDrawingHelper) {
    try {
      // Check if enabledElement exists and has required properties
      if (!enabledElement) {
        console.warn('ScaleOverlayTool: enabledElement is undefined');
        return;
      }

      // Check if viewport exists
      if (!enabledElement.viewport) {
        console.warn('ScaleOverlayTool: viewport is undefined');
        return;
      }

      // Check if image data exists - this is the main fix for the error
      const imageData = this.getImageData(enabledElement);
      if (!imageData || !imageData.data) {
        console.warn('ScaleOverlayTool: image data is undefined or missing data property');
        return;
      }

      // Get the scale information
      const scaleInfo = this.calculateScale(enabledElement, imageData);
      if (!scaleInfo) {
        console.warn('ScaleOverlayTool: unable to calculate scale information');
        return;
      }

      // Render the scale overlay
      this.drawScaleOverlay(svgDrawingHelper, scaleInfo, enabledElement);

    } catch (error) {
      console.error('ScaleOverlayTool: Error in renderAnnotation:', error);
      // Don't throw the error, just log it to prevent breaking the rendering pipeline
    }
  }

  /**
   * Safely gets image data with proper null checks
   */
  getImageData(enabledElement) {
    try {
      // Multiple ways to get image data depending on cornerstone version
      if (enabledElement.image && enabledElement.image.data) {
        return enabledElement.image;
      }

      if (enabledElement.viewport && enabledElement.viewport.getCurrentImageId) {
        const imageId = enabledElement.viewport.getCurrentImageId();
        if (imageId) {
          // Try to get image from cache or load it
          const image = this.getImageFromCache(imageId);
          if (image && image.data) {
            return image;
          }
        }
      }

      // Check if there's a direct reference to image data
      if (enabledElement.viewport && enabledElement.viewport.imageData) {
        return enabledElement.viewport.imageData;
      }

      // Last resort - check for any image-like object
      const possibleImage = enabledElement.image || 
                           enabledElement.viewport?.image || 
                           enabledElement.viewport?.imageData;

      if (possibleImage && possibleImage.data) {
        return possibleImage;
      }

      return null;
    } catch (error) {
      console.error('ScaleOverlayTool: Error getting image data:', error);
      return null;
    }
  }

  /**
   * Gets image from cache (placeholder implementation)
   */
  getImageFromCache(imageId) {
    // This would typically interface with cornerstone's image cache
    // Implementation depends on the specific cornerstone version being used
    try {
      // Example cache lookup - adjust based on your cornerstone implementation
      if (window.cornerstone && window.cornerstone.imageCache) {
        return window.cornerstone.imageCache.get(imageId);
      }
      
      // For cornerstone3D
      if (window.cornerstone3D && window.cornerstone3D.cache) {
        return window.cornerstone3D.cache.getImage(imageId);
      }

      return null;
    } catch (error) {
      console.error('ScaleOverlayTool: Error accessing image cache:', error);
      return null;
    }
  }

  /**
   * Calculates scale information from image data
   */
  calculateScale(enabledElement, imageData) {
    try {
      const viewport = enabledElement.viewport;
      
      // Check for required viewport properties
      if (!viewport.scale || !viewport.pixelSpacing) {
        console.warn('ScaleOverlayTool: Missing scale or pixelSpacing in viewport');
        return null;
      }

      // Get pixel spacing - handle different formats
      let pixelSpacing = viewport.pixelSpacing;
      if (Array.isArray(pixelSpacing)) {
        pixelSpacing = pixelSpacing[0]; // Use first value if array
      } else if (typeof pixelSpacing === 'object') {
        pixelSpacing = pixelSpacing.x || pixelSpacing.row || pixelSpacing[0];
      }

      if (!pixelSpacing || pixelSpacing <= 0) {
        console.warn('ScaleOverlayTool: Invalid pixel spacing:', pixelSpacing);
        return null;
      }

      // Calculate scale
      const scale = viewport.scale || 1;
      const scaledPixelSpacing = pixelSpacing / scale;

      // Calculate scale bar length (aim for ~50-100 pixels)
      const targetLength = 80; // pixels
      const actualLength = targetLength * scaledPixelSpacing;
      
      // Round to nice numbers
      const roundedLength = this.roundToNiceNumber(actualLength);
      const scaleBarPixels = roundedLength / scaledPixelSpacing;

      return {
        length: roundedLength,
        pixels: scaleBarPixels,
        unit: this.getUnit(imageData),
        scale: scale,
        pixelSpacing: pixelSpacing
      };
    } catch (error) {
      console.error('ScaleOverlayTool: Error calculating scale:', error);
      return null;
    }
  }

  /**
   * Rounds a number to a "nice" value for display
   */
  roundToNiceNumber(value) {
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    
    let nice;
    if (normalized < 1.5) nice = 1;
    else if (normalized < 3) nice = 2;
    else if (normalized < 7) nice = 5;
    else nice = 10;
    
    return nice * magnitude;
  }

  /**
   * Gets the unit for the scale (mm, cm, etc.)
   */
  getUnit(imageData) {
    // Try to determine unit from image metadata
    if (imageData.metadata && imageData.metadata.unit) {
      return imageData.metadata.unit;
    }
    
    // Default to mm for medical images
    return 'mm';
  }

  /**
   * Draws the scale overlay on the SVG
   */
  drawScaleOverlay(svgDrawingHelper, scaleInfo, enabledElement) {
    try {
      if (!svgDrawingHelper || !scaleInfo) {
        return;
      }

      const viewport = enabledElement.viewport;
      const canvas = enabledElement.canvas || enabledElement.element;
      
      if (!canvas) {
        console.warn('ScaleOverlayTool: No canvas element found');
        return;
      }

      // Get canvas dimensions
      const canvasWidth = canvas.width || canvas.clientWidth;
      const canvasHeight = canvas.height || canvas.clientHeight;

      if (!canvasWidth || !canvasHeight) {
        console.warn('ScaleOverlayTool: Invalid canvas dimensions');
        return;
      }

      // Calculate position based on configuration
      const position = this.calculatePosition(canvasWidth, canvasHeight, scaleInfo);

      // Create scale bar elements
      this.createScaleBar(svgDrawingHelper, position, scaleInfo);
      this.createScaleText(svgDrawingHelper, position, scaleInfo);

    } catch (error) {
      console.error('ScaleOverlayTool: Error drawing scale overlay:', error);
    }
  }

  /**
   * Calculates the position for the scale overlay
   */
  calculatePosition(canvasWidth, canvasHeight, scaleInfo) {
    const margin = 20;
    const barHeight = 4;
    
    // Default to bottom-right
    const x = canvasWidth - scaleInfo.pixels - margin;
    const y = canvasHeight - margin - barHeight - 20; // Leave space for text
    
    return { x, y, barHeight };
  }

  /**
   * Creates the scale bar SVG element
   */
  createScaleBar(svgDrawingHelper, position, scaleInfo) {
    try {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', position.x);
      rect.setAttribute('y', position.y);
      rect.setAttribute('width', scaleInfo.pixels);
      rect.setAttribute('height', position.barHeight);
      rect.setAttribute('fill', this.configuration.scaleColor);
      rect.setAttribute('stroke', 'black');
      rect.setAttribute('stroke-width', '1');
      
      svgDrawingHelper.appendNode(rect);
    } catch (error) {
      console.error('ScaleOverlayTool: Error creating scale bar:', error);
    }
  }

  /**
   * Creates the scale text SVG element
   */
  createScaleText(svgDrawingHelper, position, scaleInfo) {
    try {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', position.x + scaleInfo.pixels / 2);
      text.setAttribute('y', position.y + position.barHeight + 15);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', this.configuration.scaleColor);
      text.setAttribute('font-size', this.configuration.fontSize);
      text.setAttribute('font-family', this.configuration.fontFamily);
      text.setAttribute('stroke', 'black');
      text.setAttribute('stroke-width', '0.5');
      
      text.textContent = `${scaleInfo.length.toFixed(1)} ${scaleInfo.unit}`;
      
      svgDrawingHelper.appendNode(text);
    } catch (error) {
      console.error('ScaleOverlayTool: Error creating scale text:', error);
    }
  }

  /**
   * Called when the tool is activated
   */
  onSetToolActive() {
    // Tool activation logic
  }

  /**
   * Called when the tool is deactivated
   */
  onSetToolPassive() {
    // Tool deactivation logic
  }

  /**
   * Called when the tool is disabled
   */
  onSetToolDisabled() {
    // Tool disable logic
  }
}

export default ScaleOverlayTool;