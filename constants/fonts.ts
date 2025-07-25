export interface FontStyle {
  id: string;
  name: string;
  fontFamily: string;
  displayName: string;
  sample: string;
}

export interface TextStyle {
  fontId: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  opacity: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
}

export const AVAILABLE_FONTS: FontStyle[] = [
  {
    id: 'system',
    name: 'System Default',
    fontFamily: 'System',
    displayName: '시스템 기본',
    sample: '아름다운 시와 함께'
  },
  {
    id: 'serif',
    name: 'Serif',
    fontFamily: 'Georgia',
    displayName: '세리프',
    sample: '아름다운 시와 함께'
  },
  {
    id: 'sans-serif',
    name: 'Sans Serif',
    fontFamily: 'Helvetica',
    displayName: '산세리프',
    sample: '아름다운 시와 함께'
  },
  {
    id: 'monospace',
    name: 'Monospace',
    fontFamily: 'Courier',
    displayName: '고정폭',
    sample: '아름다운 시와 함께'
  },
  {
    id: 'cursive',
    name: 'Cursive',
    fontFamily: 'Snell Roundhand',
    displayName: '필기체',
    sample: '아름다운 시와 함께'
  }
];

export const FONT_SIZES = [
  { value: 12, label: '아주 작게' },
  { value: 14, label: '작게' },
  { value: 16, label: '보통' },
  { value: 18, label: '크게' },
  { value: 20, label: '아주 크게' },
  { value: 24, label: '특대' }
];

export const COLOR_PRESETS = [
  { id: 'black', name: '검정', value: '#000000' },
  { id: 'white', name: '흰색', value: '#FFFFFF' },
  { id: 'gray', name: '회색', value: '#666666' },
  { id: 'red', name: '빨강', value: '#FF0000' },
  { id: 'blue', name: '파랑', value: '#0066CC' },
  { id: 'green', name: '초록', value: '#00AA00' },
  { id: 'purple', name: '보라', value: '#9933CC' },
  { id: 'orange', name: '주황', value: '#FF9900' },
  { id: 'pink', name: '분홍', value: '#FF6699' },
  { id: 'brown', name: '갈색', value: '#996633' }
];

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontId: 'system',
  fontSize: 18,
  color: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  opacity: 1,
  lineHeight: 1.5,
  letterSpacing: 0,
  textAlign: 'center',
  fontWeight: 'normal'
};