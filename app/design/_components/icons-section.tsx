'use client'

import { useState } from 'react'
import { IconCheck, IconCopy } from '@/components/brand/icons'
import type { PixelIconProps } from '@/components/brand/icons/pixel/pixel-core'
import { cn } from '@/lib/utils'
import { CodeBlock } from './code-block'

/** Type for pixel icon components */
type IconComponent = React.ComponentType<PixelIconProps>

// Navigation icons
import {
  IconCaretDown,
  IconCaretLeft,
  IconCaretRight,
  IconCaretUp,
  IconCaretDoubleLeft,
  IconCaretDoubleRight,
  IconArrowRight,
  IconArrowLeft,
  IconArrowDown,
  IconArrowUp,
  IconArrowUpRight,
  IconArrowDownLeft,
  IconRefresh,
  IconUndo,
  IconExternalLink,
} from '@/components/brand/icons'

// Action icons
import {
  IconX,
  IconPlus,
  IconMinus,
  IconSearch,
  IconTrash,
  IconEdit,
  IconEraser,
  IconDownload,
  IconUpload,
  IconSave,
  IconSend,
  IconMoreHorizontal,
  IconMoreVertical,
  IconLink,
  IconUnlink,
  IconSelectAll,
  IconCommand,
} from '@/components/brand/icons'

// Status icons
import {
  IconCheckCircle,
  IconXCircle,
  IconWarningCircle,
  IconInfo,
  IconQuestion,
  IconWarning,
  IconProhibit,
  IconShieldCheck,
  IconShieldWarning,
  IconClock,
  IconHourglass,
  IconCheckSquare,
  IconSquare,
  IconCircle,
  IconBug,
  IconTrendUp,
  IconFlag,
} from '@/components/brand/icons'

// Domain icons
import {
  IconFileText,
  IconFile,
  IconFileCsv,
  IconFileXls,
  IconFilePdf,
  IconFolder,
  IconFolderOpen,
  IconBuildings,
  IconBuilding,
  IconHouse,
  IconTable,
  IconDatabase,
  IconHardDrive,
  IconDollarSign,
  IconMoney,
  IconReceipt,
  IconInvoice,
  IconBank,
  IconCreditCard,
  IconWallet,
  IconCalculator,
  IconChartLine,
  IconChartBar,
  IconChartPie,
  IconCalendar,
  IconCalendarBlank,
  IconTag,
  IconHash,
  IconUser,
  IconUsers,
  IconUserCircle,
  IconBriefcase,
  IconGear,
  IconSliders,
  IconBell,
  IconBellRinging,
  IconEnvelope,
  IconEnvelopeOpen,
  IconChat,
  IconChatDots,
  IconImage,
  IconCamera,
  IconPaperclip,
  IconCloud,
  IconCloudUpload,
  IconCloudDownload,
  IconLock,
  IconUnlock,
  IconKey,
  IconSignIn,
  IconSignOut,
  IconGlobe,
  IconMapPin,
  IconCode,
  IconFileCode,
  IconFilmStrip,
  IconSquaresFour,
  IconGitDiff,
} from '@/components/brand/icons'

// UI icons
import {
  IconLoader,
  IconLoaderStatic,
  IconSpinner,
  IconEye,
  IconEyeOff,
  IconFilter,
  IconSortAsc,
  IconSortDesc,
  IconList,
  IconListBullets,
  IconGrid,
  IconRows,
  IconColumns,
  IconSidebar,
  IconLayout,
  IconSun,
  IconMoon,
  IconDesktop,
  IconLaptop,
  IconMobile,
  IconMaximize,
  IconMinimize,
  IconExpand,
  IconCollapse,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconText,
  IconTextAa,
  IconZoomIn,
  IconZoomOut,
  IconDropdown,
  IconPlay,
  IconPause,
  IconStop,
  IconSkipForward,
  IconSkipBack,
  IconVolumeOn,
  IconVolumeOff,
  IconPower,
  IconLightning,
  IconZap,
} from '@/components/brand/icons'

