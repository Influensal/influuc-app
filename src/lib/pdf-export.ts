
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CarouselData } from '@/components/carousels/types';

// We need to render the slides, capture them, then add to PDF.
export async function generatePDF(
    data: CarouselData,
    containerId: string // The ID of the container holding all the rendered slides
) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Preview container not found');

    const slides = container.children;
    if (!slides || slides.length === 0) throw new Error('No slides found to export');

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [1080, 1350]
    });

    // Loop through each child (slide) of the hidden container
    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i] as HTMLElement;

        // Temporarily ensure the slide is visible/rendered correctly for capture
        // Even if in a hidden container, style might need adjustment

        const canvas = await html2canvas(slide, {
            scale: 2, // 2x for retina quality
            useCORS: true, // For images
            logging: false,
            width: 1080,
            height: 1350
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) pdf.addPage([1080, 1350]);
        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
    }

    pdf.save(`${data.slides[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
}
