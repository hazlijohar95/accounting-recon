import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImageZoom } from '@/components/image-zoom'

vi.mock('react-medium-image-zoom', () => ({
  default: ({ zoomImg, children }: { zoomImg: { src: string }; children: React.ReactNode }) => (
    <div data-zoom-src={zoomImg.src}>{children}</div>
  ),
}))

vi.mock('fumadocs-core/framework', () => ({
  Image: (props: { src: string; alt?: string }) => <img alt={props.alt ?? ''} src={props.src} />,
}))

describe('ImageZoom', () => {
  it('uses string src for zoom image', () => {
    render(<ImageZoom src="/image.png" alt="Image" />)

    expect(screen.getByRole('img')).toHaveAttribute('src', '/image.png')
    expect(screen.getByRole('img').parentElement).toHaveAttribute('data-zoom-src', '/image.png')
  })

  it('supports object src values', () => {
    render(
      <ImageZoom
        src={{
          src: '/image-2.png',
          height: 10,
          width: 10,
          blurDataURL: '',
        }}
        alt="Image"
      />
    )

    expect(screen.getByRole('img').parentElement).toHaveAttribute('data-zoom-src', '/image-2.png')
  })

  it('supports default export src values', () => {
    render(
      <ImageZoom
        src={{
          default: {
            src: '/image-3.png',
            height: 1,
            width: 1,
          },
        } as any}
        alt="Image"
      />
    )

    expect(screen.getByRole('img').parentElement).toHaveAttribute('data-zoom-src', '/image-3.png')
  })
})
