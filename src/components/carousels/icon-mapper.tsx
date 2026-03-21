import React from 'react';

const ICON_MAP: Record<string, string> = {
    // Growth & Data
    growth: 'fi-sr-arrow-trend-up', chart: 'fi-sr-chart-histogram', graph: 'fi-sr-pulse', data: 'fi-sr-database',
    analysis: 'fi-sr-chart-pie', metric: 'fi-sr-bullseye', kpi: 'fi-sr-bullseye', stats: 'fi-sr-chart-histogram',

    // Money & Business
    money: 'fi-sr-dollar', cash: 'fi-sr-dollar', profit: 'fi-sr-dollar', cost: 'fi-sr-dollar',
    dollar: 'fi-sr-dollar', business: 'fi-sr-briefcase', work: 'fi-sr-briefcase', job: 'fi-sr-briefcase',
    price: 'fi-sr-tag', sale: 'fi-sr-shopping-cart', buy: 'fi-sr-shopping-cart',

    // People & Social
    people: 'fi-sr-users', team: 'fi-sr-users', user: 'fi-sr-user', community: 'fi-sr-users',
    social: 'fi-sr-comment', message: 'fi-sr-comment', chat: 'fi-sr-comment',
    contact: 'fi-sr-phone', email: 'fi-sr-comment',

    // Status & Alerts
    warning: 'fi-sr-triangle-warning', error: 'fi-sr-triangle-warning', danger: 'fi-sr-triangle-warning',
    stop: 'fi-sr-cross-circle', success: 'fi-sr-check-circle', check: 'fi-sr-check-circle', done: 'fi-sr-check-circle',
    fail: 'fi-sr-cross-circle', wrong: 'fi-sr-cross-circle', info: 'fi-sr-life-ring', help: 'fi-sr-life-ring',

    // Concepts
    idea: 'fi-sr-bulb', tip: 'fi-sr-bulb', innovation: 'fi-sr-bulb', creative: 'fi-sr-bulb',
    time: 'fi-sr-clock', date: 'fi-sr-calendar', deadline: 'fi-sr-clock', schedule: 'fi-sr-calendar',
    goal: 'fi-sr-bullseye', aim: 'fi-sr-bullseye', focus: 'fi-sr-bullseye',
    security: 'fi-sr-shield', lock: 'fi-sr-lock', secure: 'fi-sr-shield', safe: 'fi-sr-shield',
    tech: 'fi-sr-microchip', code: 'fi-sr-code-simple', web: 'fi-sr-globe', internet: 'fi-sr-globe', cloud: 'fi-sr-cloud',
    love: 'fi-sr-heart', like: 'fi-sr-heart', favorite: 'fi-sr-star', star: 'fi-sr-star',
    home: 'fi-sr-home', house: 'fi-sr-home', location: 'fi-sr-marker', place: 'fi-sr-marker',
    image: 'fi-sr-picture', photo: 'fi-sr-camera', video: 'fi-sr-video-camera', media: 'fi-sr-play',
    music: 'fi-sr-music', sound: 'fi-sr-volume', audio: 'fi-sr-megaphone',

    // Tools
    tool: 'fi-sr-settings-sliders', settings: 'fi-sr-settings', gear: 'fi-sr-settings', config: 'fi-sr-settings',
    search: 'fi-sr-search', find: 'fi-sr-search', zoom: 'fi-sr-search',
    link: 'fi-sr-link', url: 'fi-sr-link', connect: 'fi-sr-link',

    // Brands
    twitter: 'fi-brands-twitter', x: 'fi-brands-twitter', linkedin: 'fi-brands-linkedin', facebook: 'fi-brands-facebook', instagram: 'fi-brands-instagram', youtube: 'fi-brands-youtube',

    // Misc
    gift: 'fi-sr-gift', reward: 'fi-sr-badge', winner: 'fi-sr-badge', trophy: 'fi-sr-badge',
    coffee: 'fi-sr-mug-hot', break: 'fi-sr-mug-hot', food: 'fi-sr-mug-hot',
    travel: 'fi-sr-paper-plane', flight: 'fi-sr-paper-plane',
    list: 'fi-sr-list', menu: 'fi-sr-menu-burger'
};

const DefaultIcon = 'fi-sr-magic-wand';

export function getIconForCue(cue: string): string {
    if (!cue) return DefaultIcon;

    const lowerCue = cue.toLowerCase();

    for (const [key, iconClass] of Object.entries(ICON_MAP)) {
        if (lowerCue.includes(key)) {
            return iconClass;
        }
    }

    return DefaultIcon;
}

export function SuggestionIcon({ cue, className }: { cue: string, className?: string }) {
    const iconClass = getIconForCue(cue);
    return <i className={`fi ${iconClass} flex items-center justify-center ${className || ''}`}></i>;
}
