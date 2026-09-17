import React, { useEffect, useRef, useState } from 'react';
import { SocialTemplate } from '../../types';

interface CanvasRendererProps {
  template: SocialTemplate;
  content: {
    image: string;
    title: string;
    desc: string;
  };
  maxPreviewSize?: number; // Optional max dimension constraint for desktop preview
  padding?: number; // Optional padding around the canvas
}

export default function CanvasRenderer({ template, content, maxPreviewSize, padding = 48 }: CanvasRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const tplWidth = template.width || 1080;
  const tplHeight = template.height || 1080;

  // Auto-scale the canvas to fit the parent viewport while preserving exact aspect ratio and absolute anchoring
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const updateScale = () => {
      let availableWidth = Math.max(parent.clientWidth - padding, 100);
      let availableHeight = Math.max(parent.clientHeight - padding, 100);

      // If maxPreviewSize is specified, constrain available space to keep canvas smaller on desktop
      if (maxPreviewSize && maxPreviewSize > 0) {
        availableWidth = Math.min(availableWidth, maxPreviewSize);
        availableHeight = Math.min(availableHeight, maxPreviewSize);
      }

      const scaleX = availableWidth / tplWidth;
      const scaleY = availableHeight / tplHeight;

      // Fit entirely in viewport, max scale is 1 (100% native resolution)
      const fittedScale = Math.min(scaleX, scaleY, 1);
      setScale(Math.max(fittedScale, 0.05));
    };

    updateScale();

    // ResizeObserver dynamically recalculates when sidebars or window resize
    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });
    resizeObserver.observe(parent);

    window.addEventListener('resize', updateScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [tplWidth, tplHeight, maxPreviewSize, padding]);

  const scaledWidth = Math.round(tplWidth * scale);
  const scaledHeight = Math.round(tplHeight * scale);

  return (
    <div 
      ref={containerRef}
      className="relative shrink-0 m-auto shadow-2xl transition-all duration-150 rounded-lg overflow-hidden bg-white"
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
      }}
    >
      {/* 
        Native Resolution Stage (e.g. 1080x1080)
        Pinned at top-left (0, 0) of the scaled wrapper and transformed using scaleOrigin 0 0
      */}
      <div
        className="absolute top-0 left-0 bg-white overflow-hidden select-none"
        style={{
          width: `${tplWidth}px`,
          height: `${tplHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Background Layer (Overlay Frame) */}
        {template.bgImage && (
          <img 
            src={template.bgImage} 
            alt="Template Frame" 
            className="absolute inset-0 w-full h-full object-fill pointer-events-none" 
            style={{ zIndex: 15 }} 
          />
        )}

        {/* Render Dynamic Layers */}
        {template.layers.map(layer => {
          const absX = (layer.x / 100) * tplWidth;
          const absY = (layer.y / 100) * tplHeight;
          const absW = (layer.width / 100) * tplWidth;
          const absH = (layer.height / 100) * tplHeight;

          const commonStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${absX}px`,
            top: `${absY}px`,
            width: `${absW}px`,
            height: `${absH}px`,
            zIndex: layer.zIndex,
          };

          if (layer.type === 'image') {
            return (
              <div 
                key={layer.id} 
                className="overflow-hidden" 
                style={{ 
                  ...commonStyle, 
                  borderRadius: layer.borderRadius ? `${layer.borderRadius}px` : 0 
                }}
              >
                {content.image ? (
                  <img 
                    src={content.image} 
                    alt="" 
                    className="w-full h-full"
                    style={{ objectFit: layer.objectFit || 'cover' }}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200/60 flex items-center justify-center">
                    <span className="text-slate-400 font-medium text-sm">Chưa chọn ảnh</span>
                  </div>
                )}
              </div>
            );
          }

          if (layer.type === 'text') {
            const fontRatio = tplWidth / 1080;
            const calculatedFontSize = (layer.fontSize || 32) * fontRatio;
            
            return (
              <div 
                key={layer.id} 
                style={{
                  ...commonStyle,
                  color: layer.color || '#000000',
                  fontWeight: layer.fontWeight || 'normal',
                  textAlign: layer.textAlign || 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                }}
              >
                <div 
                  style={{ 
                    fontSize: `${calculatedFontSize}px`,
                    lineHeight: '1.3',
                    display: '-webkit-box',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    WebkitLineClamp: layer.maxLines || undefined,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                  }}
                >
                  {layer.id.includes('title') ? content.title :
                   layer.id.includes('desc') ? content.desc :
                   layer.text || 'Nội dung văn bản'}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
