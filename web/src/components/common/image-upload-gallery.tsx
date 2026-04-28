'use client'

import { Button } from '@/components/ui/button'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Lens } from '@/components/ui/lens'
import { saveAs } from 'file-saver'
import {
  Download,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  ZoomIn,
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

export interface UploadedImage {
  /** 图片唯一标识 */
  id: string
  /** 图片 URL 地址 */
  url: string
  /** 图片名称 */
  name: string
}

interface ImageUploadGalleryProps {
  /** 已上传的图片列表 */
  images: UploadedImage[]
  /** 图片上传回调，接收选中的文件列表 */
  onUpload?: (files: File[]) => Promise<void>
  /** 图片删除回调，接收要删除的图片对象 */
  onDelete?: (image: UploadedImage) => Promise<void>
  /** 是否只读模式，禁用上传和删除功能 */
  readOnly?: boolean
  /** 最大上传图片数量, 0 或负数表示不限制 */
  maxFiles?: number
  /** 是否正在上传中 */
  isUploading?: boolean
  /** 上传按钮文本 */
  textUpload?: string
  /** 空状态文本 */
  textEmpty?: string
}

export function ImageUploadGallery({
  images = [],
  onUpload,
  onDelete,
  readOnly = false,
  maxFiles = 0,
  isUploading = false,
  textUpload = 'upload',
  textEmpty = 'empty',
}: ImageUploadGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 记录当前点击的图片索引
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  // Carousel API 状态
  const [api, setApi] = useState<CarouselApi>()
  const [currentSlide, setCurrentSlide] = useState(0)
  // 监听 Carousel 的滑动事件更新当前页码
  useEffect(() => {
    if (!api) return
    // 初始化当前页码
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentSlide(api.selectedScrollSnap() + 1)
    // 监听滑动事件
    api.on('select', () => {
      setCurrentSlide(api.selectedScrollSnap() + 1)
    })
  }, [api])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (onUpload) {
      await onUpload(files)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownload = async (image: UploadedImage) => {
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      saveAs(blob, image.name)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="space-y-4">
      {/* 头部：上传按钮及数量 */}
      <div className="flex items-center justify-between">
        {maxFiles > 0 && (
          <div className="text-muted-foreground text-sm">
            {images.length}/{maxFiles}
          </div>
        )}

        {!readOnly && (images.length < maxFiles || maxFiles <= 0) && (
          <div>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {textUpload}
            </Button>
          </div>
        )}
      </div>

      {/* 图片网格 */}
      {images.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <ImageIcon className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">{textEmpty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="bg-muted group relative aspect-square overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setPreviewIndex(index)} // 记录点击的索引
                  title="preview"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleDownload(img)}
                  title="download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {!readOnly && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => onDelete(img)}
                    title="delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 图片预览与轮播 Modal */}
      <Dialog
        open={previewIndex !== null}
        onOpenChange={(open) => !open && setPreviewIndex(null)}
      >
        <DialogContent className="flex max-w-4xl flex-col items-center justify-center border-none bg-transparent p-0 shadow-none [&>button]:hidden">
          <DialogTitle className="sr-only">Preview</DialogTitle>

          {previewIndex !== null && (
            <div className="relative w-full">
              <Carousel
                setApi={setApi}
                // 指定初始打开的是哪一张图片
                opts={{ startIndex: previewIndex }}
                className="w-full"
              >
                <CarouselContent>
                  {images.map((img) => (
                    <CarouselItem
                      key={img.id}
                      className="flex items-center justify-center"
                    >
                      <Lens
                        zoomFactor={2}
                        lensSize={200}
                        isStatic={false}
                        ariaLabel="Zoom Area"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.name}
                          className="max-h-[85vh] w-auto rounded-md object-contain"
                        />
                      </Lens>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {/* 左右箭头 */}
                {images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2 xl:-left-12" />
                    <CarouselNext className="right-2 xl:-right-12" />
                  </>
                )}
              </Carousel>

              {/* 数量指示器 */}
              {images.length > 1 && (
                <div className="mt-4 text-center text-sm">
                  {currentSlide} / {images.length}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
