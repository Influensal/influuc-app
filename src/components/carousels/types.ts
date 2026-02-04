
export interface Slide {
    id: string; // Unique ID for drag/drop
    type: 'cover' | 'content' | 'cta' | 'intro';
    title: string;
    subtitle?: string;
    body?: string; // Main paragraph
    visualCue?: string; // Helper for user to know what image/icon to add (if we add image support later)
    image_url?: string; // Optional image
}

export interface CarouselData {
    slides: Slide[];
    theme: 'swiss' | 'luxury' | 'noir';
    settings: {
        showPersonalBranding: boolean;
        showPageNumbers: boolean;
    };
    author?: {
        name: string;
        handle: string;
        image?: string;
    };
}

export type CarouselTemplateProps = {
    data: CarouselData;
    slide: Slide;
    index: number;
    total: number;
    scale?: number; // For preview zooming
};
