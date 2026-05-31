# Module 3: Custom Node Components

**Parent Document:** [MIGRATION-OVERVIEW.md](./MIGRATION-OVERVIEW.md)

> **Node Shape Coupling:** When layout is `dagre` → nodes use **rectangle** React components. When layout is `D3force` or `radial` → nodes use **circle** (simple shape, no complex content). See [MIGRATION-LAYOUTS.md](./MIGRATION-LAYOUTS.md) for details.

---

## 1. Node Type by Layout

| Layout | Node Shape | Components |
|--------|-----------|------------|
| `dagre` | Rectangle | `TextNode`, `ImageNode`, `VideoNode`, `RichTextNode` |
| `radial` | Circle | Simple circle node |
| `D3force` | Circle | Simple circle node |

---

## 2. TextNode

```typescript
// packages/graph/src/components/nodes/TextNode.tsx

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { graphStore } from '@workspace/store';
import { LIGHT_THEME, DARK_THEME } from '../../theme/theme';
import type { GraphNodeData } from '../../types';

interface TextNodeProps extends NodeProps<GraphNodeData> {}

export const TextNode = memo(function TextNode({ data, selected }: TextNodeProps) {
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = LIGHT_THEME; // derived from prop/context in real implementation
  const nodeSemantic = getNodeSemantic(data.semanticId);

  const backgroundColor = nodeSemantic?.color || theme.nodeColor;

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
          borderRadius: '8px',
          padding: '8px',
          boxSizing: 'border-box',
          border: selected ? '2px solid #FF7D00' : '2px solid transparent',
          boxShadow: selected ? '0 0 8px rgba(255, 125, 0, 0.3)' : 'none',
        }}
      >
        <span
          style={{
            color: theme.labelColor,
            fontSize: '14px',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.title}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});
```

---

## 3. ImageNode

```typescript
// packages/graph/src/components/nodes/ImageNode.tsx

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { graphStore } from '@workspace/store';
import { LIGHT_THEME } from '../../theme/theme';
import type { GraphNodeData } from '../../types';

interface ImageNodeProps extends NodeProps<GraphNodeData> {}

export const ImageNode = memo(function ImageNode({ data, selected }: ImageNodeProps) {
  const [imageError, setImageError] = useState(false);
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = LIGHT_THEME;
  const nodeSemantic = getNodeSemantic(data.semanticId);

  const imageUrl = data.imageUrl || (data as any).thumbnail;
  const fallbackEmoji = '🖼️';

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        style={{
          width: 120,
          height: 80,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: nodeSemantic?.color || theme.nodeColor,
          borderRadius: '8px',
          overflow: 'hidden',
          border: selected ? '2px solid #FF7D00' : '2px solid transparent',
          boxShadow: selected ? '0 0 8px rgba(255, 125, 0, 0.3)' : 'none',
        }}
      >
        <div style={{ flex: 1, backgroundColor: theme.background }}>
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={data.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                opacity: 0.5,
              }}
            >
              {fallbackEmoji}
            </div>
          )}
        </div>
        <span
          style={{
            color: theme.labelColor,
            fontSize: '10px',
            textAlign: 'center',
            padding: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.title}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});
```

---

## 4. VideoNode

```typescript
// packages/graph/src/components/nodes/VideoNode.tsx

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { graphStore } from '@workspace/store';
import { LIGHT_THEME } from '../../theme/theme';
import type { GraphNodeData } from '../../types';

interface VideoNodeProps extends NodeProps<GraphNodeData> {}

export const VideoNode = memo(function VideoNode({ data, selected }: VideoNodeProps) {
  const [imageError, setImageError] = useState(false);
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = LIGHT_THEME;
  const nodeSemantic = getNodeSemantic(data.semanticId);

  const thumbnailUrl = data.thumbnail || (data as any).poster;
  const duration = data.duration;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        style={{
          width: 120,
          height: 90,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: nodeSemantic?.color || theme.nodeColor,
          borderRadius: '8px',
          overflow: 'hidden',
          border: selected ? '2px solid #FF7D00' : '2px solid transparent',
          boxShadow: selected ? '0 0 8px rgba(255, 125, 0, 0.3)' : 'none',
        }}
      >
        <div style={{ position: 'relative', flex: 1, backgroundColor: theme.background }}>
          {thumbnailUrl && !imageError ? (
            <img
              src={thumbnailUrl}
              alt={data.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                opacity: 0.5,
              }}
            >
              🎬
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#fff',
            }}
          >
            ▶
          </div>
          {duration && (
            <span
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#fff',
                fontSize: '10px',
                padding: '2px 4px',
                borderRadius: 2,
              }}
            >
              {formatDuration(duration)}
            </span>
          )}
        </div>
        <span
          style={{
            color: theme.labelColor,
            fontSize: '10px',
            textAlign: 'center',
            padding: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.title}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});
```

---

## 5. RichTextNode

```typescript
// packages/graph/src/components/nodes/RichTextNode.tsx

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { graphStore } from '@workspace/store';
import { LIGHT_THEME } from '../../theme/theme';
import type { GraphNodeData } from '../../types';

interface RichTextNodeProps extends NodeProps<GraphNodeData> {}

export const RichTextNode = memo(function RichTextNode({ data, selected }: RichTextNodeProps) {
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = LIGHT_THEME;
  const nodeSemantic = getNodeSemantic(data.semanticId);

  const content = (data as any).content || (data as any).richText || '';

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        style={{
          width: 120,
          height: 60,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: nodeSemantic?.color || theme.nodeColor,
          borderRadius: '8px',
          padding: '8px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          border: selected ? '2px solid #FF7D00' : '2px solid transparent',
          boxShadow: selected ? '0 0 8px rgba(255, 125, 0, 0.3)' : 'none',
        }}
      >
        <div
          style={{
            flex: 1,
            color: theme.labelColor,
            fontSize: '12px',
            lineHeight: '1.4',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {content}
        </div>
        <span
          style={{
            color: theme.labelColor,
            fontSize: '10px',
            textAlign: 'center',
            opacity: 0.7,
            marginTop: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.title}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});
```

---

## 6. Node Registration

```typescript
// packages/graph/src/components/nodes/index.ts

import { memo } from 'react';
import { TextNode } from './TextNode';
import { ImageNode } from './ImageNode';
import { VideoNode } from './VideoNode';
import { RichTextNode } from './RichTextNode';

export const nodeTypes = {
  text: memo(TextNode),
  image: memo(ImageNode),
  video: memo(VideoNode),
  richText: memo(RichTextNode),
  default: memo(TextNode),
};

export { TextNode, ImageNode, VideoNode, RichTextNode };
```
