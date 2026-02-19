'use client'

import { useState } from 'react'
import type { Bookmark } from '@/lib/types'
import { getDomain } from 'tldts'

interface AddBookmarkFormProps {
  onAdd: (title: string, url: string) => Promise<void>
  isLoading: boolean
  existingBookmarks: Bookmark[]
}

export default function AddBookmarkForm({ onAdd, isLoading, existingBookmarks }: AddBookmarkFormProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({})

  // Prepend https:// if the user typed a bare domain like "example.com"
  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim()
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  // Collapse internal whitespace: "hello   world" → "hello world"
  const normalizeTitle = (raw: string): string => raw.trim().replace(/\s+/g, ' ')

  const isValidHostname = (hostname: string): boolean => {
    // Allow plain IP addresses and localhost for dev convenience
    if (hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true
    // Must be "label.label" pattern where TLD is 2+ letters only (no numbers)
    const parts = hostname.split('.')
    if (parts.length < 2) return false
    const tld = parts[parts.length - 1]
    if (!/^[a-zA-Z]{2,}$/.test(tld)) return false
    // Each label: alphanumeric + hyphens, not starting/ending with hyphen
    return parts.every((p) => p.length > 0 && /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(p))
  }

  const validate = (): { title?: string; url?: string } => {
    const newErrors: { title?: string; url?: string } = {}

    const cleanTitle = normalizeTitle(title)

    // 🔹 TITLE VALIDATION
    if (!cleanTitle) {
      newErrors.title = 'Title is required'
    } else if (cleanTitle.length < 2) {
      newErrors.title = 'Title is too short'
    } else if (cleanTitle.length > 200) {
      newErrors.title = 'Title must be 200 characters or less'
    } else if (/[\x00-\x1F\x7F]/.test(cleanTitle)) {
      newErrors.title = 'Title contains invalid characters'
    }

    // 🔹 URL VALIDATION
    const trimmedUrl = url.trim()

    if (!trimmedUrl) {
      newErrors.url = 'URL is required'
    } else {
      try {
        const normalized = normalizeUrl(trimmedUrl) // should auto-add https if missing
        const parsed = new URL(normalized)

        if (!['http:', 'https:'].includes(parsed.protocol)) {
          newErrors.url = 'Only http and https URLs are allowed'
          return newErrors
        }

        if (normalized.length > 2048) {
          newErrors.url = 'URL is too long'
          return newErrors
        }

        const domain = getDomain(normalized)

        const isLocalhost =
          parsed.hostname === 'localhost' ||
          parsed.hostname.startsWith('127.') ||
          parsed.hostname.endsWith('.local')

        const ALLOW_LOCALHOST = false // 🔧 change to true if you want dev URLs

        if (!domain && !(ALLOW_LOCALHOST && isLocalhost)) {
          newErrors.url = 'Enter a valid public domain'
          return newErrors
        }

        // 4️⃣ normalize for duplicate comparison
        const normalizedForCompare = normalized
          .toLowerCase()
          .replace(/\/$/, '') // remove trailing slash

        const isDuplicate = existingBookmarks.some((b) => {
          const existingNormalized = b.url
            .toLowerCase()
            .replace(/\/$/, '')
          return existingNormalized === normalizedForCompare
        })

        if (isDuplicate) {
          newErrors.url = 'This URL is already in your bookmarks'
        }
      } catch {
        newErrors.url = 'Enter a valid URL (e.g., https://example.com)'
      }
    }

    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    await onAdd(normalizeTitle(title), normalizeUrl(url.trim()))
    setTitle('')
    setUrl('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-strong rounded-2xl p-5 shadow-lg"
    >
      <h2 className="text-sm font-semibold text-white mb-4">Add New Bookmark</h2>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* Title input */}
        <div>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }))
            }}
            disabled={isLoading}
            className={`w-full px-3 py-2.5 rounded-lg text-sm dark-input ${errors.title ? 'error' : ''
              }`}
          />
          {errors.title && (
            <p className="text-xs text-red-400 mt-1">{errors.title}</p>
          )}
        </div>

        {/* URL input */}
        <div>
          <input
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              if (errors.url) setErrors((prev) => ({ ...prev, url: undefined }))
            }}
            disabled={isLoading}
            className={`w-full px-3 py-2.5 rounded-lg text-sm dark-input ${errors.url ? 'error' : ''
              }`}
          />
          {errors.url && (
            <p className="text-xs text-red-400 mt-1">{errors.url}</p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 text-white text-sm font-medium rounded-lg gradient-btn flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Bookmark
            </>
          )}
        </button>
      </div>
    </form>
  )
}
