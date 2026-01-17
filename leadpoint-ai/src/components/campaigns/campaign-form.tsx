'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateCampaign, useUpdateCampaign } from '@/hooks/use-campaigns'
import { toast } from '@/hooks/use-toast'
import type { Campaign } from '@/types/database'

// Form validation schema
const campaignFormSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  target_niche: z.string().min(1, 'Target niche is required'),
  hashtags: z.array(z.string()).min(1, 'At least one hashtag is required'),
  budget: z.number().min(0).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

type CampaignFormValues = z.infer<typeof campaignFormSchema>

interface CampaignFormProps {
  campaign?: Campaign
  mode?: 'create' | 'edit'
  onSuccess?: (campaign: Campaign) => void
  onCancel?: () => void
}

const niches = [
  'Fashion & Beauty',
  'Fitness & Health',
  'Technology',
  'Food & Cooking',
  'Travel & Adventure',
  'Gaming',
  'Lifestyle',
  'Business & Finance',
  'Entertainment',
  'Education',
  'Parenting & Family',
  'Home & Garden',
  'Sports',
  'Music',
  'Art & Design',
  'Other',
]

export function CampaignForm({
  campaign,
  mode = 'create',
  onSuccess,
  onCancel,
}: CampaignFormProps) {
  const router = useRouter()
  const [hashtagInput, setHashtagInput] = useState('')

  const createCampaign = useCreateCampaign()
  const updateCampaign = useUpdateCampaign()

  const isLoading = createCampaign.isPending || updateCampaign.isPending

  // Extract initial values from campaign if editing
  const getInitialValues = (): Partial<CampaignFormValues> => {
    if (!campaign) {
      return {
        name: '',
        description: '',
        target_niche: '',
        hashtags: [],
        budget: undefined,
        start_date: '',
        end_date: '',
      }
    }

    const interests =
      (campaign.target_audience as { interests?: string[] })?.interests || []
    const targetNiche = interests[0] || ''
    const hashtags = interests.slice(1)
    const budget = (campaign.budget_range as { max?: number })?.max

    return {
      name: campaign.name,
      description: campaign.description || '',
      target_niche: targetNiche,
      hashtags,
      budget,
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
    }
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: getInitialValues(),
  })

  const rawHashtags = watch('hashtags')
  const watchedHashtags = useMemo(() => rawHashtags || [], [rawHashtags])

  const addHashtag = useCallback(() => {
    const tag = hashtagInput.trim().replace(/^#/, '')
    if (tag && !watchedHashtags.includes(tag)) {
      setValue('hashtags', [...watchedHashtags, tag])
      setHashtagInput('')
    }
  }, [hashtagInput, watchedHashtags, setValue])

  const removeHashtag = useCallback(
    (tagToRemove: string) => {
      setValue(
        'hashtags',
        watchedHashtags.filter((tag: string) => tag !== tagToRemove)
      )
    },
    [watchedHashtags, setValue]
  )

  const handleHashtagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addHashtag()
    }
  }

  const onSubmit = async (data: CampaignFormValues) => {
    try {
      if (mode === 'create') {
        const result = await createCampaign.mutateAsync(data)
        if (result.data) {
          toast({
            title: 'Campaign created',
            description: `"${data.name}" has been created successfully.`,
          })
          onSuccess?.(result.data)
          router.push(`/campaigns/${result.data.id}`)
        }
      } else if (campaign) {
        const result = await updateCampaign.mutateAsync({
          id: campaign.id,
          data,
        })
        if (result.data) {
          toast({
            title: 'Campaign updated',
            description: `"${data.name}" has been updated successfully.`,
          })
          onSuccess?.(result.data)
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-zinc-300">
          Campaign Name <span className="text-red-400">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Summer Product Launch"
          className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:ring-violet-500/20"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-zinc-300">
          Description
        </Label>
        <textarea
          id="description"
          placeholder="Describe your campaign goals and objectives..."
          rows={3}
          className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none resize-none"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-400">{errors.description.message}</p>
        )}
      </div>

      {/* Target Niche */}
      <div className="space-y-2">
        <Label htmlFor="target_niche" className="text-zinc-300">
          Target Niche <span className="text-red-400">*</span>
        </Label>
        <Select
          value={watch('target_niche')}
          onValueChange={(value) => setValue('target_niche', value)}
        >
          <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white focus:ring-violet-500/20">
            <SelectValue placeholder="Select a niche" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {niches.map((niche) => (
              <SelectItem
                key={niche}
                value={niche}
                className="text-zinc-300 focus:bg-zinc-800 focus:text-white"
              >
                {niche}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.target_niche && (
          <p className="text-sm text-red-400">{errors.target_niche.message}</p>
        )}
      </div>

      {/* Hashtags */}
      <div className="space-y-2">
        <Label className="text-zinc-300">
          Hashtags <span className="text-red-400">*</span>
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              #
            </span>
            <Input
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={handleHashtagKeyDown}
              placeholder="Add a hashtag"
              className="pl-7 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:ring-violet-500/20"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addHashtag}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Hashtag Tags */}
        {watchedHashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {watchedHashtags.map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-sm"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeHashtag(tag)}
                  className="hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.hashtags && (
          <p className="text-sm text-red-400">{errors.hashtags.message}</p>
        )}
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <Label htmlFor="budget" className="text-zinc-300">
          Budget (USD)
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            $
          </span>
          <Input
            id="budget"
            type="number"
            min={0}
            step={100}
            placeholder="10000"
            className="pl-7 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:ring-violet-500/20"
            {...register('budget', { valueAsNumber: true })}
          />
        </div>
        {errors.budget && (
          <p className="text-sm text-red-400">{errors.budget.message}</p>
        )}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date" className="text-zinc-300">
            Start Date
          </Label>
          <div className="relative">
            <Input
              id="start_date"
              type="date"
              className="bg-zinc-800/50 border-zinc-700 text-white focus:border-violet-500 focus:ring-violet-500/20"
              {...register('start_date')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date" className="text-zinc-300">
            End Date
          </Label>
          <div className="relative">
            <Input
              id="end_date"
              type="date"
              className="bg-zinc-800/50 border-zinc-700 text-white focus:border-violet-500 focus:ring-violet-500/20"
              {...register('end_date')}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === 'create' ? 'Creating...' : 'Saving...'}
            </>
          ) : mode === 'create' ? (
            'Create Campaign'
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  )
}