// AI icons
import {
  IconSparkle,
  IconSparkles,
  IconWand,
  IconRobot,
  IconBrain,
  IconLightbulb,
  IconAtom,
  IconCpu,
  IconCircuitry,
  IconTarget,
  IconCrosshair,
  IconGitBranch,
  IconGitMerge,
  IconPulse,
  IconActivity,
  IconTree,
  IconFlow,
  IconShuffle,
  IconSwap,
  IconStack,
  IconLayers,
} from '@/components/brand/icons'

// Application-specific icons
import {
  IconPanelCollapse,
  IconPanelExpand,
  IconDemo,
  IconReal,
  IconSwitch,
  IconDashboard,
  IconReconcile,
  IconReports,
} from '@/components/brand/icons'

interface IconGridItemProps {
  icon: IconComponent
  name: string
}

function IconGridItem({ icon: Icon, name }: IconGridItemProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`import { ${name} } from '@/components/brand/icons'`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex flex-col items-center justify-center p-3 border transition-all duration-200 cursor-copy group',
        copied ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:bg-secondary/50 hover:border-muted-foreground/30'
      )}
    >
      <Icon size={20} className="text-foreground" />
      <span className="text-[10px] text-muted-foreground mt-2 truncate w-full text-center font-mono">
        {name.replace('Icon', '')}
      </span>
      {copied && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-emerald-500 bg-background px-1.5 py-0.5 border border-emerald-500 whitespace-nowrap">
          Copied!
        </span>
      )}
    </button>
  )
}

interface IconCategory {
  name: string
  description: string
  icons: { icon: IconComponent; name: string }[]
}

