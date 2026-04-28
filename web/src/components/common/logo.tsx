import React from 'react'

interface Props extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
}

export const LogoIcon: React.FC<Props> = ({
  size = 24, // 默认大小 24px
  color = 'currentColor', // 默认颜色跟随父级文字颜色
  className = '',
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill={color}
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="cloud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="100%" stopColor="#4FACFE" />
        </linearGradient>

        <linearGradient id="beam-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4FACFE" stopOpacity="0.0" />
        </linearGradient>

        <linearGradient id="play-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF007A" />
          <stop offset="100%" stopColor="#7928CA" />
        </linearGradient>

        <linearGradient id="nas-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0B0F19" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="12"
            floodColor="#000000"
            floodOpacity="0.6"
          />
        </filter>

        <path
          id="sparkle"
          d="M 0 -16 C 0 -5, 5 0, 16 0 C 5 0, 0 5, 0 16 C 0 5, -5 0, -16 0 C -5 0, 0 -5, 0 -16 Z"
        />
      </defs>

      <rect x="226" y="140" width="60" height="210" fill="url(#beam-grad)" />

      <circle cx="256" cy="170" r="2.5" fill="#FFFFFF" opacity="0.8" />
      <circle cx="256" cy="220" r="1.5" fill="#FFFFFF" opacity="0.5" />
      <circle cx="256" cy="290" r="3" fill="#FFFFFF" opacity="0.9" />

      <g fill="url(#cloud-grad)" filter="url(#glow)">
        <circle cx="216" cy="100" r="28" />
        <circle cx="256" cy="80" r="42" />
        <circle cx="301" cy="95" r="32" />
        <rect x="188" y="90" width="145" height="38" rx="19" />
      </g>
      <path
        d="M 256 86 L 256 112 M 246 102 L 256 112 L 266 102"
        stroke="#0F172A"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <g transform="translate(0, 10)" filter="url(#drop-shadow)">
        <rect
          x="116"
          y="340"
          width="280"
          height="84"
          rx="20"
          fill="url(#nas-grad)"
          stroke="#38BDF8"
          strokeOpacity="0.4"
          strokeWidth="2"
        />

        <rect
          x="150"
          y="360"
          width="210"
          height="10"
          rx="5"
          fill="#000000"
          fillOpacity="0.6"
        />
        <rect
          x="150"
          y="388"
          width="210"
          height="10"
          rx="5"
          fill="#000000"
          fillOpacity="0.6"
        />
        <circle cx="132" cy="365" r="3.5" fill="#00FF87" filter="url(#glow)" />
        <circle cx="132" cy="393" r="3.5" fill="#00FF87" filter="url(#glow)" />
        <circle cx="380" cy="365" r="3.5" fill="#38BDF8" filter="url(#glow)" />
      </g>

      <g filter="url(#drop-shadow)">
        <polygon
          points="206,140 306,195 206,250"
          fill="#00F2FE"
          fillOpacity="0.25"
          stroke="#00F2FE"
          strokeOpacity="0.9"
          strokeWidth="12"
          strokeLinejoin="round"
        />

        <polygon
          points="226,165 336,220 226,275"
          fill="url(#play-grad)"
          stroke="url(#play-grad)"
          strokeWidth="14"
          strokeLinejoin="round"
        />
      </g>

      <path
        d="M 150 270 C 190 325, 300 325, 360 250"
        fill="none"
        stroke="url(#sparkle-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.9"
      />

      <use
        href="#sparkle"
        x="360"
        y="250"
        transform="scale(1.2)"
        transform-origin="360 250"
        fill="url(#sparkle-grad)"
        filter="url(#glow)"
      />
      <use
        href="#sparkle"
        x="140"
        y="160"
        transform="scale(0.9)"
        transform-origin="140 160"
        fill="#00F2FE"
        filter="url(#glow)"
      />
      <use
        href="#sparkle"
        x="340"
        y="130"
        transform="scale(0.7)"
        transform-origin="340 130"
        fill="url(#sparkle-grad)"
        opacity="0.9"
      />
    </svg>
  )
}
