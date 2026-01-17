import { toast } from '@/hooks/use-toast'

// Toast helper functions for consistent notifications across the app

export const showToast = {
  success: (message: string, description?: string) => {
    toast({
      title: message,
      description,
      className: 'border-green-500/50 bg-green-500/10',
    })
  },

  error: (message: string, description?: string) => {
    toast({
      title: message,
      description,
      variant: 'destructive',
    })
  },

  warning: (message: string, description?: string) => {
    toast({
      title: message,
      description,
      className: 'border-yellow-500/50 bg-yellow-500/10',
    })
  },

  info: (message: string, description?: string) => {
    toast({
      title: message,
      description,
      className: 'border-blue-500/50 bg-blue-500/10',
    })
  },

  loading: (message: string) => {
    return toast({
      title: message,
      description: 'Please wait...',
      className: 'border-zinc-500/50 bg-zinc-800/50',
    })
  },

  // Promise wrapper for async operations
  promise: async <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: unknown) => string)
    }
  ): Promise<T> => {
    const loadingToast = toast({
      title: messages.loading,
      description: 'Please wait...',
      className: 'border-zinc-500/50 bg-zinc-800/50',
    })

    try {
      const result = await promise
      loadingToast.dismiss()
      toast({
        title: typeof messages.success === 'function'
          ? messages.success(result)
          : messages.success,
        className: 'border-green-500/50 bg-green-500/10',
      })
      return result
    } catch (error) {
      loadingToast.dismiss()
      toast({
        title: typeof messages.error === 'function'
          ? messages.error(error)
          : messages.error,
        variant: 'destructive',
      })
      throw error
    }
  },

  // Mutation helper for React Query
  mutation: {
    onMutate: (message: string) => {
      return toast({
        title: message,
        description: 'Please wait...',
        className: 'border-zinc-500/50 bg-zinc-800/50',
      })
    },

    onSuccess: (toastId: { dismiss: () => void }, message: string) => {
      toastId.dismiss()
      toast({
        title: message,
        className: 'border-green-500/50 bg-green-500/10',
      })
    },

    onError: (toastId: { dismiss: () => void }, message: string) => {
      toastId.dismiss()
      toast({
        title: message,
        variant: 'destructive',
      })
    },
  },
}

// Specific toast messages for common actions
export const toastMessages = {
  // Campaigns
  campaign: {
    created: 'Campaign created successfully',
    updated: 'Campaign updated successfully',
    deleted: 'Campaign deleted successfully',
    createError: 'Failed to create campaign',
    updateError: 'Failed to update campaign',
    deleteError: 'Failed to delete campaign',
  },

  // Influencers
  influencer: {
    added: 'Influencer added to pipeline',
    removed: 'Influencer removed from pipeline',
    moved: 'Influencer moved to new stage',
    addError: 'Failed to add influencer',
    removeError: 'Failed to remove influencer',
    moveError: 'Failed to move influencer',
  },

  // Outreach
  outreach: {
    sent: 'Outreach email sent successfully',
    scheduled: 'Outreach scheduled successfully',
    sendError: 'Failed to send outreach',
    scheduleError: 'Failed to schedule outreach',
  },

  // Discovery
  discovery: {
    started: 'Discovery search started',
    completed: 'Discovery complete',
    error: 'Discovery search failed',
  },

  // Content
  content: {
    tracked: 'Content added to tracking',
    removed: 'Content removed from tracking',
    trackError: 'Failed to track content',
    removeError: 'Failed to remove content',
  },

  // General
  general: {
    saved: 'Changes saved successfully',
    copied: 'Copied to clipboard',
    saveError: 'Failed to save changes',
    loadError: 'Failed to load data',
    networkError: 'Network error. Please check your connection.',
    unauthorized: 'Please sign in to continue',
  },
}
