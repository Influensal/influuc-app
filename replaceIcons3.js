const fs = require('fs');
const path = require('path');

const iconMap = {
    'MessageSquare': 'fi-sr-comment',
    'Archive': 'fi-sr-box',
    'ChevronDown': 'fi-sr-angle-down',
    'Layout': 'fi-sr-grid',
    'Globe': 'fi-sr-globe',
    'Type': 'fi-sr-font',
    'LinkIcon': 'fi-sr-link-alt',
    'User': 'fi-sr-user',
    'Building2': 'fi-sr-building',
    'CreditCard': 'fi-sr-credit-card',
    'Building': 'fi-sr-building',
    'Briefcase': 'fi-sr-briefcase',
    'Target': 'fi-sr-bullseye',
    'Search': 'fi-sr-search',
    'FileText': 'fi-sr-document',
    'Palette': 'fi-sr-paint-roller',
    'Link': 'fi-sr-link',
    'Check': 'fi-sr-check',
    'Sparkles': 'fi-sr-magic-wand',
    'Zap': 'fi-sr-bolt',
    'Hammer': 'fi-sr-hammer',
    'BookOpen': 'fi-sr-book-open-cover',
    'Mic': 'fi-sr-microphone',
    'Eye': 'fi-sr-eye',
    'TrendingUp': 'fi-sr-arrow-trend-up',
    'BarChart': 'fi-sr-chart-histogram',
    'Activity': 'fi-sr-pulse',
    'Database': 'fi-sr-database',
    'PieChart': 'fi-sr-chart-pie',
    'DollarSign': 'fi-sr-dollar',
    'Tag': 'fi-sr-tag',
    'ShoppingCart': 'fi-sr-shopping-cart',
    'Users': 'fi-sr-users',
    'MessageCircle': 'fi-sr-comment',
    'Phone': 'fi-sr-phone',
    'AlertTriangle': 'fi-sr-triangle-warning',
    'XCircle': 'fi-sr-cross-circle',
    'CheckCircle': 'fi-sr-check-circle',
    'LifeBuoy': 'fi-sr-life-ring',
    'Lightbulb': 'fi-sr-bulb',
    'Clock': 'fi-sr-clock',
    'Calendar': 'fi-sr-calendar',
    'Shield': 'fi-sr-shield',
    'Cpu': 'fi-sr-microchip',
    'Code': 'fi-sr-code-simple',
    'Cloud': 'fi-sr-cloud',
    'Heart': 'fi-sr-heart',
    'Star': 'fi-sr-star',
    'Home': 'fi-sr-home',
    'MapPin': 'fi-sr-marker',
    'Camera': 'fi-sr-camera',
    'Video': 'fi-sr-video-camera',
    'Play': 'fi-sr-play',
    'Music': 'fi-sr-music',
    'Volume2': 'fi-sr-volume',
    'Speaker': 'fi-sr-megaphone',
    'Wrench': 'fi-sr-settings-sliders',
    'Settings': 'fi-sr-settings',
    'Twitter': 'fi-brands-twitter',
    'Linkedin': 'fi-brands-linkedin',
    'Facebook': 'fi-brands-facebook',
    'Instagram': 'fi-brands-instagram',
    'Youtube': 'fi-brands-youtube',
    'Gift': 'fi-sr-gift',
    'Award': 'fi-sr-badge',
    'Coffee': 'fi-sr-mug-hot',
    'PlaneIcon': 'fi-sr-paper-plane',
    'ListIcon': 'fi-sr-list',
    'MenuIcon': 'fi-sr-menu-burger',
    'SparklesIcon': 'fi-sr-magic-wand',
    'MoreHorizontal': 'fi-sr-menu-dots',
    'Edit3': 'fi-sr-pencil',
    'Repeat2': 'fi-sr-rotate-right',
    'Bookmark': 'fi-sr-bookmark',
    'Share': 'fi-sr-share',
    'ThumbsUp': 'fi-sr-social-network'
};

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/icon:\s*([A-Z][A-Za-z0-9]+)/g, (match, iconName) => {
        if (iconMap[iconName]) return `icon: '${iconMap[iconName]}'`;
        if (iconName === 'StarIcon') return `icon: 'fi-sr-star'`;
        return match;
    });

    content = content.replace(/<Icon className="([^"]+)" \/>/g, (match, className) => {
        return `<i className={\`fi \${Icon} flex items-center justify-center ${className}\`}></i>`;
    });

    content = content.replace(/<Icon className=\{`([^`]+)`\} \/>/g, (match, className) => {
        return `<i className={\`fi \${Icon} flex items-center justify-center ${className}\`}></i>`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Processed:', filePath);
    }
}
walkDir('./src', processFile);