const iconCategories: IconCategory[] = [
  {
    name: 'Navigation',
    description: 'Directional icons for navigation and flow control',
    icons: [
      { icon: IconCaretDown, name: 'IconCaretDown' },
      { icon: IconCaretLeft, name: 'IconCaretLeft' },
      { icon: IconCaretRight, name: 'IconCaretRight' },
      { icon: IconCaretUp, name: 'IconCaretUp' },
      { icon: IconCaretDoubleLeft, name: 'IconCaretDoubleLeft' },
      { icon: IconCaretDoubleRight, name: 'IconCaretDoubleRight' },
      { icon: IconArrowRight, name: 'IconArrowRight' },
      { icon: IconArrowLeft, name: 'IconArrowLeft' },
      { icon: IconArrowDown, name: 'IconArrowDown' },
      { icon: IconArrowUp, name: 'IconArrowUp' },
      { icon: IconArrowUpRight, name: 'IconArrowUpRight' },
      { icon: IconArrowDownLeft, name: 'IconArrowDownLeft' },
      { icon: IconRefresh, name: 'IconRefresh' },
      { icon: IconUndo, name: 'IconUndo' },
      { icon: IconExternalLink, name: 'IconExternalLink' },
    ],
  },
  {
    name: 'Actions',
    description: 'Interactive action icons for user operations',
    icons: [
      { icon: IconX, name: 'IconX' },
      { icon: IconCheck, name: 'IconCheck' },
      { icon: IconPlus, name: 'IconPlus' },
      { icon: IconMinus, name: 'IconMinus' },
      { icon: IconSearch, name: 'IconSearch' },
      { icon: IconTrash, name: 'IconTrash' },
      { icon: IconEdit, name: 'IconEdit' },
      { icon: IconCopy, name: 'IconCopy' },
      { icon: IconEraser, name: 'IconEraser' },
      { icon: IconDownload, name: 'IconDownload' },
      { icon: IconUpload, name: 'IconUpload' },
      { icon: IconSave, name: 'IconSave' },
      { icon: IconSend, name: 'IconSend' },
      { icon: IconMoreHorizontal, name: 'IconMoreHorizontal' },
      { icon: IconMoreVertical, name: 'IconMoreVertical' },
      { icon: IconLink, name: 'IconLink' },
      { icon: IconUnlink, name: 'IconUnlink' },
      { icon: IconSelectAll, name: 'IconSelectAll' },
      { icon: IconCommand, name: 'IconCommand' },
    ],
  },
  {
    name: 'Status',
    description: 'State and feedback icons for system communication',
    icons: [
      { icon: IconCheckCircle, name: 'IconCheckCircle' },
      { icon: IconXCircle, name: 'IconXCircle' },
      { icon: IconWarningCircle, name: 'IconWarningCircle' },
      { icon: IconInfo, name: 'IconInfo' },
      { icon: IconQuestion, name: 'IconQuestion' },
      { icon: IconWarning, name: 'IconWarning' },
      { icon: IconProhibit, name: 'IconProhibit' },
      { icon: IconShieldCheck, name: 'IconShieldCheck' },
      { icon: IconShieldWarning, name: 'IconShieldWarning' },
      { icon: IconClock, name: 'IconClock' },
      { icon: IconHourglass, name: 'IconHourglass' },
      { icon: IconCheckSquare, name: 'IconCheckSquare' },
      { icon: IconSquare, name: 'IconSquare' },
      { icon: IconCircle, name: 'IconCircle' },
      { icon: IconBug, name: 'IconBug' },
      { icon: IconTrendUp, name: 'IconTrendUp' },
      { icon: IconFlag, name: 'IconFlag' },
    ],
  },
  {
    name: 'Domain',
    description: 'Business and application-specific icons',
    icons: [
      { icon: IconFileText, name: 'IconFileText' },
      { icon: IconFile, name: 'IconFile' },
      { icon: IconFileCsv, name: 'IconFileCsv' },
      { icon: IconFileXls, name: 'IconFileXls' },
      { icon: IconFilePdf, name: 'IconFilePdf' },
      { icon: IconFolder, name: 'IconFolder' },
      { icon: IconFolderOpen, name: 'IconFolderOpen' },
      { icon: IconBuildings, name: 'IconBuildings' },
      { icon: IconBuilding, name: 'IconBuilding' },
      { icon: IconHouse, name: 'IconHouse' },
      { icon: IconTable, name: 'IconTable' },
      { icon: IconDatabase, name: 'IconDatabase' },
      { icon: IconHardDrive, name: 'IconHardDrive' },
      { icon: IconDollarSign, name: 'IconDollarSign' },
      { icon: IconMoney, name: 'IconMoney' },
      { icon: IconReceipt, name: 'IconReceipt' },
      { icon: IconInvoice, name: 'IconInvoice' },
      { icon: IconBank, name: 'IconBank' },
      { icon: IconCreditCard, name: 'IconCreditCard' },
      { icon: IconWallet, name: 'IconWallet' },
      { icon: IconCalculator, name: 'IconCalculator' },
      { icon: IconChartLine, name: 'IconChartLine' },
      { icon: IconChartBar, name: 'IconChartBar' },
      { icon: IconChartPie, name: 'IconChartPie' },
      { icon: IconCalendar, name: 'IconCalendar' },
      { icon: IconCalendarBlank, name: 'IconCalendarBlank' },
      { icon: IconTag, name: 'IconTag' },
      { icon: IconHash, name: 'IconHash' },
      { icon: IconUser, name: 'IconUser' },
      { icon: IconUsers, name: 'IconUsers' },
      { icon: IconUserCircle, name: 'IconUserCircle' },
      { icon: IconBriefcase, name: 'IconBriefcase' },
      { icon: IconGear, name: 'IconGear' },
      { icon: IconSliders, name: 'IconSliders' },
      { icon: IconBell, name: 'IconBell' },
      { icon: IconBellRinging, name: 'IconBellRinging' },
      { icon: IconEnvelope, name: 'IconEnvelope' },
      { icon: IconEnvelopeOpen, name: 'IconEnvelopeOpen' },
      { icon: IconChat, name: 'IconChat' },
      { icon: IconChatDots, name: 'IconChatDots' },
      { icon: IconImage, name: 'IconImage' },
      { icon: IconCamera, name: 'IconCamera' },
      { icon: IconPaperclip, name: 'IconPaperclip' },
      { icon: IconCloud, name: 'IconCloud' },
      { icon: IconCloudUpload, name: 'IconCloudUpload' },
      { icon: IconCloudDownload, name: 'IconCloudDownload' },
      { icon: IconLock, name: 'IconLock' },
      { icon: IconUnlock, name: 'IconUnlock' },
      { icon: IconKey, name: 'IconKey' },
      { icon: IconSignIn, name: 'IconSignIn' },
      { icon: IconSignOut, name: 'IconSignOut' },
      { icon: IconGlobe, name: 'IconGlobe' },
      { icon: IconMapPin, name: 'IconMapPin' },
      { icon: IconCode, name: 'IconCode' },
      { icon: IconFileCode, name: 'IconFileCode' },
      { icon: IconFilmStrip, name: 'IconFilmStrip' },
      { icon: IconSquaresFour, name: 'IconSquaresFour' },
      { icon: IconGitDiff, name: 'IconGitDiff' },
    ],
  },
  {
    name: 'UI',
    description: 'Interface control and display icons',
    icons: [
      { icon: IconLoader, name: 'IconLoader' },
      { icon: IconLoaderStatic, name: 'IconLoaderStatic' },
      { icon: IconSpinner, name: 'IconSpinner' },
      { icon: IconEye, name: 'IconEye' },
      { icon: IconEyeOff, name: 'IconEyeOff' },
      { icon: IconFilter, name: 'IconFilter' },
      { icon: IconSortAsc, name: 'IconSortAsc' },
      { icon: IconSortDesc, name: 'IconSortDesc' },
      { icon: IconList, name: 'IconList' },
      { icon: IconListBullets, name: 'IconListBullets' },
      { icon: IconGrid, name: 'IconGrid' },
      { icon: IconRows, name: 'IconRows' },
      { icon: IconColumns, name: 'IconColumns' },
      { icon: IconSidebar, name: 'IconSidebar' },
      { icon: IconLayout, name: 'IconLayout' },
      { icon: IconSun, name: 'IconSun' },
      { icon: IconMoon, name: 'IconMoon' },
      { icon: IconDesktop, name: 'IconDesktop' },
      { icon: IconLaptop, name: 'IconLaptop' },
      { icon: IconMobile, name: 'IconMobile' },
      { icon: IconMaximize, name: 'IconMaximize' },
      { icon: IconMinimize, name: 'IconMinimize' },
      { icon: IconExpand, name: 'IconExpand' },
      { icon: IconCollapse, name: 'IconCollapse' },
      { icon: IconAlignLeft, name: 'IconAlignLeft' },
      { icon: IconAlignCenter, name: 'IconAlignCenter' },
      { icon: IconAlignRight, name: 'IconAlignRight' },
      { icon: IconText, name: 'IconText' },
      { icon: IconTextAa, name: 'IconTextAa' },
      { icon: IconZoomIn, name: 'IconZoomIn' },
      { icon: IconZoomOut, name: 'IconZoomOut' },
      { icon: IconDropdown, name: 'IconDropdown' },
      { icon: IconPlay, name: 'IconPlay' },
      { icon: IconPause, name: 'IconPause' },
      { icon: IconStop, name: 'IconStop' },
      { icon: IconSkipForward, name: 'IconSkipForward' },
      { icon: IconSkipBack, name: 'IconSkipBack' },
      { icon: IconVolumeOn, name: 'IconVolumeOn' },
      { icon: IconVolumeOff, name: 'IconVolumeOff' },
      { icon: IconPower, name: 'IconPower' },
      { icon: IconLightning, name: 'IconLightning' },
      { icon: IconZap, name: 'IconZap' },
    ],
  },
  {
    name: 'AI',
    description: 'Artificial intelligence and automation icons',
    icons: [
      { icon: IconSparkle, name: 'IconSparkle' },
      { icon: IconSparkles, name: 'IconSparkles' },
      { icon: IconWand, name: 'IconWand' },
      { icon: IconRobot, name: 'IconRobot' },
      { icon: IconBrain, name: 'IconBrain' },
      { icon: IconLightbulb, name: 'IconLightbulb' },
      { icon: IconAtom, name: 'IconAtom' },
      { icon: IconCpu, name: 'IconCpu' },
      { icon: IconCircuitry, name: 'IconCircuitry' },
      { icon: IconTarget, name: 'IconTarget' },
      { icon: IconCrosshair, name: 'IconCrosshair' },
      { icon: IconGitBranch, name: 'IconGitBranch' },
      { icon: IconGitMerge, name: 'IconGitMerge' },
      { icon: IconPulse, name: 'IconPulse' },
      { icon: IconActivity, name: 'IconActivity' },
      { icon: IconTree, name: 'IconTree' },
      { icon: IconFlow, name: 'IconFlow' },
      { icon: IconShuffle, name: 'IconShuffle' },
      { icon: IconSwap, name: 'IconSwap' },
      { icon: IconStack, name: 'IconStack' },
      { icon: IconLayers, name: 'IconLayers' },
    ],
  },
  {
    name: 'Application',
    description: 'Reconciled-specific icons for navigation and features',
    icons: [
      { icon: IconDashboard, name: 'IconDashboard' },
      { icon: IconReconcile, name: 'IconReconcile' },
      { icon: IconReports, name: 'IconReports' },
      { icon: IconPanelCollapse, name: 'IconPanelCollapse' },
      { icon: IconPanelExpand, name: 'IconPanelExpand' },
      { icon: IconDemo, name: 'IconDemo' },
      { icon: IconReal, name: 'IconReal' },
      { icon: IconSwitch, name: 'IconSwitch' },
    ],
  },
]

