import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import StarRating from './StarRating'

describe('StarRating', () => {
  it('renders 5 star buttons', () => {
    render(<StarRating value={null} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('displays numeric value when rating is set', () => {
    render(<StarRating value={3.5} />)
    expect(screen.getByText('3.5')).toBeInTheDocument()
  })

  it('does not display numeric value when null', () => {
    render(<StarRating value={null} />)
    expect(screen.queryByText(/\d\.\d/)).not.toBeInTheDocument()
  })

  it('disables buttons in readonly mode', () => {
    render(<StarRating value={4} readonly />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })

  it('enables buttons when not readonly', () => {
    render(<StarRating value={4} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).not.toBeDisabled()
    })
  })
})
