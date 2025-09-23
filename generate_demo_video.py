#!/usr/bin/env python3
"""
SAPIE Braille 프로젝트 시연 영상 생성을 위한 Gemini Veo3 호출 코드
실제 실행하지 말고 참고용으로만 사용
"""

import google.generativeai as genai
import time
import os
import requests
import mimetypes
from datetime import datetime


class SAPIEVideoGenerator:
    def __init__(self, api_key=None):
        """
        SAPIE Braille 시연 영상 생성기 초기화
        """
        effective_api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not effective_api_key:
            raise ValueError("Google API 키가 설정되지 않았습니다. 생성자에 전달하거나 GOOGLE_API_KEY 환경 변수를 설정해주세요.")

        genai.configure(api_key=effective_api_key)
        self.output_directory = "demo_videos"
        self._create_output_directory()
    
    def _create_output_directory(self):
        """출력 디렉토리 생성"""
        if not os.path.exists(self.output_directory):
            os.makedirs(self.output_directory)
    
    def generate_intro_video(self):
        """
        오프닝 영상 생성 (0:00 - 0:20)
        """
        prompt = """
        Professional technology introduction video with modern UI design.
        Show Sapie Braille logo animation with clean typography.
        Dark theme with accessibility-focused blue and white colors.
        Smooth transitions, corporate style, 2K quality.
        Text overlay: "Sapie Braille - AI-Powered Accessibility Platform"
        Duration: 20 seconds, cinematic camera movement.
        """
        
        return self._generate_video("intro", prompt, description="오프닝 영상")
    
    def generate_voice_to_text_demo(self):
        """
        음성 → 텍스트 변환 시연 영상 (0:20 - 0:50)
        """
        prompt = """
        Screen recording style video showing web interface interaction.
        Modern accessible web UI with large buttons and high contrast design.
        Show cursor pressing spacebar, microphone icon activating with pulse animation.
        Display waveform visualization during speech input.
        Korean text "오늘 날씨가 어때?" appearing in real-time as transcription.
        Terminal windows showing STT service logs scrolling in background.
        Clean, professional demo style with smooth UI animations.
        Duration: 30 seconds, focus on user interaction flow.
        """
        
        return self._generate_video("voice_to_text", prompt, description="음성→텍스트 시연")
    
    def generate_document_processing_demo(self):
        """
        문서/이미지 처리 시연 영상 (0:50 - 1:20)
        """
        prompt = """
        Screen capture showing drag-and-drop file upload interface.
        PDF document being dragged into upload area with smooth animation.
        Progress indicators and service communication visualization.
        Multiple terminal windows showing microservices: Asset Service (8004), Parser Service (8000).
        Real-time text extraction display with typewriter effect.
        Follow up with image upload showing OCR processing.
        Clean technical demo with network activity visualization.
        Duration: 30 seconds, professional software demonstration style.
        """
        
        return self._generate_video("document_processing", prompt, description="문서처리 시연")
    
    def generate_text_to_speech_demo(self):
        """
        텍스트 → 음성 변환 시연 영상 (1:20 - 1:45)
        """
        prompt = """
        Web interface showing text editor with Korean text.
        TTS control panel with play button and speed slider.
        Audio waveform visualization during speech synthesis.
        Terminal showing TTS Service (8003) processing logs.
        Visual indicators for natural Korean speech output.
        Speed adjustment demonstration with smooth UI feedback.
        Professional accessibility software demo style.
        Duration: 25 seconds, focus on audio processing workflow.
        """
        
        return self._generate_video("text_to_speech", prompt, description="텍스트→음성 시연")
    
    def generate_accessibility_features_demo(self):
        """
        접근성 기능 하이라이트 영상 (1:45 - 2:10)
        """
        prompt = """
        Demonstration of web accessibility features in action.
        Show keyboard navigation with visible focus indicators moving through UI.
        High contrast mode toggle with immediate visual changes.
        Text size adjustment with smooth scaling animation.
        Screen reader compatibility indicators and ARIA labels.
        Keyboard-only interaction flow without mouse usage.
        Clean educational demo highlighting accessibility compliance.
        Duration: 25 seconds, focus on inclusive design features.
        """
        
        return self._generate_video("accessibility_features", prompt, description="접근성 기능 시연")
    
    def generate_microservices_monitoring_demo(self):
        """
        마이크로서비스 아키텍처 모니터링 영상 (2:10 - 2:40)
        """
        prompt = """
        Technical architecture visualization with real-time monitoring.
        System architecture diagram with 6 interconnected services.
        API Gateway (8080) routing visualization with data flow animation.
        Multiple terminal windows showing service health checks and logs.
        Docker containers status display with green health indicators.
        MongoDB and S3 connection status visualization.
        Network communication flows between services with animated data packets.
        Professional technical monitoring dashboard style.
        Duration: 30 seconds, emphasis on system reliability and communication.
        """
        
        return self._generate_video("microservices_monitoring", prompt, description="마이크로서비스 모니터링")
    
    def generate_closing_video(self):
        """
        마무리 영상 (2:40 - 3:00)
        """
        prompt = """
        Professional project summary with technology stack showcase.
        Clean animation showing system overview and key components.
        Tech stack logos arranged elegantly: Next.js, FastAPI, OpenAI, MongoDB, AWS.
        Text overlay showing key achievements and social impact.
        GitHub repository link and contact information display.
        Modern corporate closing with SAPIE Braille branding.
        Inspirational tone emphasizing digital accessibility innovation.
        Duration: 20 seconds, professional project conclusion style.
        """
        
        return self._generate_video("closing", prompt, description="마무리 영상")
    
    def _generate_video(self, segment_name, prompt, description=""):
        """
        개별 영상 세그먼트 생성
        
        Args:
            segment_name (str): 세그먼트 이름
            prompt (str): Veo3에 전달할 프롬프트
            description (str): 세그먼트 설명
        
        Returns:
            str: 생성된 비디오 파일 경로 (실제로는 실행되지 않음)
        """
        print(f"\n🎬 {description} 생성 시작...")
        print(f"프롬프트: {prompt[:100]}...")
        
        try:
            video_generation_result = genai.generate_video(
                model="models/veo",
                prompt=prompt,
                quality="HIGH",  # 고품질 설정
                duration_secs=30,  # 세그먼트별 길이 조정
            )
            
            print(f"✅ {description} 생성 요청 전송 완료")
            
            # 작업 완료 대기
            while not video_generation_result.done():
                print("⏳ 생성 중... 15초 후 재확인")
                time.sleep(15)
            
            # 결과 다운로드
            generated_videos = video_generation_result.result()
            
            for i, video in enumerate(generated_videos):
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{segment_name}_{timestamp}.mp4"
                file_path = os.path.join(self.output_directory, filename)
                
                response = requests.get(video.uri)
                if response.status_code == 200:
                    with open(file_path, "wb") as f:
                        f.write(response.content)
                    print(f"💾 저장 완료: {file_path}")
                    return file_path
                else:
                    print(f"❌ 다운로드 실패: {response.status_code}")
                    return None
                    
        except Exception as e:
            print(f"❌ 오류 발생: {e}")
            return None
    
    def generate_full_demo_sequence(self):
        """
        전체 시연 영상 시퀀스 생성
        """
        print("🚀 SAPIE Braille 시연 영상 생성 시작")
        print("=" * 60)
        
        segments = [
            ("intro", self.generate_intro_video),
            # ("voice_to_text", self.generate_voice_to_text_demo),
            # ("document_processing", self.generate_document_processing_demo),
            # ("text_to_speech", self.generate_text_to_speech_demo),
            # ("accessibility", self.generate_accessibility_features_demo),
            # ("monitoring", self.generate_microservices_monitoring_demo),
            # ("closing", self.generate_closing_video),
        ]
        
        generated_files = {}
        
        for segment_name, generator_func in segments:
            result = generator_func()
            generated_files[segment_name] = result
            time.sleep(2)  # API 제한 고려한 딜레이
        
        print("\n✅ 모든 세그먼트 생성 완료!")
        print("📁 생성된 파일 목록:")
        for segment, file_path in generated_files.items():
            print(f"  - {segment}: {file_path}")
        
        print(f"\n📂 모든 파일이 '{self.output_directory}' 폴더에 저장되었습니다.")
        print("🎞️  이제 동영상 편집 소프트웨어로 세그먼트들을 연결하여 최종 시연 영상을 완성하세요!")
        
        return generated_files