const sizes = [12, 14, 16, 20, 24, 32] as const

const usageCode = `// Import icons from the brand package
import { IconCheck, IconX, IconSparkle } from '@/components/brand/icons'

// Use with default size (16px)
<IconCheck />

// Specify size
<IconSparkle size={24} />

// With className for colors
<IconX className="text-destructive" />

// All pixel icons support these props:
// - size: number (default: 16)
// - className: string
// - spin: boolean (for loaders)`

export function IconsSection() {
  const totalIcons = iconCategories.reduce((acc, cat) => acc + cat.icons.length, 0)

  return (
    <section id="icons" className="space-y-12">
      <div>
        <h2 className="text-xl font-medium">Icons</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {totalIcons} pixel-art icons built entirely from rectangles for a sharp, geometric brand aesthetic.
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <IconInfo size={14} />
          Click any icon to copy its import statement
        </div>
      </div>

      {/* Size Demo */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Size Scale
        </h3>
        <div className="border border-border p-6">
          <div className="flex items-end gap-8">
            {sizes.map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <IconSparkle size={size} />
                <span className="text-xs text-muted-foreground font-mono">{size}px</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Icon Categories */}
      <div className="space-y-12">
        {iconCategories.map((category) => (
          <div key={category.name} className="space-y-4">
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {category.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
              <span className="text-xs text-muted-foreground/60">{category.icons.length} icons</span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {category.icons.map(({ icon, name }) => (
                <IconGridItem key={name} icon={icon} name={name} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Usage Code */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Usage
        </h3>
        <CodeBlock code={usageCode} language="tsx" />
      </div>

      {/* Design Notes */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Design Notes
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-border p-4">
            <div className="text-sm font-medium mb-2">Rectangle-Only Construction</div>
            <p className="text-xs text-muted-foreground">
              All icons are built exclusively from <code className="bg-secondary px-1 py-0.5">&lt;rect&gt;</code> elements
              for a true pixel-art aesthetic. No curves, circles, or paths.
            </p>
          </div>
          <div className="border border-border p-4">
            <div className="text-sm font-medium mb-2">16x16 ViewBox</div>
            <p className="text-xs text-muted-foreground">
              Every icon uses a standard 16x16 grid with 2px minimum stroke width,
              ensuring crisp rendering at all sizes while maintaining the geometric brand aesthetic.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
