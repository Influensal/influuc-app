
import React from 'react';
import {
    TrendingUp, DollarSign, Users, AlertTriangle, Lightbulb, Lock, Clock,
    Target, Zap, BarChart, PieChart, Activity, Award, Briefcase,
    Calendar, CheckCircle, XCircle, Cloud, Code, Database, Globe,
    Heart, Home, Image, Key, Link, MapPin, MessageCircle, Music,
    Package, Phone, Play, Search, Settings, ShoppingCart, Star,
    Tag, Wrench, Truck, Unlock, Upload, Video, Wifi, Book,
    Camera, Coffee, Compass, Cpu, CreditCard, Flag, Gift,
    Layers, Layout, LifeBuoy, Monitor, Moon, Sun, Shield,
    Smartphone, Speaker, Terminal, ThumbsUp, Trash, User,
    Volume2, Watch, Youtube, Twitter, Linkedin, Facebook, Instagram
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
    // Growth & Data
    growth: TrendingUp, chart: BarChart, graph: Activity, data: Database,
    analysis: PieChart, metric: Target, kpi: Target, stats: BarChart,

    // Money & Business
    money: DollarSign, cash: DollarSign, profit: DollarSign, cost: DollarSign,
    dollar: DollarSign, business: Briefcase, work: Briefcase, job: Briefcase,
    price: Tag, sale: ShoppingCart, buy: ShoppingCart,

    // People & Social
    people: Users, team: Users, user: User, community: Users,
    social: MessageCircle, message: MessageCircle, chat: MessageCircle,
    contact: Phone, email: MessageCircle,

    // Status & Alerts
    warning: AlertTriangle, error: AlertTriangle, danger: AlertTriangle,
    stop: XCircle, success: CheckCircle, check: CheckCircle, done: CheckCircle,
    fail: XCircle, wrong: XCircle, info: LifeBuoy, help: LifeBuoy,

    // Concepts
    idea: Lightbulb, tip: Lightbulb, innovation: Lightbulb, creative: Lightbulb,
    time: Clock, date: Calendar, deadline: Clock, schedule: Calendar,
    goal: Target, aim: Target, focus: Target,
    security: Shield, lock: Lock, secure: Shield, safe: Shield,
    tech: Cpu, code: Code, web: Globe, internet: Globe, cloud: Cloud,
    love: Heart, like: Heart, favorite: Star, star: Star,
    home: Home, house: Home, location: MapPin, place: MapPin,
    image: Image, photo: Camera, video: Video, media: Play,
    music: Music, sound: Volume2, audio: Speaker,

    // Tools
    tool: Wrench, settings: Settings, gear: Settings, config: Settings,
    search: Search, find: Search, zoom: Search,
    link: Link, url: Link, connect: Link,

    // Brands
    twitter: Twitter, x: Twitter, linkedin: Linkedin, facebook: Facebook, instagram: Instagram, youtube: Youtube,

    // Misc
    gift: Gift, reward: Award, winner: Award, trophy: Award,
    coffee: Coffee, break: Coffee, food: Coffee,
    travel: PlaneIcon, flight: PlaneIcon,
    list: ListIcon, menu: MenuIcon
};

// Fallback icon
const DefaultIcon = SparklesIcon;

import { Plane as PlaneIcon, List as ListIcon, Menu as MenuIcon, Sparkles as SparklesIcon } from 'lucide-react';

// Common visual cue keywords mapping
export function getIconForCue(cue: string): React.ElementType {
    if (!cue) return DefaultIcon;

    const lowerCue = cue.toLowerCase();

    // Check for direct matches or includes
    for (const [key, Icon] of Object.entries(ICON_MAP)) {
        if (lowerCue.includes(key)) {
            return Icon;
        }
    }

    return DefaultIcon;
}

export function SuggestionIcon({ cue, className }: { cue: string, className?: string }) {
    const Icon = getIconForCue(cue);
    return <Icon className={className} />;
}
