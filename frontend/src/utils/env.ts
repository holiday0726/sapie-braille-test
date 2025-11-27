/**
 * 환경에 따라 적절한 API URL을 반환합니다.
 * - 운영 환경 (NODE_ENV=production): 'http://braile-service.sapie.ai:8080' 
 * - 개발 환경 (npm run dev): 'http://localhost:8080'
 * 
 * NEXT_PUBLIC_API_URL 환경 변수가 설정되어 있으면, 그 값을 최우선으로 사용합니다.
 */
export const getApiUrl = (): string => {
  // 1. 환경 변수가 명시적으로 설정된 경우, 해당 값을 최우선으로 사용
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // // 2. 운영 환경 (NODE_ENV=production 또는 npm run build)
  // if (process.env.NODE_ENV === 'production') {
  //   // Vercel에 배포된 환경 또는 운영 환경
  //   return 'https://braile-service.sapie.ai';
  // }
  // ✅ 수정 후 (이걸로 교체!)
  if (process.env.NODE_ENV === 'production') {
      // http://3.34.113.162 (뒤에 슬래시 없음, s 없음)
      return 'http://13.209.139.144'; 
  }

  // 3. 개발 환경 (npm run dev) 및 기타 모든 경우
  return 'http://localhost:8080';
    //  return 'http://braile-service.sapie.ai:8080';
};
