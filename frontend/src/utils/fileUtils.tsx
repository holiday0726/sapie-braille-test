import React from 'react';

// 파일 타입별 접근성 설명
export const getFileTypeDescription = (fileType: string): string => {
  if (fileType.startsWith('image/')) {
    return '이미지 파일';
  }
  if (fileType.startsWith('audio/')) {
    return '오디오 파일';
  }
  if (fileType.startsWith('video/')) {
    return '비디오 파일';
  }
  if (fileType === 'application/pdf') {
    return 'PDF 문서';
  }
  if (fileType.startsWith('text/')) {
    return '텍스트 파일';
  }
  if (fileType.includes('document') || fileType.includes('word')) {
    return '워드 문서';
  }
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
    return '엑셀 파일';
  }
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
    return '파워포인트 파일';
  }
  return '일반 파일';
};

export const getFileIcon = (fileType: string, fileName?: string): React.ReactElement => {
  const description = getFileTypeDescription(fileType);
  const fileLabel = fileName ? `${description}: ${fileName}` : description;
  
  if (fileType.startsWith('image/')) {
    return (
      <svg 
        className="w-4 h-4" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        role="img"
        aria-label={fileLabel}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (fileType.startsWith('audio/')) {
    return (
      <svg 
        className="w-4 h-4" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        role="img"
        aria-label={fileLabel}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
    );
  }
  if (fileType === 'application/pdf' || fileType.startsWith('text/')) {
    return (
      <svg 
        className="w-4 h-4" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        role="img"
        aria-label={fileLabel}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  return (
    <svg 
      className="w-4 h-4" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      role="img"
      aria-label={fileLabel}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 4 0 108.486 8.486L20.5 13" />
    </svg>
  );
};

// 접근성을 위한 파일 아이콘 (전용)
export const getAccessibleFileIcon = (fileType: string, fileName: string): React.ReactElement => {
  return getFileIcon(fileType, fileName);
};

export const getDifyFileType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  
  const docMimeTypes = [
    'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'application/vnd.ms-powerpoint', // ppt
    'text/html', 'application/xml', 'application/epub+zip', 'message/rfc822'
  ];
  if (docMimeTypes.includes(mimeType)) return 'document';

  return 'custom';
};