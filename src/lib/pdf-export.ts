
import { toJpeg } from 'html-to-image';
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

        // html-to-image handles modern CSS (like lab/oklch) better than html2canvas
        const imgData = await toJpeg(slide, {
            quality: 0.95,
            width: 1080,
            height: 1350,
            pixelRatio: 2 // 2x for retina quality
        });

        if (i > 0) pdf.addPage([1080, 1350]);
        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
    }

    pdf.save(`${data.slides[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
}

export async function generatePDFFromContainer(
    containerId: string,
    filename: string
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

    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i] as HTMLElement;

        const imgData = await toJpeg(slide, {
            quality: 0.95,
            width: 1080,
            height: 1350,
            pixelRatio: 2
        });

        if (i > 0) pdf.addPage([1080, 1350]);
        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
    }

    pdf.save(`${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
}
