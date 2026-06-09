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
  Briefcase, Laptop, TrendingUp, DollarSign, Banknote, Coins, Landmark,
  PiggyBank, Wallet, CreditCard, Receipt, ArrowUpDown, Home, Building,
  Zap, Droplets, Wifi, Hammer, Sofa, Lightbulb, Car, Fuel, Wrench,
  Shield, Bus, Bike, Train, Truck, Plane, Utensils, Coffee, Pizza,
  ShoppingCart, Heart, Stethoscope, Pill, Dumbbell, Shirt, Scissors,
  ShoppingBag, Baby, Dog, Cat, GraduationCap, BookOpen, Gamepad2, Film,
  Music, Hotel, Trees, Gift, PartyPopper, Star, Phone, Tv, FileText,
  Plus, Package, Sun, Moon, Leaf,
}

const uniqueIconMap: Record<string, LucideIcon> = {}
Object.entries(iconMap).forEach(([key, val]) => { uniqueIconMap[key] = val })

interface CategoryIconProps {
  icon: string
  color?: string
  className?: string
  size?: number
}

export function CategoryIcon({ icon, color, className = "", size = 16 }: CategoryIconProps) {
  if (icon && !uniqueIconMap[icon]) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1, display: "inline-flex", alignItems: "center" }}>
        {icon}
      </span>
    )
  }
  const IconComponent = uniqueIconMap[icon] || Wallet
  return <IconComponent className={className} size={size} style={color ? { color } : undefined} />
}

export const availableIcons = Object.keys(uniqueIconMap)

export const availableEmojis: string[] = [
  "💰","💵","💳","🏦","💹","📈","📉","🪙","💎","🏧",
  "🏠","🏡","🏢","🔑","💡","🚿","🛁","🛋️","🪴","🔧",
  "🚗","⛽","🛵","🚌","✈️","🚂","🚕","🛻","🚙","🅿️",
  "🍽️","🛒","🥦","🍕","☕","🍺","🥩","🍜","🥗","🍱",
  "❤️","💊","🏥","🩺","💪","🧘","🏃","🦷","👁️","🩹",
  "👕","👟","💄","✂️","🛍️","🎒","👜","💍","🧴","🪥",
  "👶","🐶","🐱","🐾","🐠","🐹","🦜","🌸","🧸","🌺",
  "📚","🎓","✏️","💻","🔬","🎨","🎭","📝","🖊️","📐",
  "🎮","🎬","🎵","🏖️","⚽","🎯","🎲","🎪","🎠","🎡",
  "📱","📺","🎧","📡","🖥️","⌚","🕹️","📷","🔔","📨",
  "🎁","🎉","🌍","⭐","🔥","💫","🌈","🍀","🏆","🎀",
]
