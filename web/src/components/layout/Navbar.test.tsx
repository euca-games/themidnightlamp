import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { useAuthStore } from '../../store/authStore'
import { renderWithProviders } from '../../test/utils'
import Navbar from './Navbar'

describe('Navbar', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
  })

  it('renders app name', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByText('the midnight lamp')).toBeInTheDocument()
  })

  it('renders media type links', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByText('Games')).toBeInTheDocument()
    expect(screen.getByText('Books')).toBeInTheDocument()
    expect(screen.getByText('Movies')).toBeInTheDocument()
    expect(screen.getByText('TV')).toBeInTheDocument()
    expect(screen.getByText('Collections')).toBeInTheDocument()
  })

  it('shows username when logged in', () => {
    useAuthStore.setState({
      user: { id: '1', username: 'john', email: 'john@test.com', bio: null, avatar_url: null, created_at: '' },
    })
    renderWithProviders(<Navbar />)
    expect(screen.getByText('john')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('hides username when logged out', () => {
    renderWithProviders(<Navbar />)
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument()
  })
})
