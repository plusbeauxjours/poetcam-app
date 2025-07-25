import React, { useMemo, forwardRef } from 'react';
import { 
  Canvas, 
  Group, 
  Image as SkiaImage, 
  Text as SkiaText, 
  useImage,
  useFont,
  Skia,
  Paint,
  Shadow,
  rect,
  rrect,
  RoundedRect,
  Rect,
} from '@shopify/react-native-skia';
import { View, StyleSheet } from 'react-native';
import {
  OverlayTextOptions,
  ImageDimensions,
  TextPosition,
  TextStyle,
  TextShadow,
  TextBorder,
  TextBackground,
} from '../../services/imageOverlayEngine';

interface TextOverlayCanvasProps {
  imageUri: string;
  text: string;
  options: OverlayTextOptions;
  dimensions: ImageDimensions;
  onRender?: (success: boolean) => void;
}

export const TextOverlayCanvas = forwardRef<View, TextOverlayCanvasProps>(
  ({ imageUri, text, options, dimensions, onRender }, ref) => {
    // Load image
    const image = useImage(imageUri);
    
    // Load font (you might want to make this configurable)
    const font = useFont(
      require('../../assets/fonts/SpaceMono-Regular.ttf'), 
      options.style.fontSize
    );

    // Create paint objects for text styling
    const textPaint = useMemo(() => {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(options.style.color));
      paint.setAntiAlias(true);
      
      if (options.opacity !== undefined && options.opacity < 1) {
        paint.setAlphaf(options.opacity);
      }
      
      return paint;
    }, [options.style.color, options.opacity]);

    // Create shadow paint if shadow is enabled
    const shadowPaint = useMemo(() => {
      if (!options.shadow) return null;
      
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(options.shadow.color));
      paint.setAntiAlias(true);
      
      if (options.shadow.blur > 0) {
        const filter = Skia.ImageFilter.MakeBlur(
          options.shadow.blur / 2, 
          options.shadow.blur / 2, 
          Skia.TileMode.Decal, 
          null
        );
        paint.setImageFilter(filter);
      }
      
      return paint;
    }, [options.shadow]);

    // Create border paint if border is enabled
    const borderPaint = useMemo(() => {
      if (!options.border) return null;
      
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(options.border.color));
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(options.border.width);
      paint.setAntiAlias(true);
      
      return paint;
    }, [options.border]);

    // Create background paint if background is enabled
    const backgroundPaint = useMemo(() => {
      if (!options.background) return null;
      
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(options.background.color));
      paint.setAntiAlias(true);
      
      if (options.background.opacity !== undefined) {
        paint.setAlphaf(options.background.opacity);
      }
      
      return paint;
    }, [options.background]);

    // Calculate text layout
    const textLayout = useMemo(() => {
      if (!font) return null;

      const lines = text.split('\n');
      const lineHeight = options.style.lineHeight 
        ? options.style.fontSize * options.style.lineHeight 
        : options.style.fontSize * 1.2;
      
      const textMeasurements = lines.map(line => {
        const width = font.getTextWidth(line);
        return { text: line, width, height: lineHeight };
      });

      const totalWidth = Math.max(...textMeasurements.map(tm => tm.width));
      const totalHeight = textMeasurements.length * lineHeight;

      // Calculate absolute position
      let x = options.position.x;
      let y = options.position.y;

      // Handle relative positions (0-1 range)
      if (options.position.x <= 1) {
        x = options.position.x * dimensions.width;
      }
      if (options.position.y <= 1) {
        y = options.position.y * dimensions.height;
      }

      // Apply alignment
      switch (options.position.alignment) {
        case 'center':
          x -= totalWidth / 2;
          break;
        case 'right':
          x -= totalWidth;
          break;
        default: // 'left'
          break;
      }

      switch (options.position.verticalAlignment) {
        case 'middle':
          y -= totalHeight / 2;
          break;
        case 'bottom':
          y -= totalHeight;
          break;
        default: // 'top'
          break;
      }

      return {
        lines: textMeasurements,
        x: Math.max(0, Math.min(x, dimensions.width - totalWidth)),
        y: Math.max(0, Math.min(y, dimensions.height - totalHeight)),
        totalWidth,
        totalHeight,
        lineHeight,
      };
    }, [font, text, options, dimensions]);

    // Calculate background rectangle
    const backgroundRect = useMemo(() => {
      if (!options.background || !textLayout) return null;

      const padding = options.background.padding || 8;
      
      return {
        x: textLayout.x - padding,
        y: textLayout.y - padding,
        width: textLayout.totalWidth + (padding * 2),
        height: textLayout.totalHeight + (padding * 2),
        rx: options.background.borderRadius || 0,
        ry: options.background.borderRadius || 0,
      };
    }, [options.background, textLayout]);

    if (!image || !font || !textLayout) {
      return null;
    }

    return (
      <View ref={ref} style={[styles.container, { width: dimensions.width, height: dimensions.height }]}>
        <Canvas style={styles.canvas}>
          {/* Draw the background image */}
          <SkiaImage
            image={image}
            fit="cover"
            x={0}
            y={0}
            width={dimensions.width}
            height={dimensions.height}
          />
          
          {/* Apply rotation if specified */}
          <Group
            transform={options.rotation ? 
              [{ rotate: (options.rotation * Math.PI) / 180 }] : 
              undefined
            }
          >
            {/* Draw background rectangle if enabled */}
            {backgroundRect && backgroundPaint && (
              <RoundedRect
                rect={rect(backgroundRect.x, backgroundRect.y, backgroundRect.width, backgroundRect.height)}
                rx={backgroundRect.rx}
                ry={backgroundRect.ry}
                paint={backgroundPaint}
              />
            )}

            {/* Draw text shadow if enabled */}
            {options.shadow && shadowPaint && textLayout.lines.map((line, index) => {
              const shadowX = textLayout.x + options.shadow!.offsetX;
              const shadowY = textLayout.y + (index * textLayout.lineHeight) + options.shadow!.offsetY;
              
              let lineX = shadowX;
              if (options.style.textAlign === 'center') {
                lineX = shadowX + (textLayout.totalWidth - line.width) / 2;
              } else if (options.style.textAlign === 'right') {
                lineX = shadowX + textLayout.totalWidth - line.width;
              }

              return (
                <SkiaText
                  key={`shadow-${index}`}
                  x={lineX}
                  y={shadowY + options.style.fontSize}
                  text={line.text}
                  font={font}
                  paint={shadowPaint}
                />
              );
            })}

            {/* Draw text border if enabled */}
            {options.border && borderPaint && textLayout.lines.map((line, index) => {
              const textX = textLayout.x;
              const textY = textLayout.y + (index * textLayout.lineHeight);
              
              let lineX = textX;
              if (options.style.textAlign === 'center') {
                lineX = textX + (textLayout.totalWidth - line.width) / 2;
              } else if (options.style.textAlign === 'right') {
                lineX = textX + textLayout.totalWidth - line.width;
              }

              return (
                <SkiaText
                  key={`border-${index}`}
                  x={lineX}
                  y={textY + options.style.fontSize}
                  text={line.text}
                  font={font}
                  paint={borderPaint}
                />
              );
            })}

            {/* Draw main text */}
            {textLayout.lines.map((line, index) => {
              const textX = textLayout.x;
              const textY = textLayout.y + (index * textLayout.lineHeight);
              
              let lineX = textX;
              if (options.style.textAlign === 'center') {
                lineX = textX + (textLayout.totalWidth - line.width) / 2;
              } else if (options.style.textAlign === 'right') {
                lineX = textX + textLayout.totalWidth - line.width;
              }

              return (
                <SkiaText
                  key={`text-${index}`}
                  x={lineX}
                  y={textY + options.style.fontSize}
                  text={line.text}
                  font={font}
                  paint={textPaint}
                />
              );
            })}
          </Group>
        </Canvas>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  canvas: {
    flex: 1,
  },
});

TextOverlayCanvas.displayName = 'TextOverlayCanvas';