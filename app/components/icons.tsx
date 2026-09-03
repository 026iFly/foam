import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
};

export const IconBolt = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>;
export const IconDroplet = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></svg>;
export const IconVolume = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M4 10v4h3l4 4V6L7 10H4z" /><path d="M15 9a4 4 0 0 1 0 6" /><path d="M17.5 6.5a8 8 0 0 1 0 11" /></svg>;
export const IconLeaf = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14z" /><path d="M5 19c4-4 7-7 10-10" /></svg>;
export const IconShield = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></svg>;
export const IconShieldCheck = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>;
export const IconCheck = (p: SVGProps<SVGSVGElement>) => <svg {...base} strokeWidth={2} {...p}><path d="M5 12l4 4L19 6" /></svg>;
export const IconArrowRight = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const IconPhone = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>;
