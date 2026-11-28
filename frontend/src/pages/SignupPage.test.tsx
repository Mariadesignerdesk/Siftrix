import { isValidElement, type FormEvent, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hook-state harness: SignupPage's useState calls are declared in this order.
// (fullName, email, organization, password, confirmPassword, showPassword,
//  agreeToTerms, isLoading, errorMessage, successMessage)
const hookState = vi.hoisted(() => ({
  values: [] as unknown[],
  index: 0,
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: (initial: unknown) => {
      const i = hookState.index++
      const value = i < hookState.values.length ? hookState.values[i] : initial
      return [value, vi.fn()]
    },
    useRef: (initial: unknown) => ({ current: initial }),
    useEffect: () => undefined,
  }
})

const registerUserMock = vi.hoisted(() => vi.fn())

vi.mock('../services/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/authService')>()
  return { ...actual, registerUser: registerUserMock }
})

import SignupPage from './SignupPage'

type FormProps = {
  onSubmit?: (event: FormEvent<HTMLFormElement>) => Promise<void>
  children?: ReactNode
}

function findForm(node: ReactNode): FormProps | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findForm(child)
      if (found) return found
    }
    return null
  }
  if (isValidElement<FormProps>(node)) {
    if (node.type === 'form') return node.props
    return findForm(node.props.children)
  }
  return null
}

async function submitSignup(organization: string) {
  hookState.index = 0
  hookState.values = [
    'Tariq Mansoor',
    'tariq@example.com',
    organization,
    'CyberGuard#2026',
    'CyberGuard#2026',
    false,
    true,
    false,
    '',
    '',
  ]
  const tree = SignupPage({ onNavigate: vi.fn() })
  const form = findForm(tree)
  expect(form?.onSubmit).toBeTypeOf('function')
  await form!.onSubmit!({
    preventDefault: vi.fn(),
  } as unknown as FormEvent<HTMLFormElement>)
}

describe('SignupPage registration payload', () => {
  beforeEach(() => {
    registerUserMock.mockReset()
    registerUserMock.mockResolvedValue({
      success: false,
      error: 'stop',
      mode: 'api',
    })
  })

  it('includes the organization collected by the form in the registerUser payload', async () => {
    await submitSignup('National SOC Analyst Group')

    expect(registerUserMock).toHaveBeenCalledTimes(1)
    expect(registerUserMock).toHaveBeenCalledWith({
      fullName: 'Tariq Mansoor',
      email: 'tariq@example.com',
      password: 'CyberGuard#2026',
      confirmPassword: 'CyberGuard#2026',
      organization: 'National SOC Analyst Group',
      agreeToTerms: true,
    })
  })

  it('passes the empty organization value through unchanged when left blank', async () => {
    await submitSignup('')

    expect(registerUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ organization: '' })
    )
  })
})
