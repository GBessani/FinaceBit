"use client"

import {
  Briefcase,
  Laptop,
  TrendingUp,
  Plus,
  Utensils,
  Car,
  Home,
  Heart,
  GraduationCap,
  Gamepad2,
  ShoppingBag,
  FileText,
  Wallet,
  CreditCard,
  PiggyBank,
  DollarSign,
  type LucideIcon,
} from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  Briefcase,
  Laptop,
  TrendingUp,
  Plus,
  Utensils,
  Car,
  Home,
  Heart,
  GraduationCap,
  Gamepad2,
  ShoppingBag,
  FileText,
  Wallet,
  CreditCard,
  PiggyBank,
  DollarSign,
}

interface CategoryIconProps {
  icon: string
  color?: string
  className?: string
  size?: number
}

export function CategoryIcon({
  icon,
  color,
  className = "",
  size = 16,
}: CategoryIconProps) {
  const IconComponent = iconMap[icon] || Wallet

  return (
    <IconComponent
      className={className}
      size={size}
      style={color ? { color } : undefined}
    />
  )
}

export const availableIcons = Object.keys(iconMap)
