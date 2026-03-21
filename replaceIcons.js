const fs = require('fs');
const path = require('path');

const iconMap = {
    'Check': 'fi-sr-check',
    'Sparkles': 'fi-sr-magic-wand',
    'User': 'fi-sr-user',
    'Zap': 'fi-sr-bolt',
    'Star': 'fi-sr-star',
    'Loader2': 'fi-sr-spinner',
    'ShieldCheck': 'fi-sr-shield-check',
    'Camera': 'fi-sr-camera',
    'ImageIcon': 'fi-sr-picture',
    'Image': 'fi-sr-picture',
    'LayoutTemplate': 'fi-sr-apps',
    'ArrowRight': 'fi-sr-angle-right',
    'X': 'fi-sr-cross-small',
    'Upload': 'fi-sr-upload',
    'Brain': 'fi-sr-brain',
    'AlertTriangle': 'fi-sr-triangle-warning',
    'Bell': 'fi-sr-bell',
    'ExternalLink': 'fi-sr-external-link',
    'FileText': 'fi-sr-document',
    'Settings2': 'fi-sr-settings-sliders',
    'Settings': 'fi-sr-settings',
    'ChevronLeft': 'fi-sr-angle-left',
    'ChevronRight': 'fi-sr-angle-right',
    'Download': 'fi-sr-download',
    'Plus': 'fi-sr-plus-small',
    'Trash2': 'fi-sr-trash',
    'Save': 'fi-sr-disk',
    'GripVertical': 'fi-sr-menu-dots-vertical',
    'PlaneIcon': 'fi-sr-paper-plane',
    'ListIcon': 'fi-sr-list',
    'MenuIcon': 'fi-sr-menu-burger',
    'RefreshCw': 'fi-sr-rotate-right',
    'PenTool': 'fi-sr-pen-nib',
    'ImagePlus': 'fi-sr-add-image',
    'Send': 'fi-sr-paper-plane',
    'Compass': 'fi-sr-compass',
    'RotateCcw': 'fi-sr-undo',
    'Wand2': 'fi-sr-magic-wand',
    'Layers': 'fi-sr-layers',
    'ArrowLeft': 'fi-sr-angle-left',
    'Shield': 'fi-sr-shield',
    'CheckCircle2': 'fi-sr-check-circle',
    'CreditCard': 'fi-sr-credit-card',
    'LogOut': 'fi-sr-sign-out-alt',
    'MessageCircle': 'fi-sr-comment',
    'Search': 'fi-sr-search',
    'Mail': 'fi-sr-envelope',
    'AlertCircle': 'fi-sr-info',
    'ArrowUpRight': 'fi-sr-arrow-up-right',
    'Target': 'fi-sr-bullseye',
    'Code': 'fi-sr-code-simple',
    'Copy': 'fi-sr-copy',
    'LayoutDashboard': 'fi-sr-apps',
    'Share2': 'fi-sr-share',
    'Command': 'fi-sr-command',
    'Clock': 'fi-sr-clock',
    'Flame': 'fi-sr-flame',
    'CalendarIcon': 'fi-sr-calendar',
    'Calendar': 'fi-sr-calendar',
    'TrendingUp': 'fi-sr-arrow-trend-up',
    'Lightbulb': 'fi-sr-bulb',
    'Twitter': 'fi-brands-twitter',
    'Linkedin': 'fi-brands-linkedin',
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
    
    // Check if lucide-react is used
    if (!content.includes('lucide-react')) return;

    // Remove lucide-react import
    content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"];?/g, '');

    // Replace <Icon Component ... /> with <i className="fi fi-sr-... ..." />
    for (const [lucideName, fiName] of Object.entries(iconMap)) {
        // Regex to match <IconName className="xyz" /> or <IconName />
        const tagRegex = new RegExp(`<${lucideName}\\s*([^>]*)/>`, 'g');
        content = content.replace(tagRegex, (match, props) => {
            // Extract className if exists
            let className = '';
            let otherProps = props.replace(/className=['"]([^'"]*)['"]/g, (m, cn) => {
                className = cn;
                return '';
            });
            // Construct new i tag
            return `<i className={\`fi ${fiName} flex items-center justify-center \${"${className}"}\`} ${otherProps}></i>`;
        });
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Processed:', filePath);
}

walkDir('./src', processFile);
