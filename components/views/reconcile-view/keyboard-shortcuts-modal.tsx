'use client'

import { Keyboard, X } from 'lucide-react'
import { Modal } from '@/components/ui'

const keyboardShortcuts = [
  { key: 'A', description: 'Approve current match', category: 'Actions' },
  { key: 'R', description: 'Reject current match', category: 'Actions' },
  { key: '↓ / S / J', description: 'Skip to next match', category: 'Navigation' },
  { key: '↑ / K', description: 'Go to previous match', category: 'Navigation' },
  { key: '/', description: 'Focus search bar', category: 'Navigation' },
  { key: '?', description: 'Show this help', category: 'Help' },
  { key: 'Ctrl+Z', description: 'Undo last action', category: 'Actions' },
  { key: 'Esc', description: 'Close modals', category: 'Help' },
]

const categories = ['Actions', 'Navigation', 'Help']

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal displaying keyboard shortcuts for power users.
 */
export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
      footer={
        <p className="text-xs text-muted-foreground text-center">
          Press <kbd className="px-1 py-0.5 text-[10px] bg-background border border-border font-mono">Esc</kbd> or click outside to close
        </p>
      }
    >
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category}>
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">{category}</h3>
            <div className="space-y-2">
              {keyboardShortcuts
                .filter((s) => s.category === category)
                .map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs bg-secondary border border-border font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
