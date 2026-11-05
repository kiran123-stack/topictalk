import React from 'react';
import { MessageSquareText, Sparkles } from 'lucide-react';

interface TopicTalkLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Clean, modern, premium brand logo for TOPICTALK
 * Combines an electric-blue icon mark with the signature stencil letterforms,
 * perfectly styled for a modern light UI (no dark olive background).
 */
export const TopicTalkLogo: React.FC<TopicTalkLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 36 : 28;
  const svgHeight = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none transition-transform hover:scale-[1.02] cursor-pointer ${className}`}
      title="TopicTalk"
    >
      {/* Vibrant Electric Blue Brand Icon Mark */}
      <div
        className="rounded-xl flex items-center justify-center shadow-[0_4px_14px_rgba(0,117,255,0.28)] bg-gradient-to-tr from-[#0066ee] to-[#00a2ff] text-white"
        style={{ width: iconSize, height: iconSize }}
      >
        <MessageSquareText className="w-4 h-4 stroke-[2.2]" />
      </div>

      {/* Signature Stencil Wordmark: Clean, razor-sharp slate & electric blue */}
      <div className="flex items-center">
        <svg
          height={svgHeight}
          viewBox="0 0 350 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="select-none drop-shadow-xs"
          aria-label="TOPICTALK"
        >
          {/* "TOPIC" in deep slate #0f172a with authentic stencil cuts */}
          <g fill="#0f172a" stroke="#0f172a" strokeWidth="0.8">
            {/* T */}
            <path d="M 8 10 H 38 V 14 H 25 V 38 H 21 V 14 H 8 Z" />

            {/* O (stencil cuts at top and bottom of sides) */}
            <path d="M 46 22 C 46 14 54 10 66 10 C 78 10 86 14 86 22 H 81 C 81 16 75 14 66 14 C 57 14 51 16 51 22 Z" />
            <path d="M 46 26 C 46 34 54 38 66 38 C 78 38 86 34 86 26 H 81 C 81 32 75 34 66 34 C 57 34 51 32 51 26 Z" />

            {/* P (loop stencil gap) */}
            <path d="M 96 10 H 117 C 125 10 130 14 130 20 C 130 25 126 28 119 29 V 25 C 123 24 125 22 125 20 C 125 15 121 14 116 14 H 101 V 38 H 96 Z" />
            <path d="M 101 26 H 114 C 117 26 120 27 120 29 H 101 Z" />

            {/* I */}
            <path d="M 139 10 H 144 V 38 H 139 Z" />

            {/* C (stencil arc) */}
            <path d="M 183 16 C 180 12 174 10 166 10 C 156 10 149 15 149 22 H 154 C 154 17 159 14 166 14 C 172 14 176 16 179 19 Z" />
            <path d="M 149 26 C 149 33 156 38 166 38 C 174 38 180 36 183 32 L 179 29 C 176 32 172 34 166 34 C 159 34 154 31 154 26 Z" />
          </g>

          {/* "TALK" in electric blue #0075FF with authentic stencil cuts */}
          <g fill="#0075FF" stroke="#0075FF" strokeWidth="0.8">
            {/* T */}
            <path d="M 194 10 H 224 V 14 H 211 V 38 H 207 V 14 H 194 Z" />

            {/* A (apex split and extended crossbar) */}
            <path d="M 238 10 L 250 38 H 245 L 241 30 H 232 L 228 38 H 223 L 235 10 Z M 237 17 L 234 26 H 240 Z" />
            <path d="M 230 26 H 243 V 29 H 230 Z" />

            {/* L */}
            <path d="M 257 10 H 262 V 34 H 278 V 38 H 257 Z" />

            {/* K (detached stem and angled arms) */}
            <path d="M 285 10 H 290 V 38 H 285 Z" />
            <path d="M 308 10 L 295 24 L 309 38 H 303 L 292 26 L 292 23 L 303 10 Z" />
          </g>
        </svg>
      </div>
    </div>
  );
};
