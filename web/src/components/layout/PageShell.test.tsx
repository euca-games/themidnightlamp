import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'
import PageShell from './PageShell'

describe('PageShell', () => {
  it('renders children', () => {
    renderWithProviders(<PageShell><p>test content</p></PageShell>)
    expect(screen.getByText('test content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    renderWithProviders(<PageShell title="My Title"><p>content</p></PageShell>)
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })

  it('does not render title heading when not provided', () => {
    renderWithProviders(<PageShell><p>content</p></PageShell>)
    // Only the navbar brand should be there, no h1 for the page title
    const headings = screen.queryAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(0)
  })

  it('renders navbar', () => {
    renderWithProviders(<PageShell><p>content</p></PageShell>)
    expect(screen.getByText('the midnight lamp')).toBeInTheDocument()
  })
})