def main():
    """
    메인 실행 함수 - Gemini Veo3 API를 호출하여 실제 영상을 생성합니다.
    """
    print("🚀 SAPIE Braille 시연 영상 생성을 시작합니다.")
    print("📖 Gemini Veo3 API를 호출하여 실제 영상을 생성합니다.")
    print("⚠️  API 호출 비용이 발생할 수 있습니다.")

    import traceback

    try:
        # GOOGLE_API_KEY 환경 변수에 API 키를 설정해야 합니다.
        # 또는, generator = SAPIEVideoGenerator(api_key="YOUR_GOOGLE_API_KEY")와 같이 직접 키를 전달할 수 있습니다.
        generator = SAPIEVideoGenerator()
        
        # 시연 영상 시퀀스 생성 (현재는 오프닝만 생성하도록 설정됨)
        generated_files = generator.generate_full_demo_sequence()
        
        if generated_files and generated_files.get("intro"):
            print("\n🎉 SAPIE Braille 오프닝 영상 생성 완료!")
        else:
            print("\n⚠️ 영상 생성에 실패했습니다.")

    except ValueError as ve:
        print(f"❌ 설정 오류: {ve}")
        print("🔧 GOOGLE_API_KEY 환경 변수가 올바르게 설정되었는지 확인해주세요.")
    except Exception as e:
        print(f"❌ 실행 중 예상치 못한 오류 발생: {e}")
        traceback.print_exc()
        print("🔧 API 키 설정과 네트워크 연결을 확인해주세요.")


if __name__ == "__main__":
    main()