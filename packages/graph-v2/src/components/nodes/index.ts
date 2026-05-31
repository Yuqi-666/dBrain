import { memo } from 'react';
import { TextNode } from './TextNode';
import { ImageNode } from './ImageNode';
import { VideoNode } from './VideoNode';
import { RichTextNode } from './RichTextNode';
import { CircleNode } from './CircleNode';
import type { NodeTypes } from '@xyflow/react';

export const nodeTypes: NodeTypes = {
  text: memo(TextNode),
  image: memo(ImageNode),
  video: memo(VideoNode),
  richText: memo(RichTextNode),
  circle: memo(CircleNode),
  default: memo(TextNode),
};

export { TextNode, ImageNode, VideoNode, RichTextNode, CircleNode };
