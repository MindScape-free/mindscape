'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Atom,
  Brain,
  Globe,
  Cpu,
  Dna,
  Landmark,
  Palette,
  Coins,
  HeartPulse,
  BookOpen,
  FlaskConical,
  Rocket,
  Music,
  Camera,
  Mountain,
  Leaf,
  Sun,
  Moon,
  Zap,
  Sword,
  Ship,
  Database,
  Code,
  Telescope,
  Users,
  TreePine,
  Lightbulb,
  Trophy,
  Gamepad2,
  Compass,
  Flame,
  UtensilsCrossed,
  Car,
  Dumbbell,
  Medal,
  Scroll,
  Gem,
  Crown,
  Shield,
  Eye,
  Star,
  Cloud,
  Rainbow,
  Waves,
  Sprout,
  Puzzle,
  Theater,
  Building2,
  CircuitBoard,
  Clapperboard,
  Cookie,
  Diamond,
  DollarSign,
  Earth,
  Egg,
  FerrisWheel,
  Fish,
  Flag,
  Flower2,
  GlassWater,
  Grape,
  Guitar,
  Handshake,
  Hash,
  Headphones,
  Heart,
  History,
  IceCream,
  Image,
  Infinity,
  Joystick,
  Kanban,
  Map,
  Megaphone,
  Microscope,
  Network,
  Nut,
  Paintbrush,
  PawPrint,
  Pi,
  Piano,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Popcorn,
  Presentation,
  Quote,
  Recycle,
  Ribbon,
  Sailboat,
  Salad,
  Sandwich,
  Satellite,
  School,
  Server,
  ShieldCheck,
  Shrub,
  Sigma,
  Smile,
  Snowflake,
  Soup,
  Stethoscope,
  Store,
  Sunrise,
  Sunset,
  SwatchBook,
  Syringe,
  Target,
  Tent,
  Train,
  Tv,
  University,
  Utensils,
  Wallet,
  Wind,
  Wine,
  Castle,
  Bike,
  Coffee,
  Clock,
  Dice1,
  LineChart,
  Bot,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface QuickStartTopic {
  icon: any;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  category: string;
}

