'use client'

/**
 * RupiahInput — Input field dengan pemisah ribuan otomatis (format Indonesia)
 *
 * Props:
 *  - value: number (nilai numerik)
 *  - onChange: (value: number) => void
 *  - placeholder, className, disabled — passthrough ke Input
 *
 * UX:
 *  - Menampilkan angka dengan pemisah titik (1.500.000)
 *  - Saat fokus: hapus format agar mudah diedit
 *  - Saat blur: format kembali dengan pemisah ribuan
 *  - Menerima semua angka bebas (tidak ada step restriction)
 */

import { useState, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function formatRibu(n: number): string {
  if (isNaN(n) || n === 0) return ''
  return new Intl.NumberFormat('id-ID').format(n)
}

function parseRibu(s: string): number {
  // Hilangkan semua titik (pemisah ribuan Indonesia) lalu parse
  const cleaned = s.replace(/\./g, '').replace(/[^0-9]/g, '')
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? 0 : n
}

interface RupiahInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
}

export function RupiahInput({
  value,
  onChange,
  placeholder = '0',
  className,
  disabled,
  id,
}: RupiahInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  // Saat fokus, simpan string mentah agar user bisa edit bebas
  const [rawValue, setRawValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    // Tampilkan angka tanpa format saat fokus
    setRawValue(value > 0 ? String(value) : '')
  }, [value])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    const parsed = parseRibu(rawValue)
    onChange(parsed)
  }, [rawValue, onChange])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Hanya izinkan digit
    const digitsOnly = raw.replace(/[^0-9]/g, '')
    setRawValue(digitsOnly)
    // Update parent secara realtime
    const parsed = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10)
    onChange(isNaN(parsed) ? 0 : parsed)
  }, [onChange])

  // Tampilkan: saat fokus → raw string, saat blur → format ribuan
  const displayValue = isFocused
    ? rawValue
    : value > 0 ? formatRibu(value) : ''

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn('tabular-nums', className)}
    />
  )
}
