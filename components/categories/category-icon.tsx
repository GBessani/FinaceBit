"use client"

import {
  Briefcase, Laptop, TrendingUp, Plus, Utensils, Car, Home, Heart,
  GraduationCap, Gamepad2, ShoppingBag, FileText, Wallet, CreditCard,
  PiggyBank, DollarSign, Fuel, Wrench, Shield, Bus, Bike, Train,
  Zap, Droplets, Wifi, Phone, Tv, Music, Film, BookOpen, Coffee,
  Pizza, ShoppingCart, Shirt, Scissors, Dumbbell, Stethoscope,
  Pill, Baby, Dog, Cat, Trees, Plane, Hotel, Gift, PartyPopper,
  Building, Hammer, Sofa, Lightbulb, Receipt, Landmark, Coins,
  Banknote, ArrowUpDown, Truck, Package, Star, Sun, Moon, Leaf,
  type LucideIcon,
} from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  // Trabalho e renda
  Briefcase,
  Laptop,
  TrendingUp,
  DollarSign,
  Banknote,
  Coins,
  Landmark,
  PiggyBank,
  Wallet,
  CreditCard,
  Receipt,
  ArrowUpDown,

  // Moradia
  Home,
  Building,
  Zap,
  Droplets,
  Wifi,
  Hammer,
  Sofa,
  Lightbulb,

  // Transporte
  Car,
  Fuel,
  Wrench,
  Shield,
  Bus,
  Bike,
  Train,
  Truck,
  Plane,

  // Alimentação
  Utensils,
  Coffee,
  Pizza,
  ShoppingCart,

  // Saúde
  Heart,
  Stethoscope,
  Pill,
  Dumbbell,

  // Pessoal
  Shirt,
  Scissors,
  ShoppingBag,

  // Família
  Baby,
  Dog,
  Cat,

  // Educação
  GraduationCap,
  BookOpen,

  // Lazer
  Gamepad2,
  Film,
  Music,
  Hotel,
  Trees,
  Gift,
  PartyPopper,
  Star,

  // Assinaturas
  Phone,
  Tv,

  // Outros
  FileText,
  Plus,
  Package,
  Sun,
  Moon,
  Leaf,
}

// Remove duplicates
const uniqueIconMap: Record<string, LucideIcon> = {}
Object.entries(iconMap).forEach(([key, val]) => {
  uniqueIconMap[key] = val
})

interface CategoryIconProps {
  icon: string
  color?: string
  className?: string
  size?: number
}

export function CategoryIcon({ icon, color, className = "", size = 16 }: CategoryIconProps) {
  // If icon is an emoji (not in iconMap), render as text
  if (icon && !uniqueIconMap[icon]) {
    return (
      <span
        className={className}
        style={{ fontSize: size, lineHeight: 1, display: "inline-flex", alignItems: "center" }}
      >
        {icon}
      </span>
    )
  }
  const IconComponent = uniqueIconMap[icon] || Wallet
  return (
    <IconComponent
      className={className}
      size={size}
      style={color ? { color } : undefined}
    />
  )
}

export const availableIcons = Object.keys(uniqueIconMap)

export const availableEmojis = [
  // Dinheiro e finanças
  "💰","💵","💳","🏦","💹","📈","📉","🪙","💎","🏧",
  // Moradia
  "🏠","🏡","🏢","🔑","💡","🚿","🛁","🛋️","🪴","🔧",
  // Transporte
  "🚗","⛽","🛵","🚌","✈️","🚂","🚕","🛻","🚙","🅿️",
  // Alimentação
  "🍽️","🛒","🥦","🍕","☕","🍺","🥩","🍜","🥗","🍱",
  // Saúde
  "❤️","💊","🏥","🩺","💪","🧘","🏃","🦷","👁️","🩹",
  // Pessoal
  "👕","👟","💄","✂️","🛍️","🎒","👜","💍","🧴","🪥",
  // Família
  "👶","🐶","🐱","👨‍👩‍👧","🐾","🐠","🐹","🦜","🌸","🧸",
  // Educação
  "📚","🎓","✏️","💻","🔬","🎨","🎭","📝","🖊️","📐",
  // Lazer
  "🎮","🎬","🎵","🏖️","⚽","🎯","🎲","🎪","🎠","🎡",
  // Assinaturas
  "📱","📺","🎧","📡","🖥️","⌚","🕹️","📷","🔔","📨",
  // Outros
  "🎁","🎉","🌍","⭐","🔥","💫","🌈","🍀","🏆","🎀",
]