const COLORS = [
  { color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
  { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  { color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
  { color: 'text-pink-400', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/20' },
  { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  { color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20' },
  { color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
  { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  { color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20' },
  { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20' },
  { color: 'text-teal-400', bgColor: 'bg-teal-500/10', borderColor: 'border-teal-500/20' },
  { color: 'text-sky-400', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/20' },
  { color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/10', borderColor: 'border-fuchsia-500/20' },
  { color: 'text-lime-400', bgColor: 'bg-lime-500/10', borderColor: 'border-lime-500/20' },
  { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' },
];

const c = (i: number) => COLORS[i % COLORS.length];

const QUICK_START_TOPICS: QuickStartTopic[] = [
  // Science & Technology
  { icon: Atom, label: 'Quantum Computing', emoji: '🔬', ...c(0), category: 'Science' },
  { icon: Brain, label: 'Neural Networks', emoji: '🧠', ...c(1), category: 'Science' },
  { icon: Cpu, label: 'How CPUs Work', emoji: '💻', ...c(2), category: 'Science' },
  { icon: Database, label: 'Database Design', emoji: '🗄️', ...c(3), category: 'Science' },
  { icon: Code, label: 'Web Development', emoji: '🌐', ...c(4), category: 'Science' },
  { icon: CircuitBoard, label: 'Computer Architecture', emoji: '🔌', ...c(5), category: 'Science' },
  { icon: Network, label: 'Network Protocols', emoji: '🌍', ...c(6), category: 'Science' },
  { icon: Shield, label: 'Cybersecurity', emoji: '🔒', ...c(7), category: 'Science' },
  { icon: Cloud, label: 'Cloud Computing', emoji: '☁️', ...c(8), category: 'Science' },
  { icon: Server, label: 'Serverless Architecture', emoji: '⚡', ...c(9), category: 'Science' },
  { icon: Telescope, label: 'Astronomy', emoji: '🔭', ...c(10), category: 'Science' },
  { icon: Rocket, label: 'Space Exploration', emoji: '🚀', ...c(11), category: 'Science' },
  { icon: FlaskConical, label: 'CRISPR Gene Editing', emoji: '🧪', ...c(12), category: 'Science' },
  { icon: Microscope, label: 'Microbiology', emoji: '🦠', ...c(13), category: 'Science' },
  { icon: Dna, label: 'Genetics', emoji: '🧬', ...c(14), category: 'Science' },
  { icon: Atom, label: 'Particle Physics', emoji: '⚛️', ...c(15), category: 'Science' },
  { icon: Zap, label: 'Electricity', emoji: '⚡', ...c(16), category: 'Science' },
  { icon: Lightbulb, label: 'Inventions', emoji: '💡', ...c(0), category: 'Science' },
  { icon: Satellite, label: 'Satellite Technology', emoji: '🛰️', ...c(1), category: 'Science' },
  { icon: Bot, label: 'Robotics', emoji: '🤖', ...c(2), category: 'Science' },
  { icon: Brain, label: 'Machine Learning', emoji: '🤖', ...c(3), category: 'Science' },
  { icon: Hash, label: 'Cryptography', emoji: '🔐', ...c(4), category: 'Science' },
  { icon: Infinity, label: 'Set Theory', emoji: '∞', ...c(5), category: 'Science' },
  { icon: Pi, label: 'Mathematics', emoji: 'π', ...c(6), category: 'Science' },

  // History & Philosophy
  { icon: Landmark, label: 'Roman Empire', emoji: '🏛️', ...c(7), category: 'History' },
  { icon: BookOpen, label: 'Stoicism', emoji: '📜', ...c(8), category: 'History' },
  { icon: Scroll, label: 'Ancient Egypt', emoji: '📜', ...c(9), category: 'History' },
  { icon: Crown, label: 'Medieval Kingdoms', emoji: '👑', ...c(10), category: 'History' },
  { icon: Flag, label: 'World War II', emoji: '🏴', ...c(11), category: 'History' },
  { icon: Castle, label: 'Feudalism', emoji: '🏰', ...c(12), category: 'History' },
  { icon: Compass, label: 'Age of Exploration', emoji: '🧭', ...c(13), category: 'History' },
  { icon: Gem, label: 'The Renaissance', emoji: '💎', ...c(14), category: 'History' },
  { icon: Landmark, label: 'Greek Philosophers', emoji: '🏛️', ...c(15), category: 'History' },
  { icon: Sword, label: 'Samurai Culture', emoji: '⚔️', ...c(16), category: 'History' },
  { icon: University, label: 'Industrial Revolution', emoji: '🏭', ...c(0), category: 'History' },
  { icon: Building2, label: 'Ancient Rome', emoji: '🏗️', ...c(1), category: 'History' },
  { icon: Quote, label: 'Existentialism', emoji: '💭', ...c(2), category: 'History' },
  { icon: Eye, label: 'Philosophy of Mind', emoji: '👁️', ...c(3), category: 'History' },
  { icon: Globe, label: 'Ancient Civilizations', emoji: '🌍', ...c(4), category: 'History' },

  // Arts & Culture
  { icon: Palette, label: 'Color Theory', emoji: '🎨', ...c(5), category: 'Arts' },
  { icon: Music, label: 'Music Theory', emoji: '🎵', ...c(6), category: 'Arts' },
  { icon: Camera, label: 'Photography', emoji: '📷', ...c(7), category: 'Arts' },
  { icon: Clapperboard, label: 'Film History', emoji: '🎬', ...c(8), category: 'Arts' },
  { icon: Theater, label: 'Shakespeare', emoji: '🎭', ...c(9), category: 'Arts' },
  { icon: BookOpen, label: 'Creative Writing', emoji: '✍️', ...c(10), category: 'Arts' },
  { icon: Palette, label: 'Impressionism', emoji: '🖼️', ...c(11), category: 'Arts' },
  { icon: Guitar, label: 'Guitar Fundamentals', emoji: '🎸', ...c(12), category: 'Arts' },
  { icon: Headphones, label: 'Music Production', emoji: '🎧', ...c(13), category: 'Arts' },
  { icon: Piano, label: 'Piano Basics', emoji: '🎹', ...c(14), category: 'Arts' },
  { icon: Image, label: 'Graphic Design', emoji: '🖌️', ...c(15), category: 'Arts' },
  { icon: Clapperboard, label: 'Animation', emoji: '🎥', ...c(16), category: 'Arts' },
  { icon: SwatchBook, label: 'Fashion Design', emoji: '👗', ...c(0), category: 'Arts' },
  { icon: Landmark, label: 'Architecture', emoji: '🏛️', ...c(1), category: 'Arts' },
  { icon: Diamond, label: 'Art History', emoji: '💠', ...c(2), category: 'Arts' },

  // Health & Biology
  { icon: HeartPulse, label: 'Human Anatomy', emoji: '❤️', ...c(3), category: 'Health' },
  { icon: Dna, label: 'Nutrition Science', emoji: '🥗', ...c(4), category: 'Health' },
  { icon: Pill, label: 'Pharmacology', emoji: '💊', ...c(5), category: 'Health' },
  { icon: Brain, label: 'Neuroscience', emoji: '🧠', ...c(6), category: 'Health' },
  { icon: Stethoscope, label: 'Diagnostic Medicine', emoji: '🩺', ...c(7), category: 'Health' },
  { icon: Syringe, label: 'Immunology', emoji: '💉', ...c(8), category: 'Health' },
  { icon: Heart, label: 'Cardiology', emoji: '❤️', ...c(9), category: 'Health' },
  { icon: Dumbbell, label: 'Exercise Science', emoji: '💪', ...c(10), category: 'Health' },
  { icon: Moon, label: 'Sleep Science', emoji: '🌙', ...c(11), category: 'Health' },
  { icon: Brain, label: 'Cognitive Biases', emoji: '🧠', ...c(12), category: 'Health' },
  { icon: Eye, label: 'Vision & Optics', emoji: '👁️', ...c(13), category: 'Health' },
  { icon: Leaf, label: 'Botany', emoji: '🌿', ...c(14), category: 'Health' },
  { icon: Fish, label: 'Marine Biology', emoji: '🐟', ...c(15), category: 'Health' },
  { icon: PawPrint, label: 'Zoology', emoji: '🐾', ...c(16), category: 'Health' },
  { icon: Egg, label: 'Evolution', emoji: '🥚', ...c(0), category: 'Health' },

  // Business & Finance
  { icon: Coins, label: 'Blockchain Technology', emoji: '📈', ...c(1), category: 'Business' },
  { icon: DollarSign, label: 'Stock Market', emoji: '💰', ...c(2), category: 'Business' },
  { icon: PiggyBank, label: 'Personal Finance', emoji: '🐷', ...c(3), category: 'Business' },
  { icon: LineChart, label: 'Data Analysis', emoji: '📊', ...c(4), category: 'Business' },
  { icon: Megaphone, label: 'Digital Marketing', emoji: '📢', ...c(5), category: 'Business' },
  { icon: Users, label: 'Team Management', emoji: '👥', ...c(6), category: 'Business' },
  { icon: Lightbulb, label: 'Entrepreneurship', emoji: '💡', ...c(7), category: 'Business' },
  { icon: Kanban, label: 'Agile Methodologies', emoji: '📋', ...c(8), category: 'Business' },
  { icon: Presentation, label: 'Public Speaking', emoji: '🎤', ...c(9), category: 'Business' },
  { icon: Handshake, label: 'Negotiation Skills', emoji: '🤝', ...c(10), category: 'Business' },
  { icon: Wallet, label: 'Investing', emoji: '👛', ...c(11), category: 'Business' },
  { icon: Store, label: 'E-Commerce', emoji: '🏪', ...c(12), category: 'Business' },
  { icon: Target, label: 'Product Management', emoji: '🎯', ...c(13), category: 'Business' },
  { icon: Trophy, label: 'Sales Strategies', emoji: '🏆', ...c(14), category: 'Business' },
  { icon: Gem, label: 'Business Strategy', emoji: '💎', ...c(15), category: 'Business' },

  // Nature & Environment
  { icon: Globe, label: 'Climate Change', emoji: '🌍', ...c(16), category: 'Nature' },
  { icon: TreePine, label: 'Forest Ecosystems', emoji: '🌲', ...c(0), category: 'Nature' },
  { icon: Mountain, label: 'Geology', emoji: '⛰️', ...c(1), category: 'Nature' },
  { icon: Waves, label: 'Oceanography', emoji: '🌊', ...c(2), category: 'Nature' },
  { icon: Mountain, label: 'Volcanology', emoji: '🌋', ...c(3), category: 'Nature' },
  { icon: Rainbow, label: 'Weather Patterns', emoji: '🌈', ...c(4), category: 'Nature' },
  { icon: Wind, label: 'Wind Energy', emoji: '💨', ...c(5), category: 'Nature' },
  { icon: Sun, label: 'Solar Power', emoji: '☀️', ...c(6), category: 'Nature' },
  { icon: Leaf, label: 'Ecology', emoji: '🍃', ...c(7), category: 'Nature' },
  { icon: Flower2, label: 'Environmental Science', emoji: '🌸', ...c(8), category: 'Nature' },
  { icon: Sprout, label: 'Sustainable Farming', emoji: '🌱', ...c(9), category: 'Nature' },
  { icon: Recycle, label: 'Waste Management', emoji: '♻️', ...c(10), category: 'Nature' },
  { icon: Earth, label: 'Earth Sciences', emoji: '🌏', ...c(11), category: 'Nature' },
  { icon: Snowflake, label: 'Glaciology', emoji: '❄️', ...c(12), category: 'Nature' },
  { icon: Shrub, label: 'Biodiversity', emoji: '🌿', ...c(13), category: 'Nature' },

  // Psychology & Self-Improvement
  { icon: Brain, label: 'Cognitive Psychology', emoji: '🧠', ...c(14), category: 'Psychology' },
  { icon: BookOpen, label: 'Habit Formation', emoji: '📖', ...c(15), category: 'Psychology' },
  { icon: Lightbulb, label: 'Critical Thinking', emoji: '💡', ...c(16), category: 'Psychology' },
  { icon: Smile, label: 'Positive Psychology', emoji: '😊', ...c(0), category: 'Psychology' },
  { icon: Users, label: 'Social Psychology', emoji: '👥', ...c(1), category: 'Psychology' },
  { icon: Target, label: 'Goal Setting', emoji: '🎯', ...c(2), category: 'Psychology' },
  { icon: Heart, label: 'Emotional Intelligence', emoji: '💖', ...c(3), category: 'Psychology' },
  { icon: Trophy, label: 'Productivity', emoji: '🏆', ...c(4), category: 'Psychology' },
  { icon: Brain, label: 'Memory Techniques', emoji: '🧠', ...c(5), category: 'Psychology' },
  { icon: Compass, label: 'Mindfulness', emoji: '🧘', ...c(6), category: 'Psychology' },
  { icon: Flame, label: 'Motivation', emoji: '🔥', ...c(7), category: 'Psychology' },
  { icon: Clock, label: 'Time Management', emoji: '⏰', ...c(8), category: 'Psychology' },
  { icon: Users, label: 'Leadership', emoji: '👤', ...c(9), category: 'Psychology' },
  { icon: Star, label: 'Personal Branding', emoji: '⭐', ...c(10), category: 'Psychology' },
  { icon: Zap, label: 'Decision Making', emoji: '⚡', ...c(11), category: 'Psychology' },

  // Entertainment & Sports
  { icon: Gamepad2, label: 'Game Design', emoji: '🎮', ...c(12), category: 'Entertainment' },
  { icon: Trophy, label: 'Olympic History', emoji: '🥇', ...c(13), category: 'Entertainment' },
  { icon: Music, label: 'Jazz History', emoji: '🎷', ...c(14), category: 'Entertainment' },
  { icon: Clapperboard, label: 'Superhero Films', emoji: '🦸', ...c(15), category: 'Entertainment' },
  { icon: Dice1, label: 'Board Game Design', emoji: '🎲', ...c(16), category: 'Entertainment' },
  { icon: Joystick, label: 'Esports', emoji: '🎮', ...c(0), category: 'Entertainment' },
  { icon: Dumbbell, label: 'Strength Training', emoji: '🏋️', ...c(1), category: 'Entertainment' },
  { icon: Bike, label: 'Cycling', emoji: '🚴', ...c(2), category: 'Entertainment' },
  { icon: Medal, label: 'Sports Psychology', emoji: '🏅', ...c(3), category: 'Entertainment' },
  { icon: Tv, label: 'Television History', emoji: '📺', ...c(4), category: 'Entertainment' },
  { icon: Guitar, label: 'Rock Music', emoji: '🎸', ...c(5), category: 'Entertainment' },
  { icon: Popcorn, label: 'Film Analysis', emoji: '🍿', ...c(6), category: 'Entertainment' },
  { icon: Gamepad2, label: 'Video Game History', emoji: '🕹️', ...c(7), category: 'Entertainment' },
  { icon: Piano, label: 'Classical Music', emoji: '🎼', ...c(8), category: 'Entertainment' },
  { icon: FerrisWheel, label: 'Theme Parks', emoji: '🎡', ...c(9), category: 'Entertainment' },

  // Food & Lifestyle
  { icon: UtensilsCrossed, label: 'Cooking Techniques', emoji: '🍳', ...c(10), category: 'Food' },
  { icon: Pizza, label: 'Italian Cuisine', emoji: '🍕', ...c(11), category: 'Food' },
  { icon: Cookie, label: 'Baking Science', emoji: '🍪', ...c(12), category: 'Food' },
  { icon: Wine, label: 'Wine Making', emoji: '🍷', ...c(13), category: 'Food' },
  { icon: Coffee, label: 'Coffee Culture', emoji: '☕', ...c(14), category: 'Food' },
  { icon: Salad, label: 'Plant-Based Diet', emoji: '🥗', ...c(15), category: 'Food' },
  { icon: Sandwich, label: 'World Street Food', emoji: '🥪', ...c(16), category: 'Food' },
  { icon: GlassWater, label: 'Hydration Science', emoji: '💧', ...c(0), category: 'Food' },
  { icon: Grape, label: 'Fermentation', emoji: '🍇', ...c(1), category: 'Food' },
  { icon: Soup, label: 'World Cuisines', emoji: '🍜', ...c(2), category: 'Food' },
  { icon: IceCream, label: 'Food Chemistry', emoji: '🍦', ...c(3), category: 'Food' },
  { icon: Nut, label: 'Nutritional Science', emoji: '🥜', ...c(4), category: 'Food' },
  { icon: Egg, label: 'Culinary Arts', emoji: '🥚', ...c(5), category: 'Food' },
  { icon: Utensils, label: 'Food History', emoji: '🍽️', ...c(6), category: 'Food' },
  { icon: GlassWater, label: 'Mixology', emoji: '🍸', ...c(7), category: 'Food' },

  // Geography & Travel
  { icon: Globe, label: 'World Geography', emoji: '🌏', ...c(8), category: 'Travel' },
  { icon: Map, label: 'Cartography', emoji: '🗺️', ...c(9), category: 'Travel' },
  { icon: Sailboat, label: 'Navigation', emoji: '⛵', ...c(10), category: 'Travel' },
  { icon: Compass, label: 'Orienteering', emoji: '🧭', ...c(11), category: 'Travel' },
  { icon: Mountain, label: 'Himalayas', emoji: '🏔️', ...c(12), category: 'Travel' },
  { icon: Waves, label: 'Great Barrier Reef', emoji: '🏝️', ...c(13), category: 'Travel' },
  { icon: Car, label: 'Road Trip Planning', emoji: '🚗', ...c(14), category: 'Travel' },
  { icon: Plane, label: 'Aviation', emoji: '✈️', ...c(15), category: 'Travel' },
  { icon: Train, label: 'Railway History', emoji: '🚂', ...c(16), category: 'Travel' },
  { icon: Ship, label: 'Maritime History', emoji: '🚢', ...c(0), category: 'Travel' },
  { icon: Building2, label: 'World Wonders', emoji: '🏗️', ...c(1), category: 'Travel' },
  { icon: Tent, label: 'Camping', emoji: '⛺', ...c(2), category: 'Travel' },
  { icon: Sun, label: 'Desert Ecosystems', emoji: '🏜️', ...c(3), category: 'Travel' },
  { icon: Snowflake, label: 'Arctic Exploration', emoji: '❄️', ...c(4), category: 'Travel' },
  { icon: Compass, label: 'Travel Photography', emoji: '📸', ...c(5), category: 'Travel' },
];

const CATEGORIES = ['All', 'Science', 'History', 'Arts', 'Health', 'Business', 'Nature', 'Psychology', 'Entertainment', 'Food', 'Travel'];

interface QuickStartGridProps {
  onSelectTopic: (topic: string) => void;
  visible?: boolean;
}

export function QuickStartGrid({ onSelectTopic, visible = true }: QuickStartGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(8);
  // Deterministic initial set for SSR to avoid hydration mismatch.
  const [shuffled, setShuffled] = useState(() => QUICK_START_TOPICS);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      let filtered = QUICK_START_TOPICS;
      if (selectedCategory !== 'All') {
        filtered = QUICK_START_TOPICS.filter(t => t.category === selectedCategory);
      }
      setShuffled([...filtered].sort(() => 0.5 - Math.random()));
      setVisibleCount(8);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [selectedCategory]);

  if (!visible) return null;

  return (
    <section className="py-12 md:py-16 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-8 md:mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-primary/50" />
            <Sparkles className="w-4 h-4 text-primary" />
            <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-primary/50" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Try one of these — just click and go
          </h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">
            No typing needed. Pick a topic and we&apos;ll generate a mind map instantly.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto mb-8 w-full group">
          {/* Left Scroll Indicator */}
          <div className={cn(
            "absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-background via-background/80 to-transparent z-10 flex items-center justify-start px-1 transition-opacity duration-300 pointer-events-none",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}>
            <div className="w-6 h-6 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <ChevronLeft className="w-4 h-4 text-zinc-300" />
            </div>
          </div>

          {/* Right Scroll Indicator */}
          <div className={cn(
            "absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-background via-background/80 to-transparent z-10 flex items-center justify-end px-1 transition-opacity duration-300 pointer-events-none",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}>
            <div className="w-6 h-6 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <ChevronRight className="w-4 h-4 text-zinc-300" />
            </div>
          </div>

          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex overflow-x-auto gap-2 pb-4 justify-start w-full px-4 max-w-5xl mx-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all whitespace-nowrap shrink-0 border",
                  selectedCategory === category 
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
                    : "bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 border-white/5 hover:border-white/10"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {shuffled.slice(0, visibleCount).map((topic, index) => (
            <motion.button
              key={topic.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: (index % 8) * 0.04 }}
              onClick={() => onSelectTopic(topic.label)}
              className={cn(
                "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                "bg-zinc-900/40 hover:bg-zinc-800/80 border-white/5 hover:border-white/10",
                "hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98] cursor-pointer text-left backdrop-blur-sm"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300",
                "bg-zinc-950 border border-white/5 shadow-inner group-hover:scale-110",
                topic.color
              )}>
                <topic.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-300 group-hover:text-white transition-colors leading-tight block line-clamp-2">
                  {topic.label}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
        
        {visibleCount < shuffled.length && (
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => setVisibleCount(prev => prev + 8)} 
              className="px-6 py-2.5 rounded-full border border-white/10 bg-zinc-900/30 hover:bg-zinc-800/80 text-sm font-medium text-zinc-300 hover:text-white transition-all duration-300 shadow-sm backdrop-blur-sm"
            >
              View More Topics
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
