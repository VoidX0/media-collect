import { Button } from '@/components/ui/button'
import { Maximize, Minimize } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ToggleFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFullscreen(!!document.fullscreenElement)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      document.documentElement.requestFullscreen?.({
        navigationUI: 'hide',
      })
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle}>
      {isFullscreen ? (
        <Minimize className="h-5 w-5" />
      ) : (
        <Maximize className="h-5 w-5" />
      )}
    </Button>
  )
}
