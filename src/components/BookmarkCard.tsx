'use client'

import { useState } from 'react'
import type { Bookmark } from '@/lib/types'
import ConfirmDialog from '@/components/ConfirmDialog'

interface BookmarkCardProps {
  bookmark: Bookmark
  onDelete: (id: string) => Promise<void>
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function getFaviconUrl(url: string): string | null {
  try {
    const { origin } = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`
  } catch {
    return null
  }
}

export default function BookmarkCard({ bookmark, onDelete }: BookmarkCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [faviconError, setFaviconError] = useState(false)
  const faviconUrl = getFaviconUrl(bookmark.url)

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    await onDelete(bookmark.id)
    setIsDeleting(false)
    setShowConfirm(false)
  }

  return (
    <>
      <div className="group bg-white rounded-xl border border-gray-100 px-4 py-3.5 hover:border-gray-200 hover:shadow-sm transition-all duration-200 flex items-center gap-4">
        {/* Favicon */}
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {faviconUrl && !faviconError ? (
            <img
              src={faviconUrl}
              alt=""
              width={16}
              height={16}
              onError={() => setFaviconError(true)}
            />
          ) : (
            <svg
              className="w-4 h-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          )}
        </div>

        {/* Title + domain */}
        <div className="flex-1 min-w-0">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm block truncate"
          >
            {bookmark.title}
          </a>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {getDomain(bookmark.url)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 hidden group-hover:block whitespace-nowrap">
            {new Date(bookmark.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isDeleting}
            aria-label={`Delete ${bookmark.title}`}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
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
            ) : (
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation modal — rendered outside the card to avoid z-index issues */}
      {showConfirm && (
        <ConfirmDialog
          title="Delete bookmark?"
          description={`"${bookmark.title}" will be permanently removed.`}
          confirmLabel="Delete"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
