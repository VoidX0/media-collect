'use client'

import { Button } from '@/components/ui/button'
import { openapi } from '@/lib/http'
import { CheckLine, Loader, Trash } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function Page() {
  const t = useTranslations('CleanupPage')
  const [seriesTrash, setSeriesTrash] = useState<string[] | undefined>(
    undefined,
  )
  useEffect(() => {
    const fetch = async () => {
      const { data } = await openapi.GET('/Cleanup/SeriesTrash')
      setSeriesTrash(data)
    }
    fetch().then()
  }, [])

  const handleDeleteSeriesTrash = async () => {
    const { error } = await openapi.DELETE('/Cleanup/DeleteSeriesTrash')
    if (!error) {
      toast.success(t('deleteSeriesTrashSuccess'))
      setSeriesTrash([])
    }
  }

  if (!seriesTrash) {
    return (
      <div className="max-w-8xl mx-auto w-full space-y-8 p-8">
        <div className="bg-muted flex animate-pulse flex-col items-center justify-center space-y-2 rounded-md border p-8">
          <Loader className="text-muted-foreground h-8 w-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-8xl mx-auto w-full space-y-8 p-8">
      <Button
        variant="outline"
        disabled={seriesTrash.length === 0}
        onClick={handleDeleteSeriesTrash}
      >
        <Trash />
        {seriesTrash.length} items
      </Button>
      {seriesTrash.length === 0 ? (
        <div className="bg-muted flex flex-col items-center justify-center space-y-2 rounded-md border p-8">
          <CheckLine className="text-muted-foreground h-8 w-8" />
        </div>
      ) : (
        <div className="space-y-4">
          {seriesTrash.map((series) => (
            <div key={series} className="bg-muted rounded-md border p-4">
              <p className="text-sm">{series}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